import { describe, expect, test } from "bun:test";
import { DEFAULT_ENGINES, ENGINES, LEGACY_ENGINE_ORDER, SUGGESTERS, engineOf, engineUrl } from "../src/shared/engines";
import { parsePrefs, prefs } from "../src/app/store";
import { setEngineOrder } from "../src/app/dock";
import { parseSuggestions } from "../src/app/suggest";

describe("engine registry", () => {
  test("Google is first, so Enter searches it by default", () => {
    expect(DEFAULT_ENGINES[0]).toBe("g");
    expect(new Set(DEFAULT_ENGINES).size).toBe(ENGINES.length);
  });
  test("engineUrl encodes the query and falls back to the home page", () => {
    expect(engineUrl(engineOf("g")!, "a b&c")).toBe("https://www.google.com/search?q=a%20b%26c");
    expect(engineUrl(engineOf("a")!, "x")).toBe("https://www.google.com/search?udm=50&q=x");
    expect(engineUrl(engineOf("y")!, "")).toBe("https://yandex.com");
    expect(engineUrl(engineOf("w")!, "x y")).toBe("https://en.wikipedia.org/wiki/Special:Search?search=x%20y");
  });
  test("only Google and Yandex can suggest (DuckDuckGo ignores JSONP callbacks)", () => {
    expect(SUGGESTERS.map((e) => e.k)).toEqual(["g", "y"]);
    expect(engineOf("d")!.sg).toBeUndefined();
  });
});

describe("preferences", () => {
  const engines = (o: object) => parsePrefs(JSON.stringify(o)).engines;
  test("a legacy-looking order the reader saved since is kept", () => {
    expect(engines({ engines: [...LEGACY_ENGINE_ORDER], ev: 1 })).toEqual([...LEGACY_ENGINE_ORDER]);
  });
  test("defaults: Google first, no suggestions, nothing switched off", () => {
    const p = parsePrefs(null);
    expect(p.engines).toEqual([...DEFAULT_ENGINES]);
    expect(p.suggest).toBe("");
    expect(p.disabledEngines).toEqual([]);
  });
  test("an untouched Yandex-first order moves to the new default", () => {
    expect(engines({ engines: [...LEGACY_ENGINE_ORDER] })).toEqual([...DEFAULT_ENGINES]);
  });
  test("a custom order is kept; unknown and repeated keys go, new engines are appended", () => {
    expect(engines({ engines: ["r", "d", "zz", "r", "g"] })).toEqual(["r", "d", "g", "y", "a", "gh", "w"]);
  });
  test("suggest accepts only an engine that can suggest", () => {
    expect(parsePrefs('{"suggest":"y"}').suggest).toBe("y");
    expect(parsePrefs('{"suggest":"d"}').suggest).toBe("");
    expect(parsePrefs('{"suggest":"nope"}').suggest).toBe("");
  });
  test("corrupt storage falls back to defaults", () => {
    expect(parsePrefs("{oops").engines).toEqual([...DEFAULT_ENGINES]);
  });
  test("setEngineOrder reorders a subset and leaves the other engines in their slots", () => {
    prefs.engines = ["g", "y", "a", "d"];
    setEngineOrder(["d", "g", "a"]); // y (switched off) is not in the dock
    expect(prefs.engines).toEqual(["d", "y", "g", "a"]);
  });
});

describe("parseSuggestions", () => {
  test("reads the OpenSearch shape, trims, drops repeats and the query itself", () => {
    expect(parseSuggestions(["cat", [" cats ", "cat", "CATS", "cat food", 7, ""]], "cat")).toEqual(["cats", "cat food"]);
  });
  test("caps the list at six", () => {
    expect(parseSuggestions(["a", ["1", "2", "3", "4", "5", "6", "7", "8"]], "a")).toHaveLength(6);
  });
  test("odd replies give nothing", () => {
    for (const bad of [null, "x", [], ["a"], ["a", "nope"], { 1: ["x"] }]) expect(parseSuggestions(bad, "a")).toEqual([]);
  });
});
