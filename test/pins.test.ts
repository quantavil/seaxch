import { beforeEach, describe, expect, test } from "bun:test";
import { bump, isPinned, renderPins, togglePin } from "../src/app/pins";
import { prefs } from "../src/app/store";
import { STARTER } from "../src/shared/starter";

describe("pins unit tests", () => {
  beforeEach(() => {
    prefs.pins = [];
    prefs.icons = false; // the mock DOM has no Image; favicons are layered on top of the monogram anyway
  });

  test("togglePin adds and removes pins and tracks isPinned", () => {
    expect(isPinned("https://example.com/")).toBe(false);

    const added = togglePin("https://example.com/", "Example");
    expect(added).toBe(true);
    expect(isPinned("https://example.com/")).toBe(true);
    expect(prefs.pins).toEqual([["https://example.com/", "Example", 0]]);

    bump("https://example.com/");
    expect(prefs.pins[0]![2]).toBe(1);

    const removed = togglePin("https://example.com/", "Example");
    expect(removed).toBe(false);
    expect(isPinned("https://example.com/")).toBe(false);
    expect(prefs.pins.length).toBe(0);
  });

  test("renderPins shows starter picks with no pins, the shelf in insertion order with pins", () => {
    const sec = { hidden: false };
    const edit = {
      hidden: false,
      pressed: "true",
      setAttribute(k: string, v: string) {
        if (k === "aria-pressed") this.pressed = v;
      },
    };
    const title = { textContent: "" };
    const container = {
      _text: "something",
      get textContent() {
        return this._text;
      },
      set textContent(v: string) {
        this._text = v;
        if (!v) this.children = [];
      },
      classList: {
        classes: new Set(["edit"]),
        remove(c: string) {
          this.classes.delete(c);
        },
      },
      children: [] as unknown[],
      append(...items: unknown[]) {
        this.children.push(...items);
      },
    };

    // Mock minimal DOM for renderPins
    (globalThis as any).document = {
      getElementById(id: string) {
        if (id === "pins-sec") return sec;
        if (id === "edit") return edit;
        if (id === "shelf-title") return title;
        return null;
      },
      createElement(tag: string) {
        return {
          tag,
          className: "",
          href: "",
          rel: "",
          dataset: {} as Record<string, string>,
          children: [] as unknown[],
          append(...children: unknown[]) {
            this.children.push(...children);
          },
          setAttribute(k: string, v: string) {
            (this as any)[k] = v;
          },
        };
      },
    };

    // 1. With no pins: section stays visible with non-removable starter tiles, edit hidden
    renderPins(container as any);
    expect(sec.hidden).toBe(false);
    expect(edit.hidden).toBe(true);
    expect(edit.pressed).toBe("false");
    expect(title.textContent).toBe("Starter picks");
    expect(container.classList.classes.has("edit")).toBe(false);
    expect(container.children.length).toBe(STARTER.length);
    expect((container.children[0] as any).children.length).toBe(2); // plate, label
    expect(prefs.pins.length).toBe(0);

    // 2. With pins: should be visible
    togglePin("https://test.example/", "Test");
    renderPins(container as any);
    expect(sec.hidden).toBe(false);
    expect(edit.hidden).toBe(false);
    expect(title.textContent).toBe("Your shelf");
    expect(container.children.length).toBe(2); // the pin and the Add tile
    expect((container.children[1] as any).className).toBe("pin add");
    const pinAnchor = container.children[0] as any;
    expect(pinAnchor.tag).toBe("a");
    expect(pinAnchor.className).toBe("pin");
    expect(pinAnchor.href).toBe("https://test.example/");
    const plateEl = pinAnchor.children[0];
    expect(plateEl.className).toBe("plate");
    const mono = plateEl.children[0];
    expect(mono.className).toBe("mono");
    expect(mono.textContent).toBe("T");
    const label = pinAnchor.children[1];
    expect(label.className).toBe("lb");
    expect(label.textContent).toBe("Test");
    const removeBtn = pinAnchor.children[2];
    expect(removeBtn.className).toBe("rm");

    // 3. Order is insertion order; clicking does not reshuffle tiles under the thumb
    togglePin("https://second.example/", "Second");
    bump("https://second.example/");
    renderPins(container as any);
    expect(container.children.length).toBe(3);
    expect((container.children[0] as any).href).toBe("https://test.example/");
    expect((container.children[1] as any).href).toBe("https://second.example/");

    // 4. Removing all pins falls back to the starter picks
    togglePin("https://test.example/", "Test");
    togglePin("https://second.example/", "Second");
    renderPins(container as any);
    expect(sec.hidden).toBe(false);
    expect(edit.hidden).toBe(true);
    expect(container.children.length).toBe(STARTER.length);
  });
});
