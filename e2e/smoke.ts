/**
 * Browser smoke tests: `bun run e2e` (build first: `bun run build --offline`).
 * Serves dist/ itself on a free port unless a base URL is passed; Chromium comes from `bunx playwright install chromium`.
 * Covers layouts and overflow at five sizes, search, keyboard, section view, Back, pins, NSFW opt-in, offline reload and view stability.
 */
import { chromium, type Page } from "playwright";

const arg = process.argv[2];
const port = 8190 + Math.floor(Math.random() * 500);
const server = arg ? null : Bun.spawn(["bun", "scripts/serve.ts", String(port)], { stdout: "ignore", stderr: "ignore" });
const BASE = arg ?? `http://localhost:${port}/`;
if (server) for (let i = 0; i < 50 && !(await fetch(BASE).then((r) => r.ok, () => false)); i++) await Bun.sleep(100);

let fails = 0;
function check(name: string, ok: boolean, extra: unknown = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : `  [${JSON.stringify(extra)}]`}`);
  if (!ok) fails++;
}
const noOverflow = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const SIZES = [
  ["mobile", 360, 800, true],
  ["tablet-p", 768, 1024, true],
  ["tablet-l", 1024, 768, true],
  ["laptop", 1366, 768, false],
  ["desktop", 1920, 1080, false],
] as const;

const browser = await chromium.launch();
try {
  // ---------- layouts + overflow ----------
  for (const [name, w, h, touch] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    const pg = await ctx.newPage();
    const errs: string[] = [];
    pg.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.text()); });
    pg.on("pageerror", (e) => errs.push(String(e)));
    await pg.goto(BASE);
    await pg.waitForSelector("#cats .dir");
    await pg.waitForTimeout(800);
    check(`${name}: layout viewport is the device width`, (await pg.evaluate(() => innerWidth)) === w);
    check(`${name}: no horizontal overflow`, await noOverflow(pg));
    check(`${name}: no console errors/warnings`, errs.length === 0, errs);
    const focused = await pg.evaluate(() => document.activeElement?.id);
    check(`${name}: search autofocus only with a mouse`, (focused === "q") === !touch, focused);
    const box = (await pg.locator(".bar").boundingBox())!;
    if (w < 640) {
      check(`${name}: search bar docked at the bottom`, box.y + box.height > h - 8, box);
      const cols = await pg.evaluate(() => +getComputedStyle(document.querySelector(".dirs")!).columnCount);
      check(`${name}: browse groups are 1 column`, cols === 1, cols);
    } else {
      check(`${name}: search bar sits in the header`, box.y < 260, box);
      if (w >= 1100) check(`${name}: search bar is centred`, Math.abs(box.x + box.width / 2 - w / 2) < 3, box);
    }
    check(`${name}: directory rows are tap-sized`, (await pg.locator(".dir").first().boundingBox())!.height >= 43.5);
    await pg.locator("#q").click();
    await pg.keyboard.type("anime", { delay: 15 });
    await pg.waitForTimeout(400);
    check(`${name}: results shown`, (await pg.locator("#list li").count()) > 5);
    if (w < 640) {
      const after = (await pg.locator(".bar").boundingBox())!;
      check(`${name}: bar stays docked while searching`, Math.abs(after.y + after.height - (box.y + box.height)) < 8, after);
    }
    check(`${name}: no overflow with results`, await noOverflow(pg));
    await ctx.close();
  }

  // ---------- behaviour (desktop) ----------
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const pg = await ctx.newPage();
  // window.open is recorded, never performed: the test must not navigate to a real search engine
  await pg.addInitScript(() => {
    (window as any).__opened = [];
    window.open = ((u: string) => ((window as any).__opened.push(String(u)), null)) as typeof window.open;
  });
  const opened = () => pg.evaluate(() => (window as any).__opened as string[]);
  await pg.goto(BASE);
  await pg.waitForSelector("#cats .dir");
  await pg.waitForTimeout(800);
  check("dock: Google is the first chip", (await pg.locator(".dock-chip").first().getAttribute("data-key")) === "g");

  await pg.fill("#q", "libgen");
  await pg.waitForTimeout(300);
  check("search: Library Genesis found", /libgen|library genesis/i.test(await pg.innerText("#list")));
  const ring = await pg.evaluate(() => {
    const r = document.querySelector<HTMLElement>("#list>.r")!;
    const l = r.parentElement!;
    return [getComputedStyle(r).borderTopLeftRadius, getComputedStyle(l).borderTopLeftRadius];
  });
  check("search: first row follows the card's rounded corner (selection ring is not clipped square)", parseFloat(ring[0]!) > 0, ring);
  // Enter searches the web with the first engine; nothing is pre-selected, no "Top hit"
  check("search: no row is pre-selected", (await pg.locator("#list .r.on").count()) === 0 && (await pg.locator(".tag", { hasText: "Top hit" }).count()) === 0);
  check("search: the status line says what Enter does", /Enter searches Google/.test(await pg.innerText("#st")));
  await pg.keyboard.press("Enter");
  check("search: Enter on typed text searches Google", (await opened()).at(-1) === "https://www.google.com/search?q=libgen", await opened());
  check("search: an external query is never recorded in Lately", !(await pg.evaluate(() => localStorage.getItem("fh1") ?? "")).includes("google.com"));
  await pg.click("#q");
  await pg.keyboard.press("ArrowDown");
  check("search: ArrowDown selects the first hit", (await pg.locator("#list .r.on").count()) === 1);
  const hitUrl = await pg.locator("#list .r.on a.n").getAttribute("href");
  await pg.keyboard.press("Enter");
  check("search: Enter on a selected hit opens it", (await opened()).at(-1) === hitUrl, await opened());
  await pg.keyboard.press("ArrowUp");
  check("search: ArrowUp from the first hit returns to the typed text", (await pg.locator("#list .r.on").count()) === 0);
  await pg.fill("#q", "zzqxjw");
  await pg.waitForTimeout(300);
  check("search: no match leaves no list (the chips and Enter are the way out)", (await pg.locator("#list>li").count()) === 0 && /Nothing matches/.test(await pg.innerText("#st")));
  await pg.fill("#q", "libgen");
  await pg.waitForTimeout(300);
  await pg.keyboard.press("Escape");
  await pg.waitForTimeout(200);
  check("Escape clears the query and returns home", (await pg.inputValue("#q")) === "" && (await pg.isVisible("#home")));

  // section view, in-header Back, scroll memory
  await pg.evaluate(() => scrollTo(0, 120));
  await pg.click("#t-ai");
  await pg.waitForSelector("#view h2");
  check("section: hash routing", (await pg.evaluate(() => location.hash)) === "#ai" && /Artificial/.test(await pg.innerText("#view h2")));
  check("section: rows listed", (await pg.locator("#view .r").count()) > 3);
  check("section: icon-only Back button is visible", await pg.isVisible("#hdr-back"));
  check("section: Back has no text", ((await pg.innerText("#hdr-back")).trim()) === "");
  await pg.click("#hdr-back");
  await pg.waitForTimeout(300);
  check("section: Back returns home", (await pg.isVisible("#home")) && !(await pg.isVisible("#hdr-back")));
  check("section: home scroll position is restored", Math.abs((await pg.evaluate(() => scrollY)) - 120) < 4, await pg.evaluate(() => scrollY));

  // pinning
  await pg.fill("#q", "ublock origin");
  await pg.waitForTimeout(300);
  await pg.locator("#list .pb").first().click();
  await pg.fill("#q", "");
  await pg.waitForTimeout(200);
  check("pin: appears on home immediately", (await pg.locator("#pins a.pin").count()) === 1);
  await pg.reload();
  await pg.waitForSelector("#pins a.pin");
  check("pin: survives reload", /^ublock/i.test(await pg.locator("#pins a.pin .lb").first().innerText()));
  await pg.locator("#pins a.pin").first().evaluate((a) => a.addEventListener("click", (e) => e.preventDefault()));
  await pg.locator("#pins a.pin").first().click();
  const prefs = JSON.parse((await pg.evaluate(() => localStorage.getItem("fh1")))!);
  check("pin: click count is tracked", prefs.pins[0][2] === 1, prefs.pins);
  await pg.click("#edit");
  await pg.locator("#pins .rm").first().click();
  check("pin: removable in edit mode (falls back to starter picks)", (await pg.locator("#pins .rm").count()) === 0 && (await pg.isHidden("#edit")));

  // NSFW: always listed, off until one tap
  const nsfw = pg.locator("#t-nsfw");
  check("nsfw: row is visible in Browse everything while off", (await nsfw.isVisible()) && /Off/.test(await nsfw.innerText()));
  check("nsfw: off row leaks no adult site names", !/HQPorner/i.test(await nsfw.innerText()));
  await pg.fill("#q", "hqporner");
  await pg.waitForTimeout(300);
  check("nsfw: search finds nothing adult while off", (await pg.locator("#list .r:not(.ext-row)").count()) === 0);
  await pg.fill("#q", "");
  await nsfw.click();
  await pg.waitForSelector("#view h2");
  check("nsfw: one tap turns it on and opens the section", (await pg.evaluate(() => location.hash)) === "#nsfw" && (await pg.locator("#view .r").count()) > 10);
  await pg.goto(BASE);
  await pg.reload();
  await pg.waitForSelector("#cats .dir");
  await pg.waitForTimeout(800);
  check("nsfw: stays on after reload", !/Off/.test(await pg.locator("#t-nsfw").innerText()));
  const grp = await pg.locator("#t-nsfw").evaluate((e) => {
    const s = e.closest(".grp")!.querySelector("small")!;
    return { shown: +(s.textContent ?? "").replace(/[^\d]/g, ""), base: +s.dataset.n! };
  });
  check("nsfw: group header counts the NSFW links", grp.shown > grp.base, JSON.stringify(grp));
  await pg.goto(`${BASE}#settings`);
  await pg.locator('input[aria-label="Show NSFW content"]').uncheck();
  await pg.goto(`${BASE}#`);
  await pg.waitForTimeout(400);
  check("nsfw: turning it off in Settings puts the row back to Off", /Off/.test(await pg.locator("#t-nsfw").innerText()));

  // settings: engines reorder by dragging (no arrow buttons) or with the keys on the grip
  await pg.goto(`${BASE}#settings`);
  await pg.waitForSelector(".engine-sort-item");
  const order = () => pg.$$eval(".engine-sort-item", (rows) => rows.map((r) => (r as HTMLElement).dataset.key));
  const stored = async () => JSON.parse((await pg.evaluate(() => localStorage.getItem("fh1")))!).engines as string[];
  check("settings: no up/down arrow buttons", (await pg.locator(".btn-arrow").count()) === 0);
  check("settings: Google is first", (await order())[0] === "g", await order());
  const grip = (await pg.locator('.engine-sort-item[data-key="g"] .engine-drag-handle').boundingBox())!;
  const target = (await pg.locator('.engine-sort-item[data-key="y"]').boundingBox())!;
  await pg.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await pg.mouse.down();
  await pg.mouse.move(grip.x + 4, grip.y + 20, { steps: 4 });
  await pg.mouse.move(grip.x + 4, target.y + target.height - 6, { steps: 8 });
  await pg.mouse.up();
  check("settings: dragging a row reorders the list", (await order()).slice(0, 2).join() === "y,g", await order());
  check("settings: the order is saved", (await stored()).slice(0, 2).join() === "y,g", await stored());
  check("settings: the dock follows", (await pg.$$eval(".dock-chip", (c) => (c[0] as HTMLElement).dataset.key)) === "y");
  await pg.locator('.engine-sort-item[data-key="g"] .engine-drag-handle').focus();
  await pg.keyboard.press("ArrowUp");
  check("settings: arrow keys on the grip reorder too", (await stored()).slice(0, 2).join() === "g,y", await stored());
  check("settings: the grip keeps focus", await pg.evaluate(() => document.activeElement?.classList.contains("engine-drag-handle")));

  // the dock chips drag too, and a drag never counts as a click (no search opens)
  await pg.goto(`${BASE}#`);
  await pg.fill("#q", "libgen"); // the chips show only while a query is typed
  await pg.waitForSelector(".dock-chip");
  const sent = (await opened()).length;
  const c0 = (await pg.locator(".dock-chip").nth(0).boundingBox())!;
  const c1 = (await pg.locator(".dock-chip").nth(1).boundingBox())!;
  await pg.mouse.move(c0.x + c0.width / 2, c0.y + c0.height / 2);
  await pg.mouse.down();
  await pg.mouse.move(c0.x + c0.width / 2 + 10, c0.y + c0.height / 2, { steps: 3 });
  await pg.mouse.move(c1.x + c1.width - 4, c1.y + c1.height / 2, { steps: 8 });
  await pg.mouse.up();
  check("dock: dragging a chip reorders it and saves", (await stored()).slice(0, 2).join() === "y,g", await stored());
  check("dock: a drag does not open a search", (await opened()).length === sent);
  await pg.locator(".dock-chip").first().click();
  check("dock: a click on a chip opens that engine", (await opened()).at(-1) === "https://yandex.com/search/?text=libgen", await opened());
  await pg.fill("#q", "");
  await pg.goto(`${BASE}#settings`);
  await pg.waitForSelector(".engine-sort-item");
  await pg.locator('.engine-sort-item[data-key="g"] .engine-drag-handle').focus();
  await pg.keyboard.press("ArrowUp");

  // suggestions: opt-in, answered by a stubbed JSONP script (the real endpoints are never contacted)
  await pg.route("https://suggestqueries.google.com/**", (route) => {
    const cb = new URL(route.request().url()).searchParams.get("callback");
    return route.fulfill({ contentType: "text/javascript", body: `${cb}(["libgen",["libgen mirror","libgen proxy"]])` });
  });
  check("suggest: off by default", (await pg.locator('.opt-btn[aria-pressed=true]', { hasText: "Off" }).count()) === 1);
  await pg.locator(".opt-btn", { hasText: "Google" }).click();
  check("suggest: choice is saved", JSON.parse((await pg.evaluate(() => localStorage.getItem("fh1")))!).suggest === "g");
  await pg.goto(`${BASE}#`);
  await pg.fill("#q", "libgen");
  await pg.waitForSelector("#list .sg");
  check("suggest: rows appear above the hits", (await pg.locator("#list .sg").count()) === 2 && /^suggestions/i.test(await pg.locator("#list>li").first().innerText()) && (await pg.locator("#list>li.lbl").count()) === 2);
  await pg.keyboard.press("ArrowDown");
  await pg.keyboard.press("Enter");
  check("suggest: Enter on a suggestion searches it", (await opened()).at(-1) === "https://www.google.com/search?q=libgen%20mirror", await opened());
  await pg.evaluate(() => { const o = JSON.parse(localStorage.getItem("fh1")!); o.suggest = ""; localStorage.setItem("fh1", JSON.stringify(o)); });
  await pg.reload();
  await pg.waitForSelector("#cats .dir");

  // ---------- offline via service worker ----------
  await pg.evaluate(() => navigator.serviceWorker.ready.then(() => 1));
  await pg.waitForTimeout(1500);
  await ctx.setOffline(true);
  await pg.reload();
  await pg.waitForSelector("#cats .dir");
  await pg.fill("#q", "vlc");
  await pg.waitForTimeout(500);
  check("offline: reload and search work from cache", (await pg.locator("#list li").count()) > 0);
  await ctx.setOffline(false);
  await ctx.close();

  // ---------- phone: bar and views stay put ----------
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mp = await mctx.newPage();
  await mp.addInitScript(() => {
    (window as any).__transitions = 0;
    const orig = document.startViewTransition?.bind(document);
    if (orig) document.startViewTransition = (cb?: any) => { (window as any).__transitions++; return orig(cb); };
  });
  await mp.goto(BASE);
  await mp.waitForSelector("#cats .dir");
  const before = (await mp.locator(".bar").boundingBox())!;
  await mp.locator("#q").tap();
  await mp.evaluate(() => {
    (window as any).__rebuilds = 0;
    new MutationObserver(() => (window as any).__rebuilds++).observe(document.getElementById("list")!, { childList: true });
  });
  await mp.keyboard.type("anime", { delay: 10 });
  await mp.waitForSelector("#list .r");
  check("phone: result list is rebuilt at most twice per query", (await mp.evaluate(() => (window as any).__rebuilds)) <= 2);
  const afterBar = (await mp.locator(".bar").boundingBox())!;
  check("phone: bar stays docked to the bottom", Math.abs(afterBar.y + afterBar.height - (before.y + before.height)) < 8, afterBar);
  check("phone: no view transitions", (await mp.evaluate(() => (window as any).__transitions)) === 0);
  await mp.locator("#clr").tap();
  await mp.locator("#t-ai").tap();
  await mp.waitForSelector("#view h2");
  check("phone: section hides the home blocks", !(await mp.locator("#home").isVisible()));
  const back = (await mp.locator("#hdr-back").boundingBox())!;
  check("phone: Back is at least 44px and left of the settings gear", back.width >= 43.5 && back.x < (await mp.locator("#btn-settings").boundingBox())!.x);
  await mctx.close();
} finally {
  await browser.close();
  server?.kill();
}

console.log(`\n${fails} failure(s)`);
process.exit(fails ? 1 : 0);
