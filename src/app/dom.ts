/** Small DOM helpers shared by every module. Imports nothing, so the critical bundle can use it. */

export const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Modules talk through document events: the shelf, Lately and prefs live in the critical bundle, the rest in core. */
type Topic = "recents" | "pins" | "prefs" | "open-settings";
export const emit = (topic: Topic): boolean => document.dispatchEvent(new CustomEvent(`fh:${topic}`));
export const on = (topic: Topic, fn: () => void): void => document.addEventListener(`fh:${topic}`, fn);

export function applyTheme(theme: string): void {
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
