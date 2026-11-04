import { Data, Match } from "effect";
import { Correction, Edit, replace } from "../evaluation/edits/edit.ts";
import type { Token } from "../evaluation/edits/tokens.ts";

export type Label = Data.TaggedEnum<{
  Keep: {};
  Delete: {};
  Replace: { readonly text: string };
  Append: { readonly text: string };
  CaseCapital: {};
  CaseLower: {};
}>;

export const Label = Data.taggedEnum<Label>();

export const decode_label = (value: string): Label =>
  Match.value(value).pipe(
    Match.when("KEEP", () => Label.Keep()),
    Match.when("DELETE", () => Label.Delete()),
    Match.when("CASE_CAPITAL", () => Label.CaseCapital()),
    Match.when("CASE_LOWER", () => Label.CaseLower()),
    Match.when(
      (label) => label.startsWith("REPLACE_"),
      (label) => Label.Replace({ text: label.slice("REPLACE_".length) }),
    ),
    Match.when(
      (label) => label.startsWith("APPEND_"),
      (label) => Label.Append({ text: label.slice("APPEND_".length) }),
    ),
    Match.orElse(() => Label.Keep()),
  );

export type Verdict = Data.TaggedEnum<{
  Fine: {};
  Fix: { readonly label: Label };
  Flag: {};
}>;

export const Verdict = Data.taggedEnum<Verdict>();

export class Thresholds extends Data.Class<{
  readonly error: number;
  readonly label: number;
  readonly delete: number;
}> {}

export const verdict = (error: number, label: Label, confidence: number, thresholds: Thresholds): Verdict =>
  error < thresholds.error || (Label.$is("Delete")(label) && error < thresholds.delete)
    ? Verdict.Fine()
    : Label.$is("Keep")(label) || confidence < thresholds.label
      ? Verdict.Flag()
      : Verdict.Fix({ label });

const capitalized = (text: string) => text.slice(0, 1).toUpperCase() + text.slice(1);

const fix_edit = (token: Token, label: Label): Edit =>
  Label.$match(label, {
    Keep: () => replace(token.start, token.end, token.text),
    Delete: () => replace(token.start, token.end, ""),
    Replace: ({ text }) => replace(token.start, token.end, text),
    Append: ({ text }) => replace(token.end, token.end, ` ${text}`),
    CaseCapital: () => replace(token.start, token.end, capitalized(token.text)),
    CaseLower: () => replace(token.start, token.end, token.text.toLowerCase()),
  });

const start_edit = (first: Token, label: Label): ReadonlyArray<Edit> =>
  Label.$match(label, {
    Keep: () => [],
    Delete: () => [],
    Replace: ({ text }) => [replace(first.start, first.start, `${text} `)],
    Append: ({ text }) => [replace(first.start, first.start, `${text} `)],
    CaseCapital: () => [],
    CaseLower: () => [],
  });

export const sentence_edits = (tokens: ReadonlyArray<Token>, start: Verdict, verdicts: ReadonlyArray<Verdict>): ReadonlyArray<Edit> => [
  ...(tokens[0] !== undefined && Verdict.$is("Fix")(start) ? start_edit(tokens[0], start.label) : []),
  ...tokens.flatMap((token, index) =>
    Verdict.$match(verdicts[index] ?? Verdict.Fine(), {
      Fine: () => [],
      Fix: ({ label }) => [fix_edit(token, label)],
      Flag: () => [new Edit({ start: token.start, end: token.end, correction: Correction.Unknown() })],
    }),
  ),
];
