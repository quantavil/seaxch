import { $, el } from "./dom";

let toastTimer = 0;

export function showToast(msg: string, undo?: () => void): void {
  const box = $("toast");
  if (!box) return;
  clearTimeout(toastTimer);
  box.replaceChildren(el("span", "toast-msg", msg));

  if (undo) {
    const btn = el("button", "toast-undo keycap", "Undo");
    btn.type = "button";
    btn.addEventListener("click", () => {
      undo();
      box.hidden = true;
      clearTimeout(toastTimer);
    });
    box.append(btn);
  }

  box.hidden = false;
  toastTimer = window.setTimeout(() => {
    box.hidden = true;
  }, 4500);
}
