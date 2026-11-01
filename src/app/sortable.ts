/**
 * Drag-to-reorder on pointer events (mouse, touch, pen), plus arrow keys on a handle.
 * Items carry `data-key`. The dragged item never leaves the DOM: its neighbours step around it
 * as the pointer crosses their midpoints, so pointer capture survives and the list reorders live.
 */
export type SortableOptions = {
  /** selector of the draggable children of `root` */
  item: string;
  /**
   * Selector of the grip inside an item. With a grip, any pointer can drag it and the arrow keys move
   * the item; without one the whole item drags, for the mouse only (a finger on it means scrolling).
   */
  grip?: string;
  /** the direction the items run in */
  axis: "x" | "y";
  /** called once per finished move with the new key order */
  onSort: (keys: string[]) => void;
};

const MOVE_PX = 5;

export function sortable(root: HTMLElement, o: SortableOptions): void {
  const items = () => [...root.querySelectorAll<HTMLElement>(o.item)];
  const commit = () => o.onSort(items().map((i) => i.dataset.key!));

  /** Step the first item under the pointer around `item` once the pointer is past that item's midpoint. */
  const shuffle = (item: HTMLElement, x: number, y: number) => {
    for (const other of items()) {
      if (other === item) continue;
      const r = other.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const follows = !!(item.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING);
      const [at, mid] = o.axis === "y" ? [y, r.top + r.height / 2] : [x, r.left + r.width / 2];
      if (follows ? at > mid : at < mid) other.parentNode!.insertBefore(other, follows ? item : item.nextSibling);
      return;
    }
  };

  root.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || (!o.grip && e.pointerType !== "mouse")) return;
    const item = (e.target as Element).closest(o.grip ?? o.item)?.closest<HTMLElement>(o.item);
    if (!item || !root.contains(item)) return;
    const { clientX: x0, clientY: y0, pointerId } = e;
    let dragging = false;

    const move = (m: PointerEvent) => {
      if (m.pointerId !== pointerId) return;
      if (!dragging) {
        if (Math.hypot(m.clientX - x0, m.clientY - y0) < MOVE_PX) return;
        dragging = true;
        item.classList.add("dragging");
        document.body.classList.add("sorting");
      }
      shuffle(item, m.clientX, m.clientY);
    };
    const end = (u: PointerEvent) => {
      if (u.pointerId !== pointerId) return;
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
      if (!dragging) return;
      item.classList.remove("dragging");
      document.body.classList.remove("sorting");
      // the release would also click the item (a chip would search): swallow that one click
      const swallow = (c: Event) => {
        c.stopPropagation();
        c.preventDefault();
      };
      document.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => document.removeEventListener("click", swallow, true), 0);
      commit();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
  });

  if (!o.grip) return;
  root.addEventListener("keydown", (e) => {
    const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    const grip = (e.target as Element).closest<HTMLElement>(o.grip!);
    const item = grip?.closest<HTMLElement>(o.item);
    if (!step || !grip || !item) return;
    e.preventDefault();
    const next = step < 0 ? item.previousElementSibling : item.nextElementSibling;
    if (!next?.matches(o.item)) return;
    next.parentNode!.insertBefore(item, step < 0 ? next : next.nextSibling);
    grip.focus();
    commit();
  });
}
