/** Central static SVG art (never dataset). Pure strings: safe in Node (build) and browser. */
import type { Engine } from "./engines";

const wrap = (size: number, inner: string): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const searchSvg = (size: number): string =>
  wrap(size, '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');

export const gearSvg = (size: number): string =>
  wrap(size, '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>');

export const pencilSvg = (size: number): string =>
  wrap(size, '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>');
export const checkSvg = (size: number): string => wrap(size, '<path d="m5 12 5 5L20 7"/>');
export const trashSvg = (size: number): string =>
  wrap(size, '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>');
export const closeSvg = (size: number): string => wrap(size, '<path d="M6 6l12 12M18 6 6 18"/>');

/** One line glyph per topic group (keys match GROUPS in groups.ts); tinted by the group hue in CSS. */
const GROUP_ICON: Record<string, string> = {
  watch: '<rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="M10.5 9.4v5.2l4.2-2.6z"/>',
  read: '<path d="M12 6.5C10.2 5 7.6 4.5 4 4.5v13c3.6 0 6.2.6 8 2 1.8-1.4 4.4-2 8-2v-13c-3.6 0-6.2.5-8 2zM12 6.5v13"/>',
  play: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M8 10.5v4M6 12.5h4M16 11.5h.01M18 13.5h.01"/>',
  software: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15"/>',
  make: '<path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19zM14 7l3 3"/>',
  code: '<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5"/>',
  web: '<path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6zM9 12l2.2 2.2L15.5 10"/>',
  more: '<path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="3.2"/>',
};
export const groupSvg = (key: string, size: number): string => wrap(size, GROUP_ICON[key] ?? GROUP_ICON.more!);

/** FMHY pick marker: the brand's four-point star, filled. */
export const starSvg = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${STAR4}"/></svg>`;

export const PIN_SVG = wrap(
  15,
  '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>',
);

export const backSvg = (size: number): string =>
  wrap(size, '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>');

const yandexSvg = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M15.5 2H8.2c-3.1 0-5.2 2-5.2 5.2 0 2.7 1.6 4.6 4.1 5.1L3 22h3.6l3.8-9h2.3v9h2.8V2zm-2.8 8.4h-4.3c-1.5 0-2.6-.9-2.6-2.5 0-1.6 1.1-2.5 2.6-2.5h4.3v5z"/></svg>`;

const googleSvg = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M21.35 11.1h-9.17v2.98h5.27c-.24 1.4-1.07 2.6-2.25 3.38v2.78h3.63c2.12-1.96 3.35-4.85 3.35-8.26 0-.6-.05-1.18-.16-1.74l-.67.86zM12.18 21c2.72 0 5-.9 6.67-2.45l-3.26-2.54c-.9.6-2.06.97-3.41.97-2.62 0-4.85-1.77-5.64-4.15H3.19v2.62C4.84 18.73 8.24 21 12.18 21zm-5.64-9c0-.64.11-1.26.31-1.85V7.53H3.19A9.97 9.97 0 0 0 2 12c0 1.61.39 3.14 1.19 4.47l3.66-2.85c-.2-.59-.31-1.21-.31-1.85zm5.64-6.38c1.48 0 2.81.51 3.86 1.51l2.9-2.9C17.18 2.55 14.89 1.62 12.18 1.62 8.24 1.62 4.84 3.89 3.19 7.15l3.66 2.84c.79-2.38 3.02-4.15 5.64-4.15z"/></svg>`;

const googleAiSvg = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="m19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zm7.5 5.5-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>`;

