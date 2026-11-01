import { F_STAR } from "../shared/types";
import { canon } from "../shared/links";
import { PIN_SVG, starSvg } from "../shared/svg";
import { GROUP_OF } from "../shared/groups";
import type { Row } from "./model";
import { el } from "./dom";
import { anchor } from "./nav";
import { isPinned } from "./pins";

/** Hue of the topic group a page belongs to (NSFW and unknown pages fall back to neutral amber). */
export const catHue = (k: string) => GROUP_OF[k]?.hue ?? 45;

/** Registrable-ish host: `fmy.github.io` -> `github.io`, `hub.com` stays. */
function shortHost(host: string): string {
  const p = host.split(".");
  return p.length > 2 ? p.slice(-2).join(".") : host;
}

// static markup only; nothing from the dataset ever goes through innerHTML
const PIN = PIN_SVG;

function pinButton(url: string, name: string): HTMLButtonElement {
  const b = el("button", "pb");
  b.type = "button";
  b.dataset.u = url;
  b.dataset.n = name;
  b.dataset.k = canon(url);
  setPinned(b, isPinned(url));
  b.innerHTML = PIN;
  return b;
}

export function setPinned(b: HTMLElement, on: boolean): void {
  b.setAttribute("aria-pressed", String(on));
  b.setAttribute("aria-label", (on ? "Unpin " : "Pin ") + b.dataset.n);
  b.title = on ? "Unpin" : "Pin to start page";
}

export function rowEl(r: Row): HTMLLIElement {
  const li = el("li", "r");
  // the row's left bar takes its page group's colour (set through the CSSOM: the CSP blocks style="")
  li.style.setProperty("--h", String(catHue(r.pk)));

  const m = el("div", "m");
  const t = el("div", "t");
  const a = anchor(r.u, "n", r.n);
  a.dir = "auto";
  if (r.h) a.title = r.h;
  t.append(a);
  if (r.f & F_STAR) {
    const star = el("span", "s");
    star.title = "Starred by FMHY";
    star.setAttribute("aria-hidden", "true");
    star.innerHTML = starSvg(12);
    t.append(star);
  }
  // touch devices get no tooltip and no browser status bubble, so the destination
  // has to be visible; margin-left:auto pins it to the right of the title row
  if (r.h) t.append(el("span", "host", shortHost(r.h)));
  m.append(t);

  if (r.d) {
    const d = el("p", "d", r.d.split(/\s+\/\s+/).join(" \u00b7 "));
    d.dir = "auto";
    m.append(d);
  }

  if (r.a.length || r.x.length) {
    const x = el("div", "x");
    for (const [l, u] of r.a) x.append(anchor(u, "c", "Mirror " + l));
    for (const [l, u] of r.x) x.append(anchor(u, "c", l));
    m.append(x);
  }

  li.append(m, pinButton(r.u, r.n));
  return li;
}
