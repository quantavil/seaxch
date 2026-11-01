import { monogram } from "../shared/starter";
import { faviconUrl } from "../shared/favicon";
import { prefs } from "./store";

/** Stable 0-7 slot (one per `[data-g]` hue) from a host, so the same site always gets the same fallback tint. */
const slotOf = (url: string): number => {
  let h = 0;
  try {
    for (const c of new URL(url).hostname.replace(/^www\./, "")) h = (h * 31 + c.charCodeAt(0)) | 0;
  } catch {
    /* not a URL: slot 0 */
  }
  return Math.abs(h) % 8;
};

/**
 * The icon plate of a shelf pin or a Lately card: a letter monogram that is always there,
 * with the site's own icon laid over it once (and only if) it loads. The plate is a neutral
 * light square so transparent or dark icons stay readable in both themes.
 */
export function plate(url: string, name: string): HTMLSpanElement {
  const p = document.createElement("span");
  p.className = "plate";
  const mono = document.createElement("span");
  mono.className = "mono";
  mono.dataset.g = String(slotOf(url));
  mono.setAttribute("aria-hidden", "true");
  mono.textContent = monogram(name);
  p.append(mono);
  const src = prefs.icons ? faviconUrl(url) : "";
  if (src) {
    const img = new Image();
    img.className = "fav";
    img.alt = "";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("load", () => p.classList.toggle("ok", img.naturalWidth > 1));
    img.addEventListener("error", () => img.remove());
    img.src = src;
    p.append(img);
  }
  return p;
}
