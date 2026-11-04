import { Data, Option } from "effect";

export type Editable = Data.TaggedEnum<{
  Plain: { readonly element: HTMLTextAreaElement | HTMLInputElement };
  Rich: { readonly element: HTMLElement };
}>;

export const Editable = Data.taggedEnum<Editable>();

const text_inputs = new Set(["text", "search", "email", "url", ""]);

export const editable_of = (element: Element | null): Option.Option<Editable> =>
  element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement && text_inputs.has(element.type))
    ? Option.some(Editable.Plain({ element }))
    : element instanceof HTMLElement && element.isContentEditable
      ? Option.some(Editable.Rich({ element: rich_root(element) }))
      : Option.none();

const rich_root = (element: HTMLElement): HTMLElement =>
  element.parentElement?.isContentEditable ? rich_root(element.parentElement) : element;

class Piece extends Data.Class<{ readonly node: Text; readonly start: number }> {}

class Flattened extends Data.Class<{ readonly text: string; readonly pieces: ReadonlyArray<Piece> }> {}

const block_tags = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "TR"]);

const flatten = (root: HTMLElement): Flattened => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  const pieces: Array<Piece> = [];
  let text = "";
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node instanceof Text) {
      pieces.push(new Piece({ node, start: text.length }));
      text += node.data;
    } else if (node instanceof HTMLBRElement || (node instanceof HTMLElement && block_tags.has(node.tagName) && text !== "" && !text.endsWith("\n"))) {
      text += "\n";
    }
  }
  return new Flattened({ text, pieces });
};

export const text_of = (editable: Editable): string =>
  Editable.$match(editable, {
    Plain: ({ element }) => element.value,
    Rich: ({ element }) => flatten(element).text,
  });

const locate = (flattened: Flattened, offset: number): Option.Option<{ node: Text; offset: number }> =>
  Option.fromNullishOr(
    flattened.pieces.find((piece) => piece.start <= offset && offset <= piece.start + piece.node.data.length),
  ).pipe(Option.map((piece) => ({ node: piece.node, offset: offset - piece.start })));

const rich_range = (element: HTMLElement, start: number, end: number): Option.Option<Range> => {
  const flattened = flatten(element);
  return Option.all([locate(flattened, start), locate(flattened, end)]).pipe(
    Option.map(([from, to]) => {
      const range = document.createRange();
      range.setStart(from.node, from.offset);
      range.setEnd(to.node, to.offset);
      return range;
    }),
  );
};

const mirrored_properties = [
  "boxSizing",
  "width",
  "height",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "fontStretch",
  "fontFeatureSettings",
  "letterSpacing",
  "wordSpacing",
  "lineHeight",
  "textIndent",
  "textTransform",
  "tabSize",
  "direction",
] as const;

const mirror_rects = (element: HTMLTextAreaElement | HTMLInputElement, start: number, end: number): ReadonlyArray<DOMRect> => {
  const style = getComputedStyle(element);
  const box = element.getBoundingClientRect();
  const mirror = document.createElement("div");
  mirrored_properties.forEach((property) => (mirror.style[property] = style[property]));
  Object.assign(mirror.style, {
    position: "fixed",
    top: `${box.top}px`,
    left: `${box.left}px`,
    visibility: "hidden",
    overflow: "hidden",
    pointerEvents: "none",
    borderColor: "transparent",
    whiteSpace: element instanceof HTMLTextAreaElement ? "pre-wrap" : "pre",
    overflowWrap: element instanceof HTMLTextAreaElement ? "break-word" : "normal",
  });
  const content = document.createTextNode(`${element.value}​`);
  mirror.append(content);
  document.documentElement.append(mirror);
  mirror.scrollTop = element.scrollTop;
  mirror.scrollLeft = element.scrollLeft;
  const range = document.createRange();
  range.setStart(content, start);
  range.setEnd(content, end);
  const rects = Array.from(range.getClientRects());
  mirror.remove();
  return rects;
};

export const rects_of = (editable: Editable, start: number, end: number): ReadonlyArray<DOMRect> =>
  Editable.$match(editable, {
    Plain: ({ element }) => mirror_rects(element, start, end),
    Rich: ({ element }) =>
      rich_range(element, start, end).pipe(
        Option.map((range) => Array.from(range.getClientRects())),
        Option.getOrElse((): ReadonlyArray<DOMRect> => []),
      ),
  });

export const caret_of = (editable: Editable): Option.Option<number> =>
  Editable.$match(editable, {
    Plain: ({ element }) => Option.fromNullishOr(element.selectionStart),
    Rich: ({ element }) => {
      const selection = document.getSelection();
      const anchor = selection?.anchorNode;
      return Option.fromNullishOr(flatten(element).pieces.find((piece) => piece.node === anchor)).pipe(
        Option.map((piece) => piece.start + (selection?.anchorOffset ?? 0)),
      );
    },
  });

const insert = (replacement: string) =>
  replacement === "" ? document.execCommand("delete") : document.execCommand("insertText", false, replacement);

export const replace = (editable: Editable, start: number, end: number, replacement: string): void =>
  Editable.$match(editable, {
    Plain: ({ element }) => {
      element.focus();
      element.setSelectionRange(start, end);
      insert(replacement);
    },
    Rich: ({ element }) => {
      Option.map(rich_range(element, start, end), (range) => {
        element.focus();
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        insert(replacement);
      });
    },
  });

export const surface_of = (element: HTMLElement): "light" | "dark" => {
  const background = (function find(node: HTMLElement | null): string {
    if (node === null) return "rgb(255, 255, 255)";
    const color = getComputedStyle(node).backgroundColor;
    return color === "transparent" || color.endsWith(", 0)") ? find(node.parentElement) : color;
  })(element);
  const [red = 255, green = 255, blue = 255] = (background.match(/[\d.]+/g) ?? []).map(Number);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 140 ? "light" : "dark";
};
