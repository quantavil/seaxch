/** The settings page: search engines (drag to order), suggestions, appearance, privacy and your data. */
import { ENGINES, SUGGESTERS } from "../shared/engines";
import { dragHandleSvg, engineSvg } from "../shared/svg";
import { setEngineOrder, syncDock } from "./dock";
import { $, applyTheme, el, emit } from "./dom";
import { renderPins } from "./pins";
import { sortable } from "./sortable";
import { clearRecents, parsePins, prefs, save, type Theme } from "./store";
import { showToast } from "./toast";

const card = (title: string, ...body: HTMLElement[]) => {
  const c = el("div", "settings-card");
  c.append(el("h3", "", title), ...body);
  return c;
};

const rows = (...children: HTMLElement[]) => {
  const r = el("div", "rows");
  r.append(...children);
  return r;
};

/** Title + description on the left, controls on the right. */
function row(title: string, desc: string, ...controls: HTMLElement[]): HTMLDivElement {
  const r = el("div", "setting-row");
  const info = el("div", "setting-info");
  info.append(el("span", "", title), el("p", "", desc));
  r.append(info, ...controls);
  return r;
}

function switchEl(label: string, checked: boolean, onChange: (on: boolean) => void): HTMLInputElement {
  const cb = el("input", "switch");
  cb.type = "checkbox";
  cb.checked = checked;
  cb.setAttribute("aria-label", label);
  cb.addEventListener("change", () => onChange(cb.checked));
  return cb;
}

const toggleRow = (title: string, desc: string, checked: boolean, onChange: (on: boolean) => void, label = title) =>
  row(title, desc, switchEl(label, checked, onChange));

/** A small set of mutually exclusive buttons (theme, suggestion provider). */
function choice<T extends string>(label: string, options: readonly (readonly [T, string])[], current: T, onPick: (v: T) => void): HTMLDivElement {
  const box = el("div", "opt-btns");
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", label);
  for (const [value, text] of options) {
    const b = el("button", "keycap opt-btn", text);
    b.type = "button";
    b.setAttribute("aria-pressed", String(value === current));
    b.addEventListener("click", () => {
      for (const o of box.children) o.setAttribute("aria-pressed", String(o === b));
      onPick(value);
    });
    box.append(b);
  }
  return box;
}

function action(text: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", "keycap btn-sec", text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

// ---------- search engines ----------
function engineRow(key: string): HTMLElement | null {
  const e = ENGINES.find((x) => x.k === key);
  if (!e) return null;
  const item = el("div", "engine-sort-item");
  item.dataset.key = e.k;
  const grip = el("button", "engine-drag-handle");
  grip.type = "button";
  grip.setAttribute("aria-label", `Reorder ${e.n}: drag, or use the arrow keys`);
  grip.innerHTML = dragHandleSvg(14);
  const icon = el("span", "engine-icon");
  icon.innerHTML = engineSvg(e.k, 16);
  const label = el("div", "engine-item-label");
  label.append(icon, el("span", "engine-name", e.n));
  const on = switchEl(`Show ${e.n} in the dock`, !prefs.disabledEngines.includes(e.k), (checked) => {
    prefs.disabledEngines = checked ? prefs.disabledEngines.filter((x) => x !== e.k) : [...prefs.disabledEngines, e.k];
    save();
    syncDock();
  });
  item.append(grip, label, on);
  return item;
}

function enginesCard(): HTMLElement {
  const list = el("div", "engine-sort-list rows");
  list.append(...prefs.engines.flatMap((k) => engineRow(k) ?? []));
  sortable(list, {
    item: ".engine-sort-item",
    grip: ".engine-drag-handle",
    axis: "y",
    onSort: (keys) => {
      setEngineOrder(keys);
      syncDock();
    },
  });
  return card(
    "Search engines",
    el("p", "setting-desc", "Press Enter to search with the first engine. Drag to reorder (the web chips follow), or switch off the ones you never use."),
    list,
  );
}

function suggestRow(): HTMLElement {
  const options = [["", "Off"], ...SUGGESTERS.map((e) => [e.k, e.n] as const)] as const;
  return row(
    "Search suggestions",
    "Show suggestions as you type. The engine sees your text.",
    choice("Suggestion provider", options, prefs.suggest, (v) => {
      prefs.suggest = v;
      save();
    }),
  );
}

// ---------- pins backup ----------
function exportPins(): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(prefs.pins, null, 2)], { type: "application/json" }));
  const a = el("a");
  a.href = url;
  a.download = "seaxch-pins.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Pins exported!");
}

function importPinsButton(): HTMLLabelElement {
  const label = el("label", "keycap btn-sec file-btn", "Import");
  const file = el("input");
  file.type = "file";
  file.accept = ".json";
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    file.value = "";
    if (!f) return;
    try {
      const data: unknown = JSON.parse(await f.text());
      const pins = parsePins(data);
      if (!Array.isArray(data) || pins.length !== data.length) return showToast("Invalid pins JSON file format.");
      prefs.pins = pins;
      save();
      renderPins($("pins"));
      emit("pins");
      showToast("Pins imported successfully!");
    } catch {
      showToast("Could not parse JSON file.");
    }
  });
  label.append(file);
  return label;
}

// ---------- the page ----------
export function renderSettingsPage(container: HTMLElement): void {
  const head = el("div", "settings-head");
  const title = el("div", "settings-page-title");
  title.append(el("h1", "", "Settings"), el("p", "settings-page-sub", "Search engines, appearance, privacy and your data."));
  head.append(title);

  const behaviour: HTMLElement[] = [
    row(
      "Appearance",
      "Theme selection",
      choice("Theme", [["system", "System"], ["light", "Light"], ["dark", "Dark"]] as const, prefs.theme, (t: Theme) => {
        prefs.theme = t;
        save();
        applyTheme(t);
      }),
    ),
    toggleRow("Open links in new tab", "Keep Seaxch open", prefs.newTab, (on) => {
      prefs.newTab = on;
      save();
    }),
    toggleRow("Starred only", "Only show FMHY-starred links", prefs.star, (on) => {
      prefs.star = on;
      save();
      emit("prefs");
    }),
  ];
  const nsfwBox = document.getElementById("nsfw") as HTMLInputElement | null;
  if (nsfwBox) {
    behaviour.push(
      toggleRow("Show NSFW content", "Include adult directory", prefs.nsfw, (on) => {
        prefs.nsfw = on;
        nsfwBox.checked = on;
        save();
        emit("prefs");
      }),
    );
  }

  const data = [
    toggleRow(
      "Site icons",
      "Fetch icons for your shelf and Lately from DuckDuckGo, which then sees the hostnames of those sites. Off shows letter tiles.",
      prefs.icons,
      (on) => {
        prefs.icons = on;
        save();
        renderPins($("pins"));
        emit("recents");
      },
    ),
    row("Backup Pins", "Export or import your saved pins", (() => {
      const box = el("div", "setting-actions");
      box.append(action("Export", exportPins), importPinsButton());
      return box;
    })()),
    row("Lately", "Clear the list of links you opened recently", action("Clear", () => {
      clearRecents();
      showToast("Recent history cleared");
    })),
  ];

  const grid = el("div", "settings-page-grid");
  grid.append(enginesCard(), card("While you type", rows(suggestRow())), card("Appearance & behaviour", rows(...behaviour)), card("Privacy & data", rows(...data)));
  container.replaceChildren(head, grid);
}
