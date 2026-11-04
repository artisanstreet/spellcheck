import type { Checked, Spelled } from "../checking/check.ts";
import { issues_of, without_overlaps } from "./from-tagger.ts";
import { Issue, Kind } from "./issue.ts";

const shown_candidates = 3;

const spelling_issue = (spelled: Spelled): Issue =>
  new Issue({
    start: spelled.token.start,
    end: spelled.token.end,
    kind: Kind.Spelling(),
    message: `This looks like a misspelling of “${spelled.candidates[0]}”.`,
    replacements: spelled.candidates.slice(0, shown_candidates),
  });

export const checked_issues = (text: string, checked: Checked): ReadonlyArray<Issue> =>
  without_overlaps([...checked.spelled.map(spelling_issue), ...issues_of(text, checked.tagged)]);
