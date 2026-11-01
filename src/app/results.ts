/** The result list under the search box: FMHY hits, optional engine suggestions, web-search fallbacks, and Enter. */
import { engineUrl } from "../shared/engines";
import { fmtCount as fmt } from "../shared/pages";
import { getIx } from "./catalog";
import { defaultEngine } from "./dock";
import { $, el } from "./dom";
import { anchor, openUrl } from "./nav";
import { isPinned } from "./pins";
import { rowEl } from "./render";
import { search, type Hit } from "./search";
import { addRecent, prefs } from "./store";
import { fetchSuggestions } from "./suggest";

const q = $<HTMLInputElement>("q");
const st = $("st");
const list = $("list");
const more = $("more");

const PAGE = 50;
const SUGGEST_DELAY_MS = 120;

let limit = PAGE;
export const resetLimit = () => (limit = PAGE);
export const growLimit = () => (limit += 100);

/** Arrow-key selection, by element: suggestions arriving later add rows above without moving it. */
let selected: HTMLElement | null = null;
/** What Enter or a click does for a row (`tab`: Ctrl/Cmd held). */
const actions = new WeakMap<Element, (tab: boolean) => void>();

function select(li: HTMLElement | null): void {
  if (selected) {
    selected.classList.remove("on");
    selected.setAttribute("aria-selected", "false");
  }
  selected = li;
  if (!li) {
    q.removeAttribute("aria-activedescendant");
    return;
  }
  li.classList.add("on");
  li.setAttribute("aria-selected", "true");
  q.setAttribute("aria-activedescendant", li.id);
  li.scrollIntoView({ block: "nearest" });
}

/** Forget the arrow-key selection (the query changed under it, so Enter must not act on a stale row). */
export const clearSelection = () => select(null);

function option<T extends HTMLElement>(li: T, id: string): T {
  li.setAttribute("role", "option");
  li.id = id;
  li.setAttribute("aria-selected", "false");
  return li;
}

/** A row that sends a query to a search engine. Its link is a plain anchor (not a.n), so recents never record it. */
function webRow(id: string, text: string, url: string, hint = ""): HTMLLIElement {
  const li = option(el("li", "r ext-row"), id);
  const t = el("div", "t");
  const a = anchor(url, "ext-link", text);
  a.dir = "auto";
  t.append(a);
  if (hint) t.append(el("span", "host", hint));
  const m = el("div", "m");
  m.append(t);
  li.append(m);
  const go = (tab: boolean) => void openUrl(url, tab);
  actions.set(li, go);
  li.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest("a")) go(false);
  });
  return li;
}

function hitRow(h: Hit, idx: number): HTMLLIElement {
  const li = option(rowEl(h.r), `sr-${idx}`);
  actions.set(li, (tab) => {
    addRecent(h.r.u, h.r.n, h.r.h);
    openUrl(h.r.u, tab);
  });
  if (isPinned(h.r.u)) li.querySelector(".t")?.append(el("span", "tag", "On your shelf"));
  return li;
}

// ---------- suggestions ----------
const suggestionRows = () => [...list.querySelectorAll<HTMLElement>(".sg, .lbl")];
/** Section caption inside the list: not an option, so arrow keys skip it. */
const caption = (text: string) => {
  const li = el("li", "lbl", text);
  li.setAttribute("role", "presentation");
  return li;
};
const optionRows = () => [...list.children].filter((c): c is HTMLElement => c.getAttribute("role") === "option");
let sugTimer = 0;
let sugSeen = 0;
/** Last answer, so typing on narrows it at once instead of blanking the rows until the next reply */
let sugLast: string[] = [];

function showSuggestions(items: string[]): void {
  const old = suggestionRows();
  const at = selected ? old.filter((li) => li.classList.contains("sg")).indexOf(selected) : -1;
  for (const li of old) li.remove();
  const engine = defaultEngine();
  const rows = items.map((s, i) => {
    const li = webRow(`sg-${i}`, s, engineUrl(engine, s));
    li.classList.add("sg");
    return li;
  });
  const hasHits = !!list.querySelector(".r:not(.ext-row)");
  if (rows.length) list.prepend(caption(`Suggestions · ${engine.n}`), ...rows, ...(hasHits ? [caption("From the directory")] : []));
  if (at >= 0) select(rows[at] ?? null);
}

function refreshSuggestions(term: string): void {
  clearTimeout(sugTimer);
  const seen = ++sugSeen;
  if (!prefs.suggest) return;
  const lower = term.toLowerCase();
  if (sugLast.length) showSuggestions(sugLast.filter((s) => s.toLowerCase().startsWith(lower) && s.toLowerCase() !== lower));
  sugTimer = window.setTimeout(async () => {
    const items = await fetchSuggestions(prefs.suggest, term);
    if (seen !== sugSeen || q.value.trim() !== term || !items.length) return; // typed on, cleared or turned off meanwhile
    sugLast = items;
    showSuggestions(items);
  }, SUGGEST_DELAY_MS);
}

// ---------- the list ----------
export function showResults(term: string): void {
  const r = search(getIx(), term, { star: prefs.star, nsfw: prefs.nsfw }, limit);
  const first = defaultEngine();
  st.hidden = false;
  if (!r.total) {
    st.textContent = `Nothing matches “${term}”. Press Enter to search ${first.n}, or pick a web chip.`;
    list.replaceChildren();
    more.hidden = true;
    q.setAttribute("aria-expanded", "false");
  } else {
    st.textContent = `${fmt(r.total)} result${r.total === 1 ? "" : "s"} · Enter searches ${first.n}`;
    list.replaceChildren(...r.hits.map(hitRow));
    more.hidden = r.total <= r.hits.length;
  }
  list.hidden = false;
  if (r.total) q.setAttribute("aria-expanded", "true");
  selected = null;
  q.removeAttribute("aria-activedescendant");
  refreshSuggestions(term);
}

/** Arrows walk the rows (Up from the first row goes back to the typed text), Enter searches the web, Escape clears. */
export function bindResultKeys(onClear: () => void): void {
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const rows = optionRows();
      if (list.hidden || !rows.length) return;
      e.preventDefault();
      const next = (selected ? rows.indexOf(selected) : -1) + (e.key === "ArrowDown" ? 1 : -1);
      select(next < 0 ? null : rows[Math.min(rows.length - 1, next)]!);
    } else if (e.key === "Enter") {
      const term = q.value.trim();
      if (!term) return;
      e.preventDefault();
      const tab = e.ctrlKey || e.metaKey;
      const act = selected && actions.get(selected);
      if (act) act(tab);
      else openUrl(engineUrl(defaultEngine(), term), tab);
      q.focus();
    } else if (e.key === "Escape") {
      if (q.value) {
        q.value = "";
        onClear();
      } else {
        q.blur();
      }
    }
  });
}
