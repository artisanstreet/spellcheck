import { describe, expect, it } from "vitest";
import { tokenize } from "../../src/evaluation/edits/tokens.ts";
import { issues_of, looks_misspelled } from "../../src/suggestions/from-tagger.ts";
import { accept, Draft } from "../../src/suggestions/issue.ts";
import { Verdict, decode_label } from "../../src/tagger/labels.ts";
import { Tagged } from "../../src/tagger/tagger.ts";

const fine = Verdict.Fine();
const fix = (label: string) => Verdict.Fix({ label: decode_label(label) });

const corrected = (text: string, start: Verdict, verdicts: ReadonlyArray<Verdict>) => {
  const issues = issues_of(text, [new Tagged({ tokens: tokenize(text), start, verdicts })]);
  return issues.reduce(
    (draft) => accept(draft, draft.issues[0]!, draft.issues[0]!.replacements[0]!),
    new Draft({ text, issues }),
  ).text;
};

describe("looks_misspelled", () => {
  it("tells typos apart from word choice", () => {
    expect(looks_misspelled("recieved", "received")).toBe(true);
    expect(looks_misspelled("tomorow", "tomorrow")).toBe(true);
    expect(looks_misspelled("go", "goes")).toBe(false);
    expect(looks_misspelled("in", "on")).toBe(false);
  });
});

describe("issues_of", () => {
  it("turns every kind of fix into an edit that produces the corrected sentence", () => {
    expect(corrected("she go to the the school", fine, [fix("CASE_CAPITAL"), fix("REPLACE_goes"), fine, fine, fix("DELETE"), fix("APPEND_.")])).toBe(
      "She goes to the school.",
    );
  });

  it("anchors insertions at the start of a sentence to its first word", () => {
    expect(corrected("think so", fix("APPEND_I"), [fine, fine])).toBe("I think so");
  });

  it("keeps unsure flags without a replacement", () => {
    const [issue] = issues_of("a b c", [new Tagged({ tokens: tokenize("a b c"), start: fine, verdicts: [fine, Verdict.Flag(), fine] })]);
    expect(issue?.replacements).toEqual([]);
    expect(issue?.start).toBe(2);
  });
});
