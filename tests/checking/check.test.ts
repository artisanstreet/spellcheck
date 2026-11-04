import { describe, expect, it } from "vitest";
import { Substitution, restore, substitute } from "../../src/checking/check.ts";
import { tokenize } from "../../src/evaluation/edits/tokens.ts";
import { Label, Verdict } from "../../src/tagger/labels.ts";
import { Tagged } from "../../src/tagger/tagger.ts";

const original = "helo was goin on";
const substitutions = [new Substitution({ start: 9, end: 13, text: "going" }), new Substitution({ start: 0, end: 4, text: "hello" })];
const corrected = substitute(original, substitutions);

describe("substitute", () => {
  it("applies substitutions in any order", () => {
    expect(corrected).toBe("hello was going on");
  });
});

describe("restore", () => {
  it("moves verdicts on the corrected text back to the original words and clears substituted ones", () => {
    const fix = Verdict.Fix({ label: Label.Replace({ text: "is" }) });
    const tagged = new Tagged({
      tokens: tokenize(corrected),
      start: Verdict.Fine(),
      verdicts: [Verdict.Flag(), fix, Verdict.Flag(), Verdict.Fine()],
    });
    const restored = restore(tokenize(original), tagged, substitutions);
    expect(restored.tokens.map((token) => token.text)).toEqual(["helo", "was", "goin", "on"]);
    expect(restored.verdicts).toEqual([Verdict.Fine(), fix, Verdict.Fine(), Verdict.Fine()]);
  });

  it("handles substitutions that split into several words", () => {
    const text = "I have alot of time";
    const split = [new Substitution({ start: 7, end: 11, text: "a lot" })];
    const tagged = new Tagged({
      tokens: tokenize(substitute(text, split)),
      start: Verdict.Fine(),
      verdicts: [Verdict.Fine(), Verdict.Fine(), Verdict.Flag(), Verdict.Flag(), Verdict.Fine(), Verdict.Flag()],
    });
    expect(restore(tokenize(text), tagged, split).verdicts).toEqual([Verdict.Fine(), Verdict.Fine(), Verdict.Fine(), Verdict.Fine(), Verdict.Flag()]);
  });
});
