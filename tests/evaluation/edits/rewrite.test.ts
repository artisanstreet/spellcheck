import { describe, expect, it } from "vitest";
import { apply_edits, replace } from "../../../src/evaluation/edits/edit.ts";
import { rewrite_edits } from "../../../src/evaluation/edits/rewrite.ts";

describe("rewrite_edits", () => {
  it("recovers minimal edits from a rewritten sentence", () => {
    const original = "He go to school yesterday";
    const edits = rewrite_edits(original, "He went to school yesterday.");
    expect(edits).toEqual([replace(3, 5, "went"), replace(25, 25, ".")]);
    expect(apply_edits(original, edits)).toBe("He went to school yesterday.");
  });

  it("shifts edits by the sentence offset", () => {
    expect(rewrite_edits("teh cat", "the cat", 10)).toEqual([replace(10, 13, "the")]);
  });
});
