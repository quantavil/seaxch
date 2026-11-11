/** Loaded after first paint (or on first interaction): routing and wiring for the dataset, search, category views and settings. */
import type { Seed } from "../shared/types";
import { loadSeed, mergePages, readStored } from "./data";
import { bindNsfwTile, ensureNsfw, getIx, setPages, syncNsfwTile, visiblePages } from "./catalog";
import { setEngineOrder } from "./dock";
import { $, on } from "./dom";
import { idbKV } from "./kv";
import { bareHost } from "./nav";
import { isPinned, renderPins, togglePin } from "./pins";
import { setPinned } from "./render";
import { bindResultKeys, clearSelection, growLimit, resetLimit, showResults } from "./results";
import { showView } from "./section-view";
import { renderSettingsPage } from "./settings";
import { sortable } from "./sortable";
import { addRecent } from "./store";
import { showToast } from "./toast";

const q = $<HTMLInputElement>("q");
const clr = $("clr");
const st = $("st");
const list = $("list");
const more = $("more");
const home = $("home");
const view = $("view");
const settingsView = $("settings-view");
const hdrBack = $<HTMLButtonElement>("hdr-back");

let ready = false;
let hasNavigated = false;
let homeY = 0; // where the home screen was scrolled to when it was last left

const goBack = () => {
  if (hasNavigated && history.length > 1) history.back();
  else location.hash = "";
};

function route(): void {
  if (!ready) return;
  const homeWasShown = !home.hidden;
  const settingsWasShown = !settingsView.hidden;
  if (homeWasShown) homeY = scrollY;
  const term = q.value.trim();
  document.body.classList.toggle("q", !!term);
  clr.hidden = !q.value;
  const key = decodeURIComponent(location.hash.slice(1).split("?")[0] || "");
  const page = key === "settings" ? undefined : visiblePages().find((p) => p.k === key);
  const showRes = !!term;
  const showVw = !showRes && !!page;
  const showSettings = !showRes && key === "settings";
  const away = showVw || showSettings;

  for (const sel of [".bar", ".opts"]) document.querySelector<HTMLElement>(sel)!.hidden = away;
  list.hidden = st.hidden = !showRes;
  view.hidden = !showVw;
  settingsView.hidden = !showSettings;
  home.hidden = showRes || away;
  hdrBack.hidden = !away;
  hdrBack.setAttribute("aria-label", showSettings ? "Back" : "Back to home");

  // a toggle inside Settings re-routes; only a fresh arrival rebuilds the page, so focus and scroll survive
  if (showSettings && !settingsWasShown) {
    renderSettingsPage(settingsView);
    scrollTo(0, 0);
  }
  if (!home.hidden && !homeWasShown) scrollTo(0, homeY);
  if (showRes) showResults(term);
  else if (showVw) showView(page!);
  else if (!showSettings) {
    q.setAttribute("aria-expanded", "false");
    q.removeAttribute("aria-activedescendant");
  }
  more.hidden = more.hidden || !showRes;
}

let searchTimer = 0;
const schedule = () => {
  resetLimit();
  clearSelection();
  clearTimeout(searchTimer);
  searchTimer = window.setTimeout(route, 70);
};

// ---------- events ----------
q.addEventListener("input", schedule);
bindResultKeys(schedule);
hdrBack.addEventListener("click", goBack);
clr.addEventListener("click", () => {
  q.value = "";
  schedule();
  q.focus();
});
$("moreb").addEventListener("click", () => {
  growLimit();
  route();
});
addEventListener("hashchange", () => {
  hasNavigated = true;
  route();
});

addEventListener("keydown", (e: KeyboardEvent) => {
  const t = e.target as HTMLElement;
  const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable;
  if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
    e.preventDefault();
    q.focus();
    q.select();
  } else if (e.key === "Escape" && location.hash === "#settings") {
    goBack();
  }
});

// Record recents on main link clicks only (extras like Subreddit/Discord are not sites)
document.addEventListener("click", (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.n");
  if (a && a.href) {
    addRecent(a.href, a.textContent?.trim() || bareHost(a), bareHost(a));
  }
});

// Pin toggle button with Undo toast
const syncPinButtons = (k: string | undefined, now: (b: HTMLElement) => boolean) => {
  for (const o of document.querySelectorAll<HTMLElement>(".pb")) if (!k || o.dataset.k === k) setPinned(o, now(o));
};
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>(".pb");
  if (!b) return;
  e.preventDefault();
  const { u, n, k } = b.dataset as { u: string; n: string; k: string };
  const flip = () => {
    const pinned = togglePin(u, n);
    syncPinButtons(k, () => pinned);
    renderPins($("pins"));
    return pinned;
  };
  const pinned = flip();
  showToast(pinned ? `Pinned ${n}` : `Unpinned ${n}`, flip);
});

on("pins", () => syncPinButtons(undefined, (o) => isPinned(o.dataset.u!)));
on("prefs", async () => {
  await ensureNsfw();
  syncNsfwTile();
  route();
});
on("open-settings", () => {
  location.hash = "#settings";
});

// ---------- boot ----------
async function boot(): Promise<void> {
  sortable($("dock-engines"), { item: ".dock-chip", axis: "x", onSort: setEngineOrder });
  bindNsfwTile();
  let seed: Seed;
  try {
    seed = await loadSeed();
  } catch {
    st.hidden = false;
    st.textContent = "Could not load the link data. Check your connection and reload.";
    return;
  }
  const kv = idbKV();
  const stored = await readStored(kv, seed);
  setPages(mergePages(seed, stored.pages));
  await ensureNsfw();
  syncNsfwTile();
  $("sync").textContent = new Date(stored.meta.syncedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  ready = true;
  route();

  const idle = window.requestIdleCallback?.bind(window) ?? ((f: () => void) => setTimeout(f, 2000));
  idle(() => void getIx(), { timeout: 2000 });
  idle(() => void import("./updater").then((m) => m.maybeUpdate(kv, seed)), { timeout: 10_000 });
}

void boot();
