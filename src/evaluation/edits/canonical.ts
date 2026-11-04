import { Array as Arr, Data, Option } from "effect";
import { Correction, type Edit } from "./edit.ts";
import { tokenize, type Token } from "./tokens.ts";

export class Canonical extends Data.Class<{
  readonly from: number;
  readonly to: number;
  readonly original: string;
  readonly correction: Correction;
}> {}

export const span_key = (edit: Canonical): string => `${edit.from}:${edit.to}`;

export const correction_key = (edit: Canonical): string =>
  Correction.$match(edit.correction, {
    Known: ({ text }) => `${span_key(edit)}:${text}`,
    Unknown: () => `${span_key(edit)}:?`,
  });

const shared_prefix = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): number =>
  Arr.findFirstIndex(Arr.zip(left, right), ([a, b]) => a !== b).pipe(Option.getOrElse(() => Math.min(left.length, right.length)));

const covering = (tokens: ReadonlyArray<Token>, edit: Edit): ReadonlyArray<Token> =>
  tokens.filter((token) =>
    edit.start === edit.end ? token.start < edit.start && edit.start < token.end : token.end > edit.start && token.start < edit.end,
  );

export const canonicalize = (text: string, tokens: ReadonlyArray<Token>, edit: Edit): Option.Option<Canonical> => {
  const touched = covering(tokens, edit);
  const start = Math.min(edit.start, touched[0]?.start ?? edit.start);
  const end = Math.max(edit.end, touched.at(-1)?.end ?? edit.end);
  const from = tokens.filter((token) => token.end <= start).length;
  const to = tokens.filter((token) => token.start < end).length;
  const original = tokens.slice(from, to).map((token) => token.text);
  return Correction.$match(edit.correction, {
    Unknown: () => Option.some(new Canonical({ from, to, original: original.join(" "), correction: edit.correction })),
    Known: ({ text: replacement }) => {
      const corrected = tokenize(text.slice(start, edit.start) + replacement + text.slice(edit.end, end)).map((token) => token.text);
      const prefix = shared_prefix(original, corrected);
      const suffix = shared_prefix(original.slice(prefix).toReversed(), corrected.slice(prefix).toReversed());
      const kept = original.slice(prefix, original.length - suffix);
      const changed = corrected.slice(prefix, corrected.length - suffix);
      return kept.length === 0 && changed.length === 0
        ? Option.none()
        : Option.some(
            new Canonical({
              from: from + prefix,
              to: to - suffix,
              original: kept.join(" "),
              correction: Correction.Known({ text: changed.join(" ") }),
            }),
          );
    },
  });
};

export const canonicalize_all = (text: string, edits: ReadonlyArray<Edit>): ReadonlyArray<Canonical> => {
  const tokens = tokenize(text);
  return Arr.getSomes(edits.map((edit) => canonicalize(text, tokens, edit)));
};
