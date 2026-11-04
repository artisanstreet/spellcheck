import nspell from "nspell";
import { Data, Effect } from "effect";
import type { Token } from "../evaluation/edits/tokens.ts";
import { slang } from "./slang.ts";

export class DictionaryError extends Data.TaggedError("DictionaryError")<{ readonly cause: unknown }> {}

export class Source extends Data.Class<{ readonly aff: string; readonly dic: string }> {}

export class Dictionary extends Data.Class<{
  readonly known: (word: string) => boolean;
  readonly suggest: (word: string) => ReadonlyArray<string>;
  readonly commonness: (word: string) => number;
}> {}

export class Misspelling extends Data.Class<{
  readonly token: Token;
  readonly candidates: ReadonlyArray<string>;
}> {}

const candidate_limit = 6;

export const frequencies_of = (text: string): ReadonlyMap<string, number> =>
  new Map(
    text.split(/\r?\n/).flatMap((line) => {
      const [word, count] = line.split("\t");
      return word && count && Number.isFinite(Number(count)) ? [[word, Number(count)] as const] : [];
    }),
  );

const commonness_in = (frequencies: ReadonlyMap<string, number>) => {
  const scale = Math.log1p(Math.max(1, ...frequencies.values()));
  return (word: string) =>
    word
      .toLowerCase()
      .split(" ")
      .reduce((least, part) => Math.min(least, Math.log1p(frequencies.get(part) ?? 0) / scale), 1);
};

export const dictionary_of = (sources: ReadonlyArray<Source>, frequencies: ReadonlyMap<string, number>) =>
  Effect.try({
    try: () => sources.map((source) => nspell({ aff: source.aff, dic: source.dic })),
    catch: (cause) => new DictionaryError({ cause }),
  }).pipe(
    Effect.map(
      (spellers) =>
        new Dictionary({
          known: (word) =>
            slang.has(word.toLowerCase()) || spellers.some((speller) => speller.correct(word) || speller.correct(`${word}'t`)),
          suggest: (word) => [...new Set(spellers.flatMap((speller) => speller.suggest(word)))].slice(0, candidate_limit),
          commonness: commonness_in(frequencies),
        }),
    ),
  );

const word_pattern = /^\p{L}+(?:'\p{L}+)*$/u;
const capitalised = /^\p{Lu}/u;
const inner_capital = /\p{Ll}\p{Lu}/u;

export const checkable = (word: string, sentence_start: boolean): boolean =>
  word_pattern.test(word) &&
  word.length > 2 &&
  word !== word.toUpperCase() &&
  !inner_capital.test(word) &&
  (sentence_start || !capitalised.test(word));

export const misspellings_of = (dictionary: Dictionary, tokens: ReadonlyArray<Token>): ReadonlyArray<Misspelling> =>
  tokens
    .filter((token, index) => checkable(token.text, index === 0) && !dictionary.known(token.text))
    .map((token) => new Misspelling({ token, candidates: dictionary.suggest(token.text) }))
    .filter((misspelling) => misspelling.candidates.length > 0);
