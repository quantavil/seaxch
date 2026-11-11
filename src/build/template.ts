import { createHash } from "node:crypto";
import { PAGES, NSFW_KEY, NSFW_TITLE, fmtCount } from "../shared/pages";
import { GROUPS } from "../shared/groups";
import { FAVICON_HOST } from "../shared/favicon";
import {
  FAVICON_SVG,
  backSvg,
  checkSvg,
  closeSvg,
  pencilSvg,
  trashSvg,
  markSvg,
  searchSvg,
  gearSvg,
  chipInner,
} from "../shared/svg";
import { ENGINES } from "../shared/engines";

export type TemplateInput = {
  css: string;
  mainJs: string;
  counts: Record<string, number>;
  topStarred?: Record<string, string[]>;
  /** starred entries per page, shown beside the total in the directory */
  picks?: Record<string, number>;
  hasNsfw: boolean;
};

const sha256 = (s: string) => "sha256-" + createHash("sha256").update(s).digest("base64");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const SEARCH_ICON = searchSvg(22);
const FAVICON = "data:image/svg+xml," + encodeURIComponent(FAVICON_SVG);

export function renderHtml(t: TemplateInput): string {
  const pageName = Object.fromEntries(PAGES.map((p) => [p.k, p.n]));
  // One row per FMHY page: full title (never truncated), total, then what is inside in words
  // (picks count + three starred names). `<i>` is the count that core.ts rewrites once NSFW loads.
  const dir = (k: string, off = "") => {
    const stars = t.topStarred?.[k]?.slice(0, 3) ?? [];
    const n = t.picks?.[k] ?? 0;
    const lead = n ? `<b>${fmtCount(n)} picks</b>${stars.length ? " \u00b7 " : ""}` : "";
    const sub = !off && (lead || stars.length) ? `<span class="ds">${lead}${stars.map(esc).join(" \u00b7 ")}</span>` : "";
    return `<a class="dir${off}" id="t-${k}" href="#${k}"><span class="dn">${esc(pageName[k] ?? (k === NSFW_KEY ? NSFW_TITLE : k))}</span><span class="dc"><i>${off ? "Off" : fmtCount(t.counts[k] ?? 0)}</i></span>${sub}</a>`;
  };
  // NSFW is opt-in but never invisible: when the build ships it, its row is always listed ("Off" until one tap turns it on)
  const nsfwRow = (gi: number) => (gi === GROUPS.length - 1 && t.hasNsfw ? `<li>${dir(NSFW_KEY, " off")}</li>` : "");
  const group = (gi: number) => {
    const g = GROUPS[gi]!;
    const total = g.pages.reduce((n, k) => n + (t.counts[k] ?? 0), 0);
    return `<section class="grp" data-g="${gi}"><header class="gh"><h3 class="gn">${esc(g.n)}</h3><small data-n="${total}">${fmtCount(total)} links</small></header><ul>${g.pages.map((k) => `<li>${dir(k)}</li>`).join("")}${nsfwRow(gi)}</ul></section>`;
  };
  // Cards keep GROUPS order; CSS columns balance their heights so no card leaves a gap under it
  const dirs = GROUPS.map((_, gi) => group(gi)).join("");
  const nsfwChip = t.hasNsfw ? '<label class="chip" id="nsfw-chip" hidden><input type="checkbox" id="nsfw"><span>Show NSFW</span></label>' : "";

  const totalLinks = Object.values(t.counts).reduce((a, b) => a + b, 0);
  const searchPlaceholder = `Search ${fmtCount(totalLinks)} links`;

  const chips = ENGINES.map(
    (e) => `<button type="button" class="dock-chip" data-engine="${e.k}" data-key="${e.k}" aria-label="Search ${esc(e.n)}">${chipInner(e, 14)}</button>`,
  ).join("");
  // Opt-in search suggestions load as a <script> (JSONP) from the engines that allow it, so their hosts are listed here
  const suggestHosts = ENGINES.flatMap((e) => (e.sg ? [new URL(e.sg).origin] : []));

  const csp = [
    "default-src 'none'",
    `script-src 'self' ${suggestHosts.join(" ")}`,
    `style-src '${sha256(t.css)}'`,
    `img-src 'self' data: ${FAVICON_HOST}`,
    "connect-src 'self' https://raw.githubusercontent.com",
    "manifest-src 'self'",
    "worker-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#181411">
<title>Seaxch</title>
<link rel="icon" href="${FAVICON}">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Seaxch">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="modulepreload" href="${t.mainJs}">
<style>${t.css}</style></head><body><main>
<header class="top"><div class="lead"><a href="#" class="brand" aria-label="Seaxch home"><span class="mk">${markSvg(18)}</span><span class="brand-text">Seaxch</span></a><button type="button" id="hdr-back" class="back" aria-label="Back to home" title="Back" hidden>${backSvg(18)}</button></div><div class="bar" role="search"><div class="dock-input-inner">${SEARCH_ICON}<input id="q" type="search" placeholder="${searchPlaceholder}" aria-label="Search ${fmtCount(totalLinks)} links" role="combobox" aria-expanded="false" aria-controls="list" aria-autocomplete="list" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" dir="auto"><kbd class="slash" aria-hidden="true">/</kbd><button id="clr" type="button" aria-label="Clear search" hidden>${closeSvg(18)}</button></div><div class="dock-engine-row" id="dock-engines" role="group" aria-label="Search the web instead"><span class="dock-engine-label">Search the web</span>${chips}</div></div><a href="#settings" id="btn-settings" class="icon-btn" aria-label="Settings">${gearSvg(22)}</a></header>
<div class="opts">${nsfwChip}</div>
<p class="st" id="st" aria-live="polite" hidden></p>
<ol class="list" id="list" role="listbox" aria-label="Search results" hidden></ol>
<div id="more" hidden><button id="moreb" type="button" class="btn">Show more</button></div>
<section id="home">
<div class="hub"><div id="pins-sec" class="shelf" hidden><div class="sh"><h2 id="shelf-title">Your shelf</h2><button id="edit" type="button" class="icon-act" aria-label="Edit shelf" title="Edit shelf" aria-pressed="false"><span class="i-edit">${pencilSvg(18)}</span><span class="i-done">${checkSvg(18)}</span></button></div><div class="pins" id="pins"></div></div>
<div id="recents-sec" class="lately" hidden><div class="sh"><h2>Lately</h2><button id="clr-recents" type="button" class="icon-act" aria-label="Clear Lately" title="Clear Lately">${trashSvg(18)}</button></div><div class="recents-row" id="recents-list"></div></div></div>
<div class="browse"><div class="sh"><h2>Browse everything</h2><span class="sh-n">${PAGES.length} folders \u00b7 ${fmtCount(totalLinks)} links</span></div><nav class="dirs" id="cats" aria-label="Categories">${dirs}</nav></div>
</section>
<section id="view" hidden></section>
<section id="settings-view" class="settings-view" hidden></section>
<footer><div>Curated by <a href="https://fmhy.net" rel="noopener noreferrer">FMHY</a> · Synced <span id="sync">at build time</span></div></footer>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
</main><script type="module" src="${t.mainJs}"></script></body></html>`;
}

export function manifest() {
  return {
    id: "./",
    name: "Seaxch",
    short_name: "Seaxch",
    description: "Instant start page for the FMHY link directory",
    start_url: "./",
    scope: "./",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    lang: "en",
    categories: ["utilities", "productivity"],
    shortcuts: [{ name: "Settings", short_name: "Settings", url: "./#settings" }],
    background_color: "#181411",
    theme_color: "#181411",
    icons: [
      { src: "icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
