import { STARTER } from "../shared/starter";
import { canon } from "../shared/links";
import { el } from "./dom";
import { anchor } from "./nav";
import { plate } from "./plate";
import { prefs, save } from "./store";

const find = (url: string) => prefs.pins.findIndex((p) => canon(p[0]) === canon(url));
export const isPinned = (url: string) => find(url) >= 0;

export function togglePin(url: string, name: string): boolean {
  const i = find(url);
  if (i >= 0) prefs.pins.splice(i, 1);
  else prefs.pins.push([url, name, 0]);
  save();
  return i < 0;
}

export function bump(url: string): void {
  const i = find(url);
  if (i < 0) return;
  prefs.pins[i]![2]++;
  save();
}

function tile(url: string, name: string, removable: boolean): HTMLAnchorElement {
  const a = anchor(url, "pin");
  a.dataset.u = url;
  a.append(plate(url, name), el("span", "lb", name));
  if (removable) {
    const rm = el("button", "rm", "\u00d7");
    rm.type = "button";
    rm.dataset.u = url;
    rm.setAttribute("aria-label", "Remove " + name);
    a.append(rm);
  }
  return a;
}

/** The dashed "Add" tile: pins are made from search results, so it just hands over to the search box. The plus is drawn in CSS: importing svg.ts here would drag every icon into the critical bundle. */
function addTile(): HTMLButtonElement {
  const b = el("button", "pin add");
  b.type = "button";
  b.append(el("span", "plate"), el("span", "lb", "Add"));
  return b;
}

/**
 * The shelf. Pins keep the order they were added in (a tile that moves under your thumb
 * is worse than one that is a little further away). With no pins it shows a starter set
 * of plain links so a fresh device never opens to a blank area; those are not stored.
 */
export function renderPins(box: HTMLElement): void {
  box.textContent = "";
  const sec = document.getElementById("pins-sec");
  const edit = document.getElementById("edit");
  const title = document.getElementById("shelf-title");
  const count = prefs.pins.length;
  if (sec) sec.hidden = false;
  if (edit) edit.hidden = count === 0;
  if (title) title.textContent = count ? "Your shelf" : "Starter picks";
  if (!count) {
    box.classList.remove("edit");
    if (edit) edit.setAttribute("aria-pressed", "false");
    STARTER.forEach((s) => box.append(tile(s.u, s.n, false)));
    return;
  }
  prefs.pins.forEach((p) => box.append(tile(p[0], p[1], true)));
  box.append(addTile());
}
