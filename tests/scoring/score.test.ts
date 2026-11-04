import { describe, expect, it } from "vitest";
import { canonicalize_all } from "../../src/edits/canonical.ts";
import { Correction, Edit, replace } from "../../src/edits/edit.ts";
import { compare, compare_best, Counts, metrics } from "../../src/scoring/score.ts";

const text = "Their going too the store";
const gold = canonicalize_all(text, [replace(0, 5, "They're"), replace(12, 15, "to")]);

describe("compare", () => {
  it("counts exact corrections and span detections separately", () => {
    const hypothesis = canonicalize_all(text, [replace(0, 5, "There"), replace(12, 15, "to"), replace(20, 25, "shop")]);
    const result = compare(gold, hypothesis);
    expect(result.correction).toEqual(new Counts({ tp: 1, fp: 2, fn: 1 }));
    expect(result.detection).toEqual(new Counts({ tp: 2, fp: 1, fn: 0 }));
  });

  it("ignores hypotheses on spans whose gold correction is unknown", () => {
    const unknown = canonicalize_all(text, [new Edit({ start: 6, end: 11, correction: Correction.Unknown() })]);
    const result = compare(unknown, canonicalize_all(text, [replace(6, 11, "went")]));
    expect(result.correction).toEqual(new Counts({ tp: 0, fp: 0, fn: 0 }));
    expect(result.detection).toEqual(new Counts({ tp: 1, fp: 0, fn: 0 }));
  });

  it("treats every flag on clean text as a false positive", () => {
    expect(compare_best([], canonicalize_all(text, [replace(20, 25, "shop")])).correction).toEqual(new Counts({ tp: 0, fp: 1, fn: 0 }));
  });

  it("scores against the annotator that fits best", () => {
    const other = canonicalize_all(text, [replace(0, 5, "There")]);
    const hypothesis = canonicalize_all(text, [replace(0, 5, "There")]);
    expect(compare_best([gold, other], hypothesis).correction).toEqual(new Counts({ tp: 1, fp: 0, fn: 0 }));
  });
});

describe("metrics", () => {
  it("weights precision twice as much as recall", () => {
    const result = metrics(new Counts({ tp: 1, fp: 0, fn: 3 }));
    expect(result.precision).toBe(1);
    expect(result.recall).toBe(0.25);
    expect(result.f05).toBeCloseTo(0.625);
  });
});
