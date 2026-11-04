import { describe, expect, it } from "vitest";
import { parse_marked, unmark } from "../../../src/evaluation/corpus/marked.ts";
import { apply_edits, replace } from "../../../src/evaluation/edits/edit.ts";

describe("unmark", () => {
  it("turns inline marks into the written text plus edits", () => {
    const { text, edits } = unmark("I {form=>from} here, {=>the }end{ though=>}.");
    expect(text).toBe("I form here, end though.");
    expect(edits).toEqual([replace(2, 6, "from"), replace(13, 13, "the "), replace(16, 23, "")]);
    expect(apply_edits(text, edits)).toBe("I from here, the end.");
  });
});

describe("parse_marked", () => {
  it("splits documents on blank lines", () => {
    const documents = parse_marked("mine", "First {teh=>the} one.\nSame paragraph.\n\nSecond one.\n");
    expect(documents.map((document) => document.text)).toEqual(["First teh one.\nSame paragraph.", "Second one."]);
    expect(documents.map((document) => document.annotations[0]?.length)).toEqual([1, 0]);
  });
});