const duckDuckGoSvg = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22zm0 .922C6.434 1.922 1.922 6.434 1.922 12c0 4.437 2.867 8.205 6.85 9.55-.237-.82-.776-2.753-1.6-6.052-1.184-4.741-2.064-8.606 2.379-9.813.047-.011.064-.064.03-.093-.514-.467-1.382-.548-2.233-.38a.06.06 0 0 1-.07-.058c0-.011 0-.023.011-.035.205-.286.572-.507.822-.64a1.843 1.843 0 0 0-.607-.335c-.059-.022-.059-.12-.006-.144.006-.006.012-.012.024-.012 1.749-.233 3.586.292 4.49 1.448.011.011.023.017.035.023 2.968.635 3.509 4.837 3.328 5.998a9.607 9.607 0 0 0 2.346-.576c.746-.286 1.008-.222 1.101-.053.1.193-.018.513-.28.81-.496.567-1.393 1.01-2.974 1.137-.546.044-1.029.024-1.445.006-.789-.035-1.339-.059-1.633.39-.192.298-.041.998 1.487 1.22 1.09.157 2.078.047 2.798-.034.643-.07 1.073-.118 1.172.069.21.402-.996 1.207-3.066 1.224-.158 0-.315-.006-.467-.011-1.283-.065-2.227-.414-2.816-.735a.094.094 0 0 1-.035-.017c-.105-.059-.31.045-.188.267.07.134.444.478 1.004.776-.058.466.087 1.184.338 2l.088-.016c.041-.009.087-.019.134-.025.507-.082.775.012.926.175.717-.536 1.913-1.294 2.03-1.154.583.694.66 2.332.53 2.99-.004.012-.017.024-.04.035-.274.117-1.783-.296-1.783-.511-.059-1.075-.26-1.173-.493-1.225h-.156c.006.006.012.018.018.03l.052.12c.093.257.24 1.063.13 1.26-.112.199-.835.297-1.284.303-.443.006-.543-.158-.637-.408-.07-.204-.103-.675-.103-.95a.857.857 0 0 1 .012-.216c-.134.058-.333.193-.397.281-.017.262-.017.682.123 1.149.07.221-1.518 1.164-1.74.99-.227-.181-.634-1.952-.459-2.67-.187.017-.338.075-.42.191-.367.508.093 2.933.582 3.248.257.169 1.54-.553 2.176-1.095.105.145.305.158.553.158.326-.012.782-.06 1.103-.158.192.45.423.972.613 1.388 4.47-1.032 7.803-5.037 7.803-9.82 0-5.566-4.512-10.078-10.078-10.078z"/></svg>`;

const githubSvg = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`;

const wikiSvg = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5l4 14 4-10 4 10 4-14"/></svg>`;

const redditSvg = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.095.324.324 0 0 0 0 .46c.928.927 2.455.992 2.947.992.492 0 2.019-.065 2.947-.992a.324.324 0 0 0-.46-.46c-.675.674-1.84.77-2.487.77-.647 0-1.812-.096-2.487-.77a.327.327 0 0 0-.229-.095z"/></svg>`;

export const dragHandleSvg = (size: number): string =>
  wrap(size, '<circle cx="9" cy="5" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="9" cy="19" r="1.2"/><circle cx="15" cy="5" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="15" cy="19" r="1.2"/>');

/** Four-point star: the "FMHY pick" marker. */
const STAR4 = "M12 1.5C12.7 7.8 16.2 11.3 22.5 12 16.2 12.7 12.7 16.2 12 22.5 11.3 16.2 7.8 12.7 1.5 12 7.8 11.3 11.3 7.8 12 1.5Z";
/** Brand mark: a squircle lens (it echoes the icon plates) with a dot in focus. icons.ts draws the same geometry for the PNG icons. */
const LENS = (color: string) =>
  `<rect x="3.1" y="3.1" width="12.6" height="12.6" rx="4.6" fill="none" stroke="${color}" stroke-width="2.6"/><path d="M15.6 15.6 20.7 20.7" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/><circle cx="9.4" cy="9.4" r="1.9" fill="${color}"/>`;
export const markSvg = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${LENS("currentColor")}</svg>`;

export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#FF9466"/><g transform="translate(3.2 3.2) scale(1)">${LENS("#2A1308")}</g></svg>`;

const ENGINE_SVG: Record<string, (size: number) => string> = {
  g: googleSvg,
  y: yandexSvg,
  a: googleAiSvg,
  d: duckDuckGoSvg,
  gh: githubSvg,
  w: wikiSvg,
  r: redditSvg,
};

/** An engine's logo. Static markup, safe for innerHTML. */
export const engineSvg = (k: string, size: number): string => (ENGINE_SVG[k] ?? searchSvg)(size);

/** Content of a dock chip (logo + name): written into the page at build time and rebuilt by the dock at runtime. */
export const chipInner = (e: Engine, size: number): string => `${engineSvg(e.k, size)}<span>${e.n}</span>`;
