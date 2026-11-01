/** The "search the web" chips under the search box, and which engine Enter uses. */
import { ENGINES, engineOf, type Engine } from "../shared/engines";
import { prefs, save } from "./store";

/** Engines the reader has switched on, in their order. */
const enabledEngines = (): Engine[] =>
  prefs.engines.filter((k) => !prefs.disabledEngines.includes(k)).flatMap((k) => engineOf(k) ?? []);

/** What Enter searches: the first enabled engine (the first of all if every one is switched off). */
export const defaultEngine = (): Engine => enabledEngines()[0] ?? ENGINES[0]!;

/** Store a new order for some of the engines, keeping the others where they were (switched-off ones are not on the dock). */
export function setEngineOrder(keys: string[]): void {
  const slots = prefs.engines.flatMap((k, i) => (keys.includes(k) ? [i] : []));
  slots.forEach((slot, n) => (prefs.engines[slot] = keys[n]!));
  save();
}

/**
 * Put the chips in the reader's order and hide the switched-off ones. The build writes every chip
 * (logo included), so this only moves and hides them: no icon code runs on the first paint.
 */
export function syncDock(): void {
  const row = document.getElementById("dock-engines")!;
  const chips = new Map([...row.querySelectorAll<HTMLElement>(".dock-chip")].map((c) => [c.dataset.key!, c]));
  row.append(
    ...prefs.engines.flatMap((k) => {
      const chip = chips.get(k);
      if (chip) chip.hidden = prefs.disabledEngines.includes(k);
      return chip ?? [];
    }),
  );
}
