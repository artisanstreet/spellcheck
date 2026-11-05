import { describe, expect, it } from "vitest";
import { inflections_of } from "../../src/dictionary/morphology.ts";

describe("inflections_of", () => {
  it("offers the irregular form for an over-regularised word", () => {
    expect(inflections_of("buyed")).toContain("bought");
    expect(inflections_of("Womans")).toContain("women");
  });

  it("repairs regular plurals and past tenses", () => {
    expect(inflections_of("boxs")).toContain("boxes");
    expect(inflections_of("batterys")).toContain("batteries");
    expect(inflections_of("shelfs")).toContain("shelves");
    expect(inflections_of("stoped")).toContain("stopped");
    expect(inflections_of("tryed")).toContain("tried");
  });

  it("offers nothing for a word no rule covers", () => {
    expect(inflections_of("table")).toEqual([]);
  });
});
