import { Option } from "effect";
import type { Token } from "../evaluation/edits/tokens.ts";
import { Label, Verdict } from "../tagger/labels.ts";
import type { Tagged } from "../tagger/tagger.ts";
import { Issue, Kind } from "./issue.ts";

const unsure_message = "This word may not fit here, but spellcheck isn't confident enough to suggest a fix. Give it a second look.";

const distance = (left: string, right: string): number =>
  Array.from(right).reduce(
    (previous, right_char, row) =>
      Array.from(left).reduce(
        (current, left_char, column) => [
          ...current,
          Math.min(current[column]! + 1, previous[column + 1]! + 1, previous[column]! + (left_char === right_char ? 0 : 1)),
        ],
        [row + 1],
      ),
    Array.from({ length: left.length + 1 }, (_, index) => index),
  )[left.length]!;

export const looks_misspelled = (original: string, replacement: string): boolean =>
  /^\p{L}{4,}$/u.test(original) &&
  /^\p{L}{4,}$/u.test(replacement) &&
  original.toLowerCase() !== replacement.toLowerCase() &&
  distance(original.toLowerCase(), replacement.toLowerCase()) <= Math.max(1, Math.floor(replacement.length / 4));

const punctuation = (text: string) => /^\p{P}+$/u.test(text);

const capitalized = (text: string) => text.slice(0, 1).toUpperCase() + text.slice(1);

const fix_issue = (text: string, token: Token, label: Label): Option.Option<Issue> =>
  Label.$match(label, {
    Keep: () => Option.none(),
    Replace: ({ text: replacement }) =>
      Option.some(
        looks_misspelled(token.text, replacement)
          ? new Issue({
              start: token.start,
              end: token.end,
              kind: Kind.Spelling(),
              message: `This looks like a misspelling of “${replacement}”.`,
              replacements: [replacement],
            })
          : new Issue({
              start: token.start,
              end: token.end,
              kind: Kind.Grammar(),
              message: `“${replacement}” fits better here.`,
              replacements: [replacement],
            }),
      ),
    Delete: () => {
      const start = token.start > 0 && text[token.start - 1] === " " ? token.start - 1 : token.start;
      return Option.some(
        new Issue({ start, end: token.end, kind: Kind.Grammar(), message: "This word isn't needed here.", replacements: [""] }),
      );
    },
    Append: ({ text: added }) =>
      Option.some(
        new Issue({
          start: token.start,
          end: token.end,
          kind: Kind.Grammar(),
          message: punctuation(added) ? `A “${added}” belongs after this word.` : `“${added}” seems to be missing after this word.`,
          replacements: [punctuation(added) ? `${token.text}${added}` : `${token.text} ${added}`],
        }),
      ),
    CaseCapital: () =>
      Option.some(
        new Issue({
          start: token.start,
          end: token.end,
          kind: Kind.Grammar(),
          message: "This word should start with a capital letter.",
          replacements: [capitalized(token.text)],
        }),
      ),
    CaseLower: () =>
      Option.some(
        new Issue({
          start: token.start,
          end: token.end,
          kind: Kind.Grammar(),
          message: "This word shouldn't start with a capital letter.",
          replacements: [token.text.toLowerCase()],
        }),
      ),
  });

const word_issue = (text: string, token: Token, verdict: Verdict): Option.Option<Issue> =>
  Verdict.$match(verdict, {
    Fine: () => Option.none(),
    Flag: () =>
      Option.some(new Issue({ start: token.start, end: token.end, kind: Kind.Grammar(), message: unsure_message, replacements: [] })),
    Fix: ({ label }) => fix_issue(text, token, label),
  });

const start_issue = (first: Token, verdict: Verdict): Option.Option<Issue> =>
  Verdict.$is("Fix")(verdict) && (Label.$is("Append")(verdict.label) || Label.$is("Replace")(verdict.label))
    ? Option.some(
        new Issue({
          start: first.start,
          end: first.end,
          kind: Kind.Grammar(),
          message: `“${verdict.label.text}” seems to be missing at the start of this sentence.`,
          replacements: [`${verdict.label.text} ${first.text}`],
        }),
      )
    : Option.none();

const overlaps = (left: Issue, right: Issue) => left.start < right.end && right.start < left.end;

export const issues_of = (text: string, tagged: ReadonlyArray<Tagged>): ReadonlyArray<Issue> =>
  tagged
    .flatMap((sentence) => [
      ...Option.toArray(sentence.tokens[0] === undefined ? Option.none() : start_issue(sentence.tokens[0], sentence.start)),
      ...sentence.tokens.flatMap((token, index) => Option.toArray(word_issue(text, token, sentence.verdicts[index] ?? Verdict.Fine()))),
    ])
    .reduce<ReadonlyArray<Issue>>((kept, issue) => (kept.some((other) => overlaps(other, issue)) ? kept : [...kept, issue]), []);
