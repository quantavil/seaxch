/** Opening links the way the reader asked: a new tab or the current one. */
import { el } from "./dom";
import { prefs } from "./store";

/** A link that honours "Open links in new tab". */
export function anchor(url: string, cls = "", text?: string): HTMLAnchorElement {
  const a = el("a", cls, text);
  a.href = url;
  a.rel = "noopener noreferrer";
  if (prefs.newTab) a.target = "_blank";
  return a;
}

/** Programmatic open (Enter, chips, rows); `tab` forces a new tab (Ctrl/Cmd+Enter). Returns true when a new tab was opened. */
export function openUrl(url: string, tab = false): boolean {
  if (prefs.newTab || tab) {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }
  location.assign(url);
  return false;
}

/** Host without `www.`, for recents and labels. */
export const bareHost = (a: HTMLAnchorElement): string => a.hostname.replace(/^www\./, "");
