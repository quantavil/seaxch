import { describe, expect, test } from "bun:test";
import { FAVICON_HOST, faviconUrl } from "../src/shared/favicon";

describe("faviconUrl", () => {
  test("uses the bare host without www", () => {
    expect(faviconUrl("https://www.movy.sx/path?q=1")).toBe(`${FAVICON_HOST}/ip3/movy.sx.ico`);
  });
  test("returns empty for non-http or invalid urls", () => {
    expect(faviconUrl("not a url")).toBe("");
    expect(faviconUrl("javascript:alert(1)")).toBe("");
  });
});
