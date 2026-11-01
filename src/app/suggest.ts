/**
 * Search suggestions from Google or Yandex. Neither sends CORS headers, so fetch() cannot read them; they
 * answer a <script> request in JSONP form instead, which is why the CSP lists those two hosts in script-src.
 * Nothing is requested unless the reader picked an engine in Settings: the typed text goes to that engine.
 */
import { engineOf } from "../shared/engines";

const MAX = 6;
const TIMEOUT_MS = 3000;
let seq = 0;

/** `[query, [suggestion, ...], ...]` -> up to MAX distinct suggestion strings that differ from the query. */
export function parseSuggestions(reply: unknown, term: string): string[] {
  const list = Array.isArray(reply) ? reply[1] : null;
  if (!Array.isArray(list)) return [];
  const seen = new Set([term.toLowerCase()]);
  const out: string[] = [];
  for (const s of list) {
    const t = typeof s === "string" ? s.trim() : "";
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length === MAX) break;
  }
  return out;
}

/** Ask one engine for suggestions; resolves to [] on any failure (offline, blocked, slow, odd reply). */
export function fetchSuggestions(engineKey: string, term: string): Promise<string[]> {
  const base = engineOf(engineKey)?.sg;
  if (!base || !term) return Promise.resolve([]);
  return new Promise((resolve) => {
    const name = `__sg${++seq}`;
    const w = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    const finish = (list: string[]) => {
      clearTimeout(timer);
      script.remove();
      resolve(list);
    };
    // a reply that arrives after the timeout must still find a function to call
    const timer = setTimeout(() => finish([]), TIMEOUT_MS);
    w[name] = (reply: unknown) => {
      delete w[name];
      finish(parseSuggestions(reply, term));
    };
    script.onerror = () => finish([]);
    script.src = `${base}${encodeURIComponent(term)}&callback=${name}`;
    document.head.append(script);
  });
}
