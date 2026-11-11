/*
 * Critical path (target <= 6 KB gzip): preferences, pins, wiring. Everything heavy (dataset, uFuzzy, search UI,
 * category views, updater) lives in ./core and is loaded after first paint or on first interaction.
 * Never import svg.ts or groups.ts from here: they would pull every icon into this bundle.
 */
import { engineOf, engineUrl } from "../shared/engines";
import { syncDock } from "./dock";
import { $, applyTheme, el, emit, on } from "./dom";
import { anchor, bareHost, openUrl } from "./nav";
import { bump, renderPins, togglePin } from "./pins";
import { plate } from "./plate";
import { addRecent, clearRecents, prefs, save } from "./store";
import { showToast } from "./toast";

const q = $<HTMLInputElement>("q");
const pins = $("pins");

applyTheme(prefs.theme);
renderPins(pins);
syncDock();

const ago = (t: number): string => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

/** "Lately": main links opened from anywhere. Rendered here so it paints without the dataset. */
function renderRecents() {
  const box = $("recents-list");
  box.textContent = "";
  $("recents-sec").hidden = !prefs.recents.length;
  for (const [u, n, h, t] of prefs.recents.slice(0, 6)) {
    const a = anchor(u, "lrow");
    const text = el("span", "lt");
    text.append(el("b", "", n), el("small", "", t ? `${h} · ${ago(t)}` : h));
    a.append(plate(u, n), text);
    box.append(a);
  }
}
renderRecents();
on("recents", renderRecents);
on("pins", () => renderPins(pins));
$("clr-recents").addEventListener("click", clearRecents);

pins.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const rm = t.closest<HTMLElement>(".rm");
  if (rm) {
    e.preventDefault();
    const u = rm.dataset.u!;
    const n = prefs.pins.find((x) => x[0] === u)?.[1] ?? "";
    const flip = () => {
      togglePin(u, n);
      renderPins(pins);
      emit("pins");
    };
    flip();
    showToast(`Unpinned ${n || "link"}`, flip);
    return;
  }
  if (t.closest(".add")) {
    void import("./bookmark").then((m) => m.openBookmarkDialog(() => { renderPins(pins); emit("pins"); }));
    return;
  }
  if (pins.classList.contains("edit")) e.preventDefault();
});

// a shelf tile opened by click or middle click counts as a visit
const visit = (e: Event) => {
  const t = e.target as HTMLElement;
  const a = t.closest<HTMLAnchorElement>("a.pin");
  if (!a || t.closest(".rm") || (e.type === "click" && pins.classList.contains("edit"))) return;
  bump(a.dataset.u!);
  addRecent(a.href, a.querySelector(".lb")?.textContent || "", bareHost(a));
};
pins.addEventListener("click", visit);
pins.addEventListener("auxclick", visit);

for (const id of ["nsfw"] as const) {
  const box = document.getElementById(id) as HTMLInputElement | null;
  if (!box) continue;
  box.checked = prefs[id];
  box.addEventListener("change", () => {
    prefs[id] = box.checked;
    save();
    emit("prefs");
  });
}

const edit = $("edit");
edit.addEventListener("click", () => {
  const editing = pins.classList.toggle("edit");
  edit.setAttribute("aria-pressed", String(editing));
});

let core: Promise<unknown> | undefined;
const loadCore = () => (core ??= import("./core"));
q.addEventListener("focus", loadCore, { once: true });
q.addEventListener("input", loadCore, { once: true });
q.addEventListener("input", () => document.body.classList.toggle("q", !!q.value.trim()));
addEventListener("hashchange", loadCore);
if (location.hash.length > 1) loadCore();

// Alt+1..9 opens that shelf tile (the search box owns bare digits)
addEventListener("keydown", (e: KeyboardEvent) => {
  const m = e.altKey && !e.ctrlKey && !e.metaKey && /^Digit([1-9])$/.exec(e.code);
  const a = m && pins.querySelectorAll<HTMLAnchorElement>("a.pin")[+m[1]! - 1];
  if (!a) return;
  e.preventDefault();
  a.click();
});

$("btn-settings").addEventListener("click", () => void loadCore().then(() => emit("open-settings")));

// Focus search only where keyboard is primary input
if (matchMedia("(hover: hover) and (pointer: fine)").matches) q.focus({ preventScroll: true });

// Web chips (the dock re-renders them when engines are reordered or switched off, so delegate)
$("dock-engines").addEventListener("click", (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLElement>(".dock-chip");
  const engine = chip && engineOf(chip.dataset.engine!);
  if (engine) openUrl(engineUrl(engine, q.value.trim()));
});

addEventListener("load", () => {
  (window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 300)))(() => void loadCore());
  if ("serviceWorker" in navigator) {
    const sw = navigator.serviceWorker;
    // a new build takes over the cache-first worker: reload once so this visit shows it, not the next one
    if (sw.controller) sw.addEventListener("controllerchange", () => location.reload(), { once: true });
    sw.register(__SW__).catch((e) => console.warn("service worker registration failed", e));
  }
});
