import { Option } from "effect";
import { editable_of, text_of, type Editable } from "./editable.ts";

export class FocusedField {
  editable: Option.Option<Editable> = $state.raw(Option.none());
  text = $state("");
  settled = $state("");
  #timer: ReturnType<typeof setTimeout> | undefined;
  layout = $state(0);
  clicks = $state(0);

  constructor() {
    document.addEventListener("focusin", () => this.focus(), true);
    document.addEventListener("focusout", () => queueMicrotask(() => this.focus()), true);
    document.addEventListener("input", () => this.read(), true);
    document.addEventListener("click", () => Option.isSome(this.editable) && this.clicks++, true);
    document.addEventListener("keyup", () => this.layout++, true);
    window.addEventListener("scroll", () => this.layout++, true);
    window.addEventListener("resize", () => this.layout++);
  }

  focus() {
    const next = editable_of(document.activeElement);
    if (Option.isSome(next) && Option.isSome(this.editable) && next.value.element === this.editable.value.element) return;
    this.editable = next;
    this.read();
  }

  read() {
    this.text = Option.match(this.editable, { onNone: () => "", onSome: text_of });
    this.layout++;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => (this.settled = this.text), 350);
  }
}

export const focused_field = new FocusedField();
