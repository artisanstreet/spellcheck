import { describe, expect, it } from "vitest";
import { apply_edits } from "../../src/evaluation/edits/edit.ts";
import { tokenize } from "../../src/evaluation/edits/tokens.ts";
import { Label, Thresholds, Verdict, decode_label, sentence_edits, verdict } from "../../src/tagger/labels.ts";

const fix = (value: string) => Verdict.Fix({ label: decode_label(value) });

const corrected = (text: string, start: Verdict, verdicts: ReadonlyArray<Verdict>) =>
  apply_edits(text, sentence_edits(tokenize(text), start, verdicts));

describe("decode_label", () => {
  it("keeps the text of replacements and appends, including underscores", () => {
    expect(decode_label("REPLACE_goes")).toEqual(Label.Replace({ text: "goes" }));
    expect(decode_label("APPEND_snake_case")).toEqual(Label.Append({ text: "snake_case" }));
    expect(decode_label("CASE_LOWER")).toEqual(Label.CaseLower());
  });
});

describe("verdict", () => {
  const thresholds = new Thresholds({ error: 0.5, label: 0.4, delete: 0.5 });

  it("leaves words alone below the error threshold", () => {
    expect(verdict(0.3, Label.Delete(), 0.9, thresholds)).toEqual(Verdict.Fine());
  });

  it("needs a stronger error signal before suggesting a deletion", () => {
    const strict = new Thresholds({ error: 0.5, label: 0, delete: 0.9 });
    expect(verdict(0.8, Label.Delete(), 0.9, strict)).toEqual(Verdict.Fine());
    expect(verdict(0.95, Label.Delete(), 0.9, strict)).toEqual(Verdict.Fix({ label: Label.Delete() }));
    expect(verdict(0.8, Label.Replace({ text: "is" }), 0.9, strict)).toEqual(Verdict.Fix({ label: Label.Replace({ text: "is" }) }));
  });

  it("flags errors it cannot confidently fix", () => {
    expect(verdict(0.8, Label.Delete(), 0.2, thresholds)).toEqual(Verdict.Flag());
    expect(verdict(0.8, Label.Keep(), 0.9, thresholds)).toEqual(Verdict.Flag());
  });

  it("fixes confident errors", () => {
    expect(verdict(0.8, Label.Delete(), 0.9, thresholds)).toEqual(Verdict.Fix({ label: Label.Delete() }));
  });
});

describe("sentence_edits", () => {
  const fine = Verdict.Fine();

  it("applies replacements, appends and case changes in place", () => {
    expect(corrected("she go to school", fine, [fix("CASE_CAPITAL"), fix("REPLACE_goes"), fine, fix("APPEND_.")])).toBe(
      "She goes to school .",
    );
  });

  it("inserts words before the first word from the start marker", () => {
    expect(corrected("think it is bad.", fix("APPEND_I"), [fine, fine, fine, fine, fine])).toBe("I think it is bad.");
  });

  it("marks flagged words without a correction", () => {
    const [edit] = sentence_edits(tokenize("I recieved it"), fine, [fine, Verdict.Flag(), fine]);
    expect(edit).toMatchObject({ start: 2, end: 10 });
    expect(edit?.correction._tag).toBe("Unknown");
  });
});
