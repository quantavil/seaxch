/** The loaded dataset: which pages exist, the search index over them, and the opt-in NSFW page. */
import { fmtCount as fmt } from "../shared/pages";
import { F_STAR, type PageData } from "../shared/types";
import { loadNsfw } from "./data";
import { $ } from "./dom";
import { toRows } from "./model";
import { buildIndex, type Index } from "./search";
import { prefs, save } from "./store";
import { showToast } from "./toast";

let base: PageData[] = [];
let pages: PageData[] = [];
let nsfwPage: PageData | null = null;
/** Built on first use (or in idle time after boot): ~20k rows are parsed and lower-cased, which first paint and the section views do not need. */
let ix: Index | undefined;

export const getIx = () => (ix ??= buildIndex(toRows(pages)));
export const visiblePages = () => pages.filter((p) => !p.nsfw || prefs.nsfw);

const sum = (p: PageData, pick: (e: PageData["s"][number]["e"][number]) => boolean) =>
  p.s.reduce((n, s) => n + s.e.filter(pick).length + s.b.reduce((m, b) => m + b.e.filter(pick).length, 0), 0);
export const countOf = (p: PageData) => sum(p, () => true);
export const starCount = (p: PageData) => sum(p, (e) => !!(e[3] & F_STAR));

/** Take the pages the boot merged (seed + stored); the NSFW page is re-attached when it is loaded. */
export function setPages(next: PageData[]): void {
  base = next;
  nsfwPage = null;
  rebuild();
}

function rebuild(): void {
  pages = nsfwPage ? [...base.filter((p) => !p.nsfw), nsfwPage] : base.filter((p) => !p.nsfw);
  ix = undefined;
  for (const p of pages) {
    const tile = document.getElementById("t-" + p.k);
    if (tile) tile.querySelector("i")!.textContent = fmt(countOf(p));
  }
}

export async function ensureNsfw(): Promise<void> {
  if (!prefs.nsfw || nsfwPage) return;
  try {
    nsfwPage = await loadNsfw();
    if (nsfwPage) rebuild();
  } catch {
    const st = $("st");
    st.hidden = false;
    st.textContent = "Could not load the NSFW list. It will be retried next time you turn it on.";
    showToast("Could not load the NSFW list. Check your connection and try again.");
  }
}

export function syncNsfwTile(): void {
  const t = document.getElementById("t-nsfw");
  if (!t) return;
  const on = !!(prefs.nsfw && nsfwPage);
  t.classList.toggle("off", !on);
  if (!on) t.querySelector("i")!.textContent = "Off";
  // the group header counts the NSFW links only while it is on
  const small = t.closest(".grp")?.querySelector<HTMLElement>("small[data-n]");
  if (small) small.textContent = `${fmt(+small.dataset.n! + (on ? countOf(nsfwPage!) : 0))} links`;
}

/** While off, the NSFW row is a switch: one tap turns it on, loads the list and opens it. */
export function bindNsfwTile(): void {
  document.getElementById("t-nsfw")?.addEventListener("click", async (e) => {
    if (prefs.nsfw) return;
    e.preventDefault();
    const box = document.getElementById("nsfw") as HTMLInputElement | null;
    prefs.nsfw = true;
    await ensureNsfw();
    if (!nsfwPage) prefs.nsfw = false;
    save();
    if (box) box.checked = prefs.nsfw;
    syncNsfwTile();
    if (nsfwPage) location.hash = "#nsfw";
  });
}
