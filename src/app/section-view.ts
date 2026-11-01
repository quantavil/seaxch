/** A page's own view: header, Picks/Everything switch, scoped filter, jump strip + rail, and the folding section cards. */
import { GROUP_OF, monogram } from "../shared/groups";
import { fmtCount as fmt } from "../shared/pages";
import { F_STAR, type PageData } from "../shared/types";
import { countOf, starCount } from "./catalog";
import { $, el } from "./dom";
import { entryRow } from "./model";
import { catHue, rowEl } from "./render";
import { groupSvg, searchSvg } from "../shared/svg";
import { prefs } from "./store";

type RowItem = { el: HTMLElement; text: string };
type SubGroup = { subLi: HTMLElement; subText: string; rows: RowItem[] };
type SecData = {
  sec: HTMLElement;
  name: string;
  countEl: HTMLElement;
  toggleEl: HTMLElement;
  /** every <li> in the list, in order: rows and sub-headers, for the fold */
  items: HTMLElement[];
  origCount: number;
  /** user asked for the whole section (remembered for the visit) */
  expanded: boolean;
  /** a filter is running: fold is suspended so hits are never hidden */
  forced: boolean;
  direct: RowItem[];
  subs: SubGroup[];
};

/** Rows kept visible in a collapsed section. A 380-link category is ~47 screens of
 *  scrolling on a phone; this folds it to ~10 while every section stays reachable. */
const COLLAPSE_N = 12;

/** Sections the reader opened themselves — they stay open for the rest of the visit. */
const expandedSecs = new Set<string>();

/** Picks (FMHY-starred) first: the reader chose a topic, not 370 links. Remembered for the visit. */
let picksMode = true;
let sectionObserver: IntersectionObserver | null = null;

const rowText = (e: { 0: string; 2: string }) => `${e[0]} ${e[2]}`.toLowerCase();

// ---------- section cards ----------
function syncSec(sc: SecData): void {
  const open = sc.expanded || sc.forced;
  let seen = 0;
  for (const li of sc.items) {
    const isRow = li.classList.contains("r");
    if (isRow) seen++;
    // a sub-header folds once the cut is reached, so none can survive without rows
    li.classList.toggle("over", !open && (isRow ? seen > COLLAPSE_N : seen >= COLLAPSE_N));
  }
  sc.sec.classList.toggle("open", open);
  const foldable = sc.origCount > COLLAPSE_N;
  sc.toggleEl.hidden = !foldable || sc.forced;
  if (foldable) {
    sc.toggleEl.textContent = open ? "Show less" : `Show all ${fmt(sc.origCount)}`;
    sc.toggleEl.setAttribute("aria-expanded", String(open));
    sc.toggleEl.setAttribute("aria-label", open ? `Collapse ${sc.name}` : `Show all ${sc.origCount} links`);
  }
  if (!sc.forced) sc.countEl.textContent = fmt(open ? sc.origCount : Math.min(sc.origCount, COLLAPSE_N));
}

function sectionEl(p: PageData, s: PageData["s"][number], idx: number, picks: boolean): SecData | null {
  const keep = (e: { 3: number }) => !(picks || prefs.star) || !!(e[3] & F_STAR);
  const direct = s.e.filter(keep);
  const subs = s.b.map((b) => ({ n: b.n, e: b.e.filter(keep) })).filter((b) => b.e.length);
  const n = direct.length + subs.reduce((m, b) => m + b.e.length, 0);
  if (!n) return null;

  const sec = el("section", "cat-sec");
  sec.id = `sec-${idx}`;
  const count = el("span", "cat-sec-count", fmt(n));
  const left = el("div", "cat-sec-header-left");
  left.append(el("h3", "", s.n), count);
  const hdr = el("div", "cat-sec-header");
  hdr.append(left);

  const toggle = el("button", "cat-sec-toggle");
  toggle.type = "button";
  toggle.hidden = true;

  const ol = el("ol", "list");
  const row = (e: PageData["s"][number]["e"][number], sub: string): RowItem => {
    const item = { el: rowEl(entryRow(e, p, s.n, sub)), text: rowText(e) };
    ol.append(item.el);
    return item;
  };
  const directRows = direct.map((e) => row(e, ""));
  const subGroups = subs.map((b): SubGroup => {
    const subLi = el("li", "sub", b.n);
    ol.append(subLi);
    return { subLi, subText: b.n.toLowerCase(), rows: b.e.map((e) => row(e, b.n)) };
  });

  sec.append(hdr, ol, toggle);
  const data: SecData = {
    sec,
    name: s.n,
    countEl: count,
    toggleEl: toggle,
    items: [...ol.children] as HTMLElement[],
    origCount: n,
    expanded: expandedSecs.has(sec.id),
    forced: false,
    direct: directRows,
    subs: subGroups,
  };
  toggle.addEventListener("click", () => {
    data.expanded = !data.expanded;
    if (data.expanded) expandedSecs.add(sec.id);
    else expandedSecs.delete(sec.id);
    syncSec(data);
    // the button sits at the end of a long card: pull the card back into view when it folds
    if (!data.expanded && sec.getBoundingClientRect().top < 0) sec.scrollIntoView({ block: "start" });
  });
  syncSec(data);
  return data;
}

