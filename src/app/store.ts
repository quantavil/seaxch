/** Synchronous per-browser preferences. One localStorage key, always wrapped: storage can be blocked or full. */
import { DEFAULT_ENGINES, LEGACY_ENGINE_ORDER, engineOf } from "../shared/engines";
import { emit } from "./dom";

type Pin = [url: string, name: string, clicks: number];
type Recent = [url: string, name: string, host: string, time: number];
export type Theme = "system" | "light" | "dark";

export type Prefs = {
  pins: Pin[];
  nsfw: boolean;
  star: boolean;
  newTab: boolean;
  icons: boolean;
  theme: Theme;
  recents: Recent[];
  /** every engine, in the reader's order: the first enabled one is what Enter searches */
  engines: string[];
  disabledEngines: string[];
  /** engine key whose suggestions show while typing, "" for none (typed text goes to that engine) */
  suggest: string;
};

const KEY = "fh1";

const isKnown = (x: unknown): x is string => typeof x === "string" && !!engineOf(x);
const isPair = (x: unknown): x is [string, string] => Array.isArray(x) && typeof x[0] === "string" && typeof x[1] === "string";
const toPin = (x: [string, string, unknown?]): Pin => [x[0], x[1], +(x[2] as number) || 0];

/** Pins from untrusted JSON (storage or an imported file): only well-formed [url, name, clicks] entries survive. */
export const parsePins = (x: unknown): Pin[] => (Array.isArray(x) ? x.filter((p) => isPair(p) && /^https?:\/\//i.test(p[0])).map(toPin) : []);
const sameOrder = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((k, i) => k === b[i]);

/** Defaults overlaid with whatever the stored JSON holds that still makes sense. */
export function parsePrefs(raw: string | null): Prefs {
  const p: Prefs = {
    pins: [],
    nsfw: false,
    star: false,
    newTab: true,
    icons: true,
    theme: "system",
    recents: [],
    engines: [...DEFAULT_ENGINES],
    disabledEngines: [],
    suggest: "",
  };
  try {
    const o = JSON.parse(raw || "{}");
    p.pins = parsePins(o.pins);
    p.nsfw = o.nsfw === 1;
    p.star = o.star === 1;
    if (o.newTab !== undefined) p.newTab = o.newTab !== 0;
    if (o.icons !== undefined) p.icons = o.icons !== 0;
    if (o.theme === "light" || o.theme === "dark" || o.theme === "system") p.theme = o.theme;
    if (Array.isArray(o.recents)) p.recents = o.recents.filter(isPair).slice(0, 8);
    if (Array.isArray(o.engines)) {
      // drop keys that no longer exist (removed engines) and repeats, then append engines added since
      const kept: string[] = [...new Set<string>(o.engines.filter(isKnown))];
      // a first-release order (Yandex first) that was never re-saved by this version is not a choice: it moves to the current default once (`ev` marks orders written since)
      if (kept.length && !(o.ev !== 1 && sameOrder(kept, LEGACY_ENGINE_ORDER))) p.engines = [...kept, ...DEFAULT_ENGINES.filter((k) => !kept.includes(k))];
    }
    if (Array.isArray(o.disabledEngines)) p.disabledEngines = o.disabledEngines.filter(isKnown);
    if (engineOf(o.suggest)?.sg) p.suggest = o.suggest;
  } catch {
    /* first run, blocked storage, or corrupt value: start empty */
  }
  return p;
}

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export const prefs: Prefs = parsePrefs(stored());

export function save(): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        pins: prefs.pins,
        nsfw: prefs.nsfw ? 1 : 0,
        star: prefs.star ? 1 : 0,
        newTab: prefs.newTab ? 1 : 0,
        icons: prefs.icons ? 1 : 0,
        theme: prefs.theme,
        recents: prefs.recents,
        engines: prefs.engines,
        ev: 1,
        disabledEngines: prefs.disabledEngines,
        suggest: prefs.suggest,
      }),
    );
  } catch {
    /* ignore */
  }
}

// another tab saved: adopt its state, or this tab's next save would overwrite it with stale pins, Lately and prefs
addEventListener("storage", (e: StorageEvent) => {
  if (e.key !== KEY) return;
  Object.assign(prefs, parsePrefs(e.newValue));
  emit("pins");
  emit("recents");
  emit("prefs");
});

export function addRecent(url: string, name: string, host: string): void {
  if (!url || !name) return;
  const i = prefs.recents.findIndex((r) => r[0] === url);
  if (i >= 0) prefs.recents.splice(i, 1);
  prefs.recents.unshift([url, name, host, Date.now()]);
  if (prefs.recents.length > 8) prefs.recents.pop();
  save();
  emit("recents");
}

export function clearRecents(): void {
  prefs.recents = [];
  save();
  emit("recents");
}
