/**
 * The web-search engines: one registry for the build (dock markup), the critical bundle (chip clicks)
 * and the app (Enter, settings). Pure data, so main.ts can import it without pulling in any icons.
 */
export type Engine = {
  /** stable key, stored in preferences */
  k: string;
  /** short name on chips and rows */
  n: string;
  /** site home, opened when the query is empty */
  home: string;
  /** search URL; the encoded query is appended */
  s: string;
  /**
   * JSONP suggestions endpoint (encoded query appended, then `&callback=name`). Only Google and Yandex answer a
   * <script> request: neither sends CORS headers, and DuckDuckGo ignores `callback`, so it cannot be offered.
   */
  sg?: string;
};

/** In default order: Enter searches the first enabled engine. */
export const ENGINES: readonly Engine[] = [
  { k: "g", n: "Google", home: "https://www.google.com", s: "https://www.google.com/search?q=", sg: "https://suggestqueries.google.com/complete/search?client=firefox&q=" },
  { k: "y", n: "Yandex", home: "https://yandex.com", s: "https://yandex.com/search/?text=", sg: "https://suggest.yandex.com/suggest-ff.cgi?part=" },
  { k: "a", n: "Google AI", home: "https://www.google.com/search?udm=50", s: "https://www.google.com/search?udm=50&q=" },
  { k: "d", n: "DDG", home: "https://duckduckgo.com", s: "https://duckduckgo.com/?q=" },
  { k: "gh", n: "GitHub", home: "https://github.com", s: "https://github.com/search?q=" },
  { k: "w", n: "Wiki", home: "https://en.wikipedia.org", s: "https://en.wikipedia.org/wiki/Special:Search?search=" },
  { k: "r", n: "Reddit", home: "https://www.reddit.com", s: "https://www.reddit.com/search/?q=" },
];

export const DEFAULT_ENGINES: readonly string[] = ENGINES.map((e) => e.k);

/** Yandex-first order of the first release: stored as-is by browsers that never reordered, so it migrates to the default. */
export const LEGACY_ENGINE_ORDER: readonly string[] = ["y", "g", "a", "d", "gh", "w", "r"];

/** Engines that can suggest while typing. */
export const SUGGESTERS: readonly Engine[] = ENGINES.filter((e) => e.sg);

export const engineOf = (k: string): Engine | undefined => ENGINES.find((e) => e.k === k);

/** Where an engine goes for this query (its home page when the query is empty). */
export const engineUrl = (e: Engine, term: string): string => (term ? e.s + encodeURIComponent(term) : e.home);
