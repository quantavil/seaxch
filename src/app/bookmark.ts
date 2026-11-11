/** "Add a bookmark" dialog for the shelf. Lazy: the shelf's Add tile imports it on first tap. */
import { el } from "./dom";
import { addPin } from "./pins";
import { showToast } from "./toast";

export function openBookmarkDialog(done: () => void): void {
  const dlg = el("dialog", "bm");
  const form = el("form", "bm-form");
  form.method = "dialog";
  const field = (label: string, type: string, ph: string) => {
    const l = el("label", "bm-f");
    const i = el("input");
    i.type = type;
    i.placeholder = ph;
    i.autocomplete = "off";
    i.autocapitalize = "off";
    i.spellcheck = false;
    l.append(el("span", "", label), i);
    return [l, i] as const;
  };
  const [urlL, url] = field("Address", "text", "example.com");
  url.inputMode = "url";
  url.required = true;
  const [nameL, name] = field("Name (optional)", "text", "Example");
  const err = el("p", "bm-err");
  err.setAttribute("role", "alert");
  err.hidden = true;
  const cancel = el("button", "btn btn-sec", "Cancel");
  cancel.type = "button";
  const save = el("button", "btn btn-sec bm-save", "Add to shelf");
  save.type = "submit";
  const row = el("div", "bm-act");
  row.append(cancel, save);
  form.append(el("h2", "", "Add a bookmark"), urlL, nameL, err, row);
  dlg.append(form);

  const close = () => { dlg.close(); dlg.remove(); };
  cancel.addEventListener("click", close);
  dlg.addEventListener("cancel", () => dlg.remove());
  dlg.addEventListener("click", (e) => { if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!addPin(url.value, name.value)) {
      err.textContent = "Enter a valid http(s) address that is not already on your shelf.";
      err.hidden = false;
      url.focus();
      return;
    }
    close();
    done();
    showToast("Added to your shelf");
  });
  document.body.append(dlg);
  dlg.showModal();
  url.focus();
}
