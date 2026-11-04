import { describe, expect, it } from "vitest";
import { checkable } from "../../src/dictionary/dictionary.ts";

describe("checkable", () => {
  it("checks ordinary words and a capitalised word that starts a sentence", () => {
    expect(checkable("goin", false)).toBe(true);
    expect(checkable("Helo", true)).toBe(true);
  });

  it("skips names mid-sentence, acronyms, mixed case, short words and non-words", () => {
    expect(checkable("Priya", false)).toBe(false);
    expect(checkable("NASA", true)).toBe(false);
    expect(checkable("iPhone", true)).toBe(false);
    expect(checkable("el", false)).toBe(false);
    expect(checkable("b2b", false)).toBe(false);
  });
});
