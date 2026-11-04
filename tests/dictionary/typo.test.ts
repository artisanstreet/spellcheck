import { describe, expect, it } from "vitest";
import { typo_cost } from "../../src/dictionary/typo.ts";

describe("typo_cost", () => {
  it("is cheapest for a dropped double letter", () => {
    expect(typo_cost("helo", "hello")).toBeLessThan(typo_cost("helo", "help"));
    expect(typo_cost("helo", "hello")).toBeLessThan(typo_cost("helo", "halo"));
  });

  it("charges less for swapped letters, neighbouring keys and vowel mix-ups than for unrelated letters", () => {
    expect(typo_cost("teh", "the")).toBeCloseTo(0.6);
    expect(typo_cost("thw", "the")).toBeCloseTo(0.6);
    expect(typo_cost("definately", "definitely")).toBeCloseTo(0.6);
    expect(typo_cost("thz", "the")).toBe(1);
  });

  it("ignores case", () => {
    expect(typo_cost("Tusday", "tuesday")).toBe(typo_cost("tusday", "tuesday"));
  });
});
