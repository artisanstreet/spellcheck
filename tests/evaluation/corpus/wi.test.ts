import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { corrected, parse_wi } from "../../../src/evaluation/corpus/wi.ts";
import { Correction, Edit, replace } from "../../../src/evaluation/edits/edit.ts";

const line = JSON.stringify({ id: "1-1", userid: "7", cefr: "A2", text: "It difficult answer.", edits: [[0, [[2, 2, " is"], [12, 12, " to"], [3, 12, null]]]] });

describe("parse_wi", () => {
  it("decodes character edits, keeping missing corrections as unknown", () => {
    const [document] = Effect.runSync(parse_wi(`${line}\n\n`));
    expect(document?.annotations).toEqual([[replace(2, 2, " is"), replace(12, 12, " to"), new Edit({ start: 3, end: 12, correction: Correction.Unknown() })]]);
  });

  it("builds the corrected text from the first annotation", () => {
    const [document] = Effect.runSync(parse_wi(line));
    expect(document && corrected(document).text).toBe("It is difficult to answer.");
  });
});
