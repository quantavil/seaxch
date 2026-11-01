/**
 * Site icons for the home screen only (shelf pins and Lately). A result row can carry several
 * links (main, mirror, subreddit), so one icon on it would misrepresent it; a pin or a recent
 * is a single destination. This is the one third-party host the page talks to, and it only
 * ever sees the hostname of a site the reader pinned or opened. Turn off in Settings.
 */
export const FAVICON_HOST = "https://icons.duckduckgo.com";

export function faviconUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    return /^https?:$/.test(u.protocol) && host ? `${FAVICON_HOST}/ip3/${host}.ico` : "";
  } catch {
    return "";
  }
}
