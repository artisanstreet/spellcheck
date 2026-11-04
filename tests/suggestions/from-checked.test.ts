import { describe, expect, it } from "vitest";
import { Checked, Spelled } from "../../src/checking/check.ts";
import { Token, tokenize } from "../../src/evaluation/edits/tokens.ts";
import { checked_issues } from "../../src/suggestions/from-checked.ts";
import { Kind } from "../../src/suggestions/issue.ts";
import { Verdict } from "../../src/tagger/labels.ts";
import { Tagged } from "../../src/tagger/tagger.ts";

describe("checked_issues", () => {
  it("offers the top dictionary candidates and lets spelling win over an overlapping tagger flag", () => {
    const text = "helo there";
    const checked = new Checked({
      spelled: [new Spelled({ token: new Token({ text: "helo", start: 0, end: 4 }), candidates: ["hello", "help", "hole", "halo"] })],
      tagged: [new Tagged({ tokens: tokenize(text), start: Verdict.Fine(), verdicts: [Verdict.Flag(), Verdict.Fine()] })],
    });
    const issues = checked_issues(text, checked);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toEqual(Kind.Spelling());
    expect(issues[0]!.replacements).toEqual(["hello", "help", "hole"]);
  });
});
