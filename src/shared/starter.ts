/** Kept apart from groups.ts so the critical-path bundle does not carry the 8 group definitions. */

/**
 * Shown on a fresh device so the shelf is never empty. Plain links, not pins:
 * they do not enter localStorage and vanish as soon as the reader pins something.
 * Ten, so a phone (5 tiles per row) fills exactly two rows.
 */
export const STARTER: readonly { n: string; u: string }[] = [
  { n: "ChatGPT", u: "https://chatgpt.com/" },
  { n: "GitHub", u: "https://github.com/" },
  { n: "Wikipedia", u: "https://www.wikipedia.org/" },
  { n: "YouTube", u: "https://www.youtube.com/" },
  { n: "Reddit", u: "https://www.reddit.com/" },
  { n: "MyAnimeList", u: "https://myanimelist.net/" },
  { n: "1337x", u: "https://1337x.to/" },
  { n: "Anna’s Archive", u: "https://annas-archive.gl/" },
  { n: "Photopea", u: "https://www.photopea.com/" },
  { n: "Stack Overflow", u: "https://stackoverflow.com/" },
];

/** Initial for a monogram tile: first letter/digit of the name, uppercased. */
export const monogram = (name: string): string => {
  const m = name.match(/[\p{L}\p{N}]/u);
  return m ? m[0].toUpperCase() : "•";
};
