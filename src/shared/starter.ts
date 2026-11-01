/** Kept apart from groups.ts so the critical-path bundle does not carry the 8 group definitions. */

/**
 * Shown on a fresh device so the shelf is never empty. Plain links, not pins:
 * they do not enter localStorage and vanish as soon as the reader pins something.
 * All are starred in the FMHY seed.
 */
export const STARTER: readonly { n: string; u: string }[] = [
  { n: "Movy", u: "https://www.movy.sx/" },
  { n: "YouTube Music", u: "https://music.youtube.com/" },
  { n: "Anna’s Archive", u: "https://annas-archive.gl/" },
  { n: "Photopea", u: "https://www.photopea.com/" },
  { n: "DeepSeek", u: "https://www.deepseek.com/" },
  { n: "Bitwarden", u: "https://bitwarden.com/" },
  { n: "uBlock Origin", u: "https://github.com/gorhill/uBlock" },
  { n: "Stack Overflow", u: "https://stackoverflow.com/" },
];

/** Initial for a monogram tile: first letter/digit of the name, uppercased. */
export const monogram = (name: string): string => {
  const m = name.match(/[\p{L}\p{N}]/u);
  return m ? m[0].toUpperCase() : "•";
};
