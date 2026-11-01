/**
 * Intent layer on top of FMHY's 23 pages. FMHY names pages after its own file layout
 * ("Misc", "Gaming Tools"); people arrive with a job to do. Every page key from
 * PAGES appears in exactly one group (guarded by test/groups.test.ts), so nothing
 * becomes unreachable.
 *
 * `hue` is the page's colour: each group paints its directory card, result-row bar and monogram tiles.
 */
export type Group = { k: string; n: string; hint: string; hue: number; pages: readonly string[] };

export const GROUPS: readonly Group[] = [
  { k: "watch", n: "Watch & listen", hint: "Movies, TV, anime, music, podcasts", hue: 8, pages: ["video", "audio"] },
  { k: "read", n: "Read & learn", hint: "Books, manga, courses, other languages", hue: 48, pages: ["reading", "educational", "non-english"] },
  { k: "play", n: "Play", hint: "Games, emulators, mods", hue: 100, pages: ["gaming", "gaming-tools"] },
  {
    k: "software",
    n: "Get software",
    hint: "Apps for phone, PC and Linux, plus downloaders",
    hue: 172,
    pages: ["mobile", "linux-macos", "system-tools", "downloading", "torrenting"],
  },
  { k: "make", n: "Make & edit", hint: "Images, video, text and file utilities", hue: 212, pages: ["image-tools", "video-tools", "text-tools", "file-tools"] },
  { k: "code", n: "AI & code", hint: "Chatbots, models, developer resources", hue: 262, pages: ["ai", "developer-tools"] },
  { k: "web", n: "Privacy & web", hint: "Adblockers, VPNs, passwords, social tools", hue: 305, pages: ["privacy", "internet-tools", "social-media-tools"] },
  { k: "more", n: "Odds & ends", hint: "Storage and everything else", hue: 340, pages: ["misc", "storage"] },
];

/** page key -> group, for tinting rows and section headers. */
export const GROUP_OF: Record<string, Group> = Object.fromEntries(GROUPS.flatMap((g) => g.pages.map((p) => [p, g])));

export { STARTER, monogram } from "./starter";
