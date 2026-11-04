const editable = (element: Element | null): element is HTMLElement =>
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLInputElement && ["text", "search", "email", "url", ""].includes(element.type)) ||
  (element instanceof HTMLElement && element.isContentEditable);

class FocusedField {
  rect: DOMRect | null = $state(null);

  constructor() {
    document.addEventListener("focusin", () => this.update(), true);
    document.addEventListener("focusout", () => queueMicrotask(() => this.update()), true);
    window.addEventListener("scroll", () => this.update(), true);
    window.addEventListener("resize", () => this.update());
  }

  update() {
    const active = document.activeElement;
    this.rect = editable(active) ? active.getBoundingClientRect() : null;
  }
}

export const focused_field = new FocusedField();