function setHidden(node: HTMLElement, hidden: boolean): void {
  if (node.hidden !== hidden) node.hidden = hidden;
}

function filterSections(secs: SecData[], text: string): void {
  const terms = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const all = (hay: string) => terms.every((t) => hay.includes(t));
  for (const sc of secs) {
    // a filter must never leave a hit hidden behind the fold
    if (sc.forced !== terms.length > 0) {
      sc.forced = terms.length > 0;
      syncSec(sc);
    }
    let visible = 0;
    for (const r of sc.direct) {
      const match = !terms.length || all(r.text);
      setHidden(r.el, !match);
      if (match) visible++;
    }
    for (const sub of sc.subs) {
      let subVis = 0;
      const subMatch = terms.length > 0 && all(sub.subText);
      for (const r of sub.rows) {
        const match = !terms.length || subMatch || all(r.text);
        setHidden(r.el, !match);
        if (match) {
          visible++;
          subVis++;
        }
      }
      setHidden(sub.subLi, terms.length > 0 && subVis === 0);
    }
    setHidden(sc.sec, visible === 0);
    // while folded, syncSec owns the badge (it shows how many are actually visible)
    if (terms.length) {
      const txt = fmt(visible);
      if (sc.countEl.textContent !== txt) sc.countEl.textContent = txt;
    }
  }
}

// ---------- header ----------
function monoEl(p: PageData): HTMLElement {
  const mono = el("span", "mono");
  mono.setAttribute("aria-hidden", "true");
  const grp = GROUP_OF[p.k];
  if (grp) mono.innerHTML = groupSvg(grp.k, 26);
  else mono.textContent = monogram(p.n);
  return mono;
}

function picksSwitch(shown: boolean, picks: boolean, onPick: (picks: boolean) => void): HTMLElement {
  const seg = el("div", "seg");
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", "Which links to show");
  seg.hidden = !shown;
  for (const [label, on, val] of [["Picks", picks, true], ["Everything", !picks, false]] as const) {
    const b = el("button", "", label);
    b.type = "button";
    b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", () => {
      if (picksMode !== val) onPick(val);
    });
    seg.append(b);
  }
  return seg;
}

/** The scoped filter box in the header; `run` gets the text (debounced while typing, at once on clear). */
function filterBox(name: string, run: (text: string) => void): { box: HTMLElement; input: HTMLInputElement } {
  const box = el("div", "cat-search-box");
  const input = el("input");
  input.type = "search";
  input.id = "cat-q";
  input.placeholder = `Filter ${name}…`;
  input.setAttribute("aria-label", `Filter in ${name}`);
  input.autocomplete = "off";
  input.autocapitalize = "off";
  input.spellcheck = false;
  const clear = el("button", "", "×");
  clear.type = "button";
  clear.id = "cat-clr";
  clear.setAttribute("aria-label", "Clear filter");
  clear.hidden = true;

  let timer = 0;
  let raf = 0;
  const apply = (text: string, now: boolean) => {
    clear.hidden = !text;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    if (now) run(text);
    else timer = window.setTimeout(() => (raf = requestAnimationFrame(() => run(text))), 30);
  };
  const reset = () => {
    input.value = "";
    apply("", true);
  };
  clear.addEventListener("click", () => {
    reset();
    input.focus();
  });
  input.addEventListener("input", () => apply(input.value, false));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") reset();
  });

  const icon = el("span");
  icon.innerHTML = searchSvg(18);
  icon.firstElementChild!.setAttribute("aria-hidden", "true");
  box.append(icon.firstElementChild!, input, clear);
  return { box, input };
}

