import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Probabilities, batch_of, memoized, split_outputs } from "../../src/tagger/tagger.ts";

describe("batch_of and split_outputs", () => {
  it("pads rows to a rectangle and slices outputs back per row", () => {
    const batch = batch_of([[1, 2, 3], [4]], 0);
    expect([batch.rows, batch.length]).toEqual([2, 3]);
    expect(Array.from(batch.ids, Number)).toEqual([1, 2, 3, 4, 0, 0]);
    expect(Array.from(batch.attention, Number)).toEqual([1, 1, 1, 1, 0, 0]);
    const split = split_outputs(batch, new Float32Array(12).map((_, index) => index), new Float32Array([1, 2, 3, 4, 5, 6]));
    expect(Array.from(split[1]!.labels)).toEqual([6, 7, 8, 9, 10, 11]);
    expect(Array.from(split[1]!.errors)).toEqual([4, 5, 6]);
  });
});

describe("memoized", () => {
  it("only sends rows it has not seen before", async () => {
    const seen: Array<number> = [];
    const run = memoized((rows: ReadonlyArray<ReadonlyArray<number>>) => {
      seen.push(rows.length);
      return Effect.succeed(rows.map((row) => new Probabilities({ labels: new Float32Array(), errors: new Float32Array([row[0]!]) })));
    }, 10);
    await Effect.runPromise(run([[1], [2]]));
    const again = await Effect.runPromise(run([[2], [3], [3]]));
    expect(seen).toEqual([2, 1]);
    expect(again.map((item) => item.errors[0])).toEqual([2, 3, 3]);
  });
});
