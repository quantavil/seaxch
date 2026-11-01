import { describe, expect, test } from "bun:test";
import { GROUPS, GROUP_OF, STARTER, monogram } from "../src/shared/groups";
import { PAGES } from "../src/shared/pages";

describe("groups", () => {
  test("CSS hue slots match GROUPS order (inline style is CSP-blocked)", async () => {
    const css = await Bun.file(new URL("../src/app/style.css", import.meta.url)).text();
    GROUPS.forEach((g, i) => expect(css).toContain(`[data-g="${i}"]{--h:${g.hue}}`));
  });
  test("every page key belongs to exactly one group", () => {
    const seen = new Map<string, number>();
    for (const g of GROUPS) for (const p of g.pages) seen.set(p, (seen.get(p) ?? 0) + 1);
    const keys = PAGES.map((p) => p.k);
    for (const key of keys) expect(seen.get(key)).toBe(1);
    for (const [key, n] of seen) {
      expect(keys).toContain(key);
      expect(n).toBe(1);
    }
    expect(Object.keys(GROUP_OF).sort()).toEqual([...keys].sort());
  });
  test("starter links are well formed", () => {
    for (const s of STARTER) expect(() => new URL(s.u)).not.toThrow();
  });
  test("monogram takes the first letter or digit", () => {
    expect(monogram("movy")).toBe("M");
    expect(monogram("  4chan")).toBe("4");
    expect(monogram("!!!")).toBe("•");
  });
});
