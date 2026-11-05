import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { Dictionary, checkable, lexicon_of, nearby_words, with_words } from "../../src/dictionary/dictionary.ts";

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

  it("skips words with letters English doesn't use, like foreign names", () => {
    expect(checkable("María", true)).toBe(false);
    expect(checkable("joão", false)).toBe(false);
  });
});

describe("nearby_words", () => {
  const lexicon = lexicon_of(["the", "then", "tea", "hello", "help", "halo", "shoes", "should"]);
  const commonness = (word: string) => (word === "the" ? 1 : 0.5);

  it("finds likely intended words, including swapped first letters, cheapest first", () => {
    expect(nearby_words(lexicon, commonness, "teh")[0]).toBe("the");
    expect(nearby_words(lexicon, commonness, "helo")[0]).toBe("hello");
  });

  it("completes short words by adding letters but never swaps theirs", () => {
    const short = lexicon_of(["hello", "hell", "gel", "he"]);
    expect(nearby_words(short, () => 0.5, "hel")).toEqual(expect.arrayContaining(["hello", "hell"]));
    expect(nearby_words(short, () => 0.5, "hel")).not.toContain("gel");
  });

  it("keeps words whose proper form is capitalised", () => {
    expect(nearby_words(lexicon_of(["I've", "ice"]), () => 0.5, "Ive")).toContain("I've");
  });

  it("matches a capital at the start of the typed word", () => {
    expect(nearby_words(lexicon, commonness, "Teh")[0]).toBe("The");
  });
});

describe("with_words", () => {
  const base = new Dictionary({ known: (word) => word === "cat", suggest: () => [], commonness: () => 0, certain: () => Option.none(), cost: () => 0 });

  it("knows the person's own words in any case and keeps the dictionary's", () => {
    const own = with_words(base, ["Artisan"]);
    expect(["artisan", "ARTISAN", "Artisan", "cat"].map(own.known)).toEqual([true, true, true, true]);
    expect(own.known("dog")).toBe(false);
  });
});
