import { Spelled, type Checked } from "../checking/check.ts";
import { issues_of, without_overlaps } from "./from-tagger.ts";
import { Issue, Kind } from "./issue.ts";

const shown_candidates = 3;

const spelling_issue = (spelled: Spelled): Issue =>
  Spelled.$match(spelled, {
    Fixable: ({ token, candidates }) =>
      new Issue({
        start: token.start,
        end: token.end,
        kind: Kind.Spelling(),
        message: `This looks like a misspelling of “${candidates[0]}”.`,
        replacements: candidates.slice(0, shown_candidates),
      }),
    Unknown: ({ token }) =>
      new Issue({ start: token.start, end: token.end, kind: Kind.Spelling(), message: "Spellcheck doesn't know this word.", replacements: [] }),
  });

export const checked_issues = (text: string, checked: Checked): ReadonlyArray<Issue> =>
  without_overlaps([...checked.spelled.map(spelling_issue), ...issues_of(text, checked.tagged)]);
