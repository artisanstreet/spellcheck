import { Data } from "effect";
import { replace, type Edit } from "../edits/edit.ts";
import { Document } from "./document.ts";

const mark_pattern = /\{([^{}]*?)=>([^{}]*?)\}/g;

export class Unmarked extends Data.Class<{ readonly text: string; readonly cursor: number; readonly edits: ReadonlyArray<Edit> }> {}

export const unmark = (source: string): Unmarked => {
  const scanned = Array.from(source.matchAll(mark_pattern)).reduce((state, match) => {
    const [whole, wrong = "", right = ""] = match;
    const text = state.text + source.slice(state.cursor, match.index);
    return new Unmarked({
      text: text + wrong,
      cursor: match.index + whole.length,
      edits: [...state.edits, replace(text.length, text.length + wrong.length, right)],
    });
  }, new Unmarked({ text: "", cursor: 0, edits: [] }));
  return new Unmarked({ ...scanned, text: scanned.text + source.slice(scanned.cursor), cursor: source.length });
};

export const parse_marked = (name: string, source: string): ReadonlyArray<Document> =>
  source
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "")
    .map((paragraph, index) => {
      const { text, edits } = unmark(paragraph);
      return new Document({ id: `${name}:${index + 1}`, text, annotations: [edits] });
    });
