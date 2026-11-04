import { Data } from "effect";

export type Kind = Data.TaggedEnum<{
  Spelling: {};
  Grammar: {};
}>;

export const Kind = Data.taggedEnum<Kind>();

export class Issue extends Data.Class<{
  readonly start: number;
  readonly end: number;
  readonly kind: Kind;
  readonly message: string;
  readonly replacements: ReadonlyArray<string>;
}> {}

export type Segment = Data.TaggedEnum<{
  Plain: { readonly text: string };
  Marked: { readonly text: string; readonly issue: Issue };
}>;

export const Segment = Data.taggedEnum<Segment>();

export const segments = (text: string, issues: ReadonlyArray<Issue>): ReadonlyArray<Segment> => {
  const ordered = issues.toSorted((left, right) => left.start - right.start);
  const end = ordered.reduce((cursor, issue) => Math.max(cursor, issue.end), 0);
  return [
    ...ordered.flatMap((issue, index) => {
      const from = index === 0 ? 0 : ordered[index - 1]!.end;
      const before = text.slice(from, issue.start);
      return [
        ...(before === "" ? [] : [Segment.Plain({ text: before })]),
        Segment.Marked({ text: text.slice(issue.start, issue.end), issue }),
      ];
    }),
    ...(end < text.length ? [Segment.Plain({ text: text.slice(end) })] : []),
  ];
};

export class Draft extends Data.Class<{
  readonly text: string;
  readonly issues: ReadonlyArray<Issue>;
}> {}

const shifted = (issue: Issue, at: number, delta: number): Issue =>
  issue.start >= at ? new Issue({ ...issue, start: issue.start + delta, end: issue.end + delta }) : issue;

export const accept = (draft: Draft, chosen: Issue, replacement: string): Draft =>
  new Draft({
    text: draft.text.slice(0, chosen.start) + replacement + draft.text.slice(chosen.end),
    issues: draft.issues
      .filter((issue) => issue !== chosen)
      .map((issue) => shifted(issue, chosen.end, replacement.length - (chosen.end - chosen.start))),
  });

export const dismiss = (draft: Draft, chosen: Issue): Draft =>
  new Draft({ ...draft, issues: draft.issues.filter((issue) => issue !== chosen) });
