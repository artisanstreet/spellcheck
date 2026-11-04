import { Array as Arr } from "effect";

export const code_point_offsets = (text: string): ReadonlyArray<number> =>
  Arr.scan(Array.from(text), 0, (offset, character) => offset + character.length);
