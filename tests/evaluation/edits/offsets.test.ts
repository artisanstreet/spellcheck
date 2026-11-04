import { describe, expect, it } from "vitest";
import { code_point_offsets } from "../../../src/evaluation/edits/offsets.ts";

describe("code_point_offsets", () => {
  it("maps code point indices to string indices across surrogate pairs", () => {
    const text = "a😀b";
    const offsets = code_point_offsets(text);
    expect(offsets).toEqual([0, 1, 3, 4]);
    expect(text.slice(offsets[2], offsets[3])).toBe("b");
  });
});
