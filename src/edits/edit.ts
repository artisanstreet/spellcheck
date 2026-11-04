import { Data } from "effect";

export type Correction = Data.TaggedEnum<{
  Known: { readonly text: string };
  Unknown: {};
}>;

export const Correction = Data.taggedEnum<Correction>();

export class Edit extends Data.Class<{
  readonly start: number;
  readonly end: number;
  readonly correction: Correction;
}> {}

export const replace = (start: number, end: number, text: string): Edit =>
  new Edit({ start, end, correction: Correction.Known({ text }) });

export const apply_edits = (text: string, edits: ReadonlyArray<Edit>): string =>
  edits
    .toSorted((left, right) => right.start - left.start)
    .reduce(
      (result, edit) =>
        Correction.$match(edit.correction, {
          Known: ({ text: replacement }) => result.slice(0, edit.start) + replacement + result.slice(edit.end),
          Unknown: () => result,
        }),
      text,
    );
