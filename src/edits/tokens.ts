import { Data } from "effect";

export class Token extends Data.Class<{
  readonly text: string;
  readonly start: number;
  readonly end: number;
}> {}

const token_pattern = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*|\S/gu;

export const tokenize = (text: string): ReadonlyArray<Token> =>
  Array.from(
    text.matchAll(token_pattern),
    (match) => new Token({ text: match[0].replaceAll("’", "'"), start: match.index, end: match.index + match[0].length }),
  );

export const count_words = (text: string): number => tokenize(text).filter((token) => /\p{L}/u.test(token.text)).length;
