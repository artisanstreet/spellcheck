import { describe, expect, it } from "vitest";
import { canonicalize_all, correction_key } from "../../../src/evaluation/edits/canonical.ts";
import { Correction, Edit, replace } from "../../../src/evaluation/edits/edit.ts";

const keys = (text: string, edits: ReadonlyArray<Edit>) => canonicalize_all(text, edits).map(correction_key);

describe("canonicalize_all", () => {
  it("maps deletions that differ only in surrounding whitespace to the same edit", () => {
    const text = "I saw the dog";
    expect(keys(text, [replace(6, 10, "")])).toEqual(["2:3:"]);
    expect(keys(text, [replace(5, 9, "")])).toEqual(["2:3:"]);
  });

  it("maps insertions on either side of a space to the same position", () => {
    const text = "I have dog";
    expect(keys(text, [replace(7, 7, "a ")])).toEqual(["2:2:a"]);
    expect(keys(text, [replace(6, 6, " a")])).toEqual(["2:2:a"]);
  });

  it("strips words shared by the original and the replacement", () => {
    expect(keys("I go to school", [replace(2, 7, "went to")])).toEqual(["1:2:went"]);
  });

  it("expands edits inside a word to the whole word", () => {
    expect(keys("I dont know", [replace(5, 5, "'")])).toEqual(["1:2:don't"]);
  });

  it("drops edits that change nothing but whitespace", () => {
    expect(keys("home.In my view", [replace(5, 5, " ")])).toEqual([]);
  });

  it("keeps edits with unknown corrections as spans", () => {
    expect(keys("a b c", [new Edit({ start: 2, end: 3, correction: Correction.Unknown() })])).toEqual(["1:2:?"]);
  });
});