// ---------- jump strip (phones) and rail (desktop) ----------
const jump = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

function sectionNav(p: PageData, secs: SecData[]): { strip: HTMLElement; rail: HTMLElement; markActive: (id: string) => void } {
  const item = (cls: string, d: SecData, countTag: "i", countCls = "") => {
    const b = el("button", cls);
    b.type = "button";
    b.append(el("span", "", d.name), el(countTag, countCls, fmt(d.origCount)));
    b.addEventListener("click", () => jump(d.sec.id));
    return b;
  };

  const strip = el("nav", "sec-chips");
  strip.setAttribute("aria-label", `Sections in ${p.n}`);
  strip.hidden = secs.length < 2;
  const chips = secs.map((d) => item("sec-chip", d, "i", "chip-count"));
  strip.append(...chips);

  const rail = el("aside", "cat-rail");
  rail.setAttribute("aria-label", "Category sections");
  const nav = el("nav", "cat-rail-nav");
  const railItems = secs.map((d, i) => {
    const b = item(`cat-rail-item${i === 0 ? " active" : ""}`, d, "i");
    b.dataset.target = d.sec.id;
    return b;
  });
  nav.append(...railItems);
  rail.append(el("div", "cat-rail-title", "Sections"), nav);

  const markActive = (id: string) => {
    for (const it of railItems) it.classList.toggle("active", it.dataset.target === id);
    chips.forEach((c, i) => {
      const on = secs[i]?.sec.id === id;
      c.classList.toggle("active", on);
      // keep the active chip visible in the horizontal strip. Scroll the strip
      // itself, never scrollIntoView — that would also scroll the page.
      if (on) strip.scrollTo({ left: Math.max(0, c.offsetLeft - (strip.clientWidth - c.offsetWidth) / 2), behavior: "smooth" });
    });
  };
  return { strip, rail, markActive };
}

export function showView(p: PageData, keepScroll = false): void {
  const nPicks = starCount(p);
  const picks = picksMode && nPicks > 0;
  const grp = GROUP_OF[p.k];

  let sections: SecData[] = [];
  const { box, input } = filterBox(p.n, (text) => filterSections(sections, text));

  const hero = el("div", "cat-head");
  hero.style.setProperty("--h", String(catHue(p.k)));
  const title = el("div", "m");
  title.append(
    el("h2", "", p.n),
    el("p", "cat-sub", [grp?.n, nPicks ? `${fmt(nPicks)} picks of ${fmt(countOf(p))} links` : `${fmt(countOf(p))} links`].filter(Boolean).join(" · ")),
  );
  hero.append(
    monoEl(p),
    title,
    picksSwitch(nPicks > 0, picks, (val) => {
      picksMode = val;
      showView(p, true);
    }),
    box,
  );

  const content = el("div", "cat-content");
  sections = p.s.map((s, idx) => sectionEl(p, s, idx, picks)).filter((x): x is SecData => !!x);
  content.append(...sections.map((d) => d.sec));

  const { strip, rail, markActive } = sectionNav(p, sections);
  const layout = el("div", "cat-layout");
  layout.append(rail, content);

  sectionObserver?.disconnect();
  sectionObserver = null;
  if ("IntersectionObserver" in window) {
    sectionObserver = new IntersectionObserver(
      (entries) => {
        if (input.value.trim()) return;
        for (const ent of entries) if (ent.isIntersecting) markActive(ent.target.id);
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );
    for (const d of sections) sectionObserver.observe(d.sec);
  }

  $("view").replaceChildren(hero, strip, layout);
  if (!keepScroll) scrollTo(0, 0);

  const target = location.hash.match(/\?sec=(sec-\d+)/);
  if (target) jump(target[1]!);
}
