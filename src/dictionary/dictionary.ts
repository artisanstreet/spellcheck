import nspell from "nspell";
import { Data, Effect } from "effect";
import type { Token } from "../evaluation/edits/tokens.ts";

export class DictionaryError extends Data.TaggedError("DictionaryError")<{ readonly cause: unknown }> {}

export class Source extends Data.Class<{ readonly aff: string; readonly dic: string }> {}

export class Dictionary extends Data.Class<{
  readonly known: (word: string) => boolean;
  readonly suggest: (word: string) => ReadonlyArray<string>;
}> {}

export class Misspelling extends Data.Class<{
  readonly token: Token;
  readonly candidates: ReadonlyArray<string>;
}> {}

const candidate_limit = 6;

export const dictionary_of = (sources: ReadonlyArray<Source>) =>
  Effect.try({
    try: () => sources.map((source) => nspell({ aff: source.aff, dic: source.dic })),
    catch: (cause) => new DictionaryError({ cause }),
  }).pipe(
    Effect.map(
      (spellers) =>
        new Dictionary({
          known: (word) => spellers.some((speller) => speller.correct(word) || speller.correct(`${word}'t`)),
          suggest: (word) => [...new Set(spellers.flatMap((speller) => speller.suggest(word)))].slice(0, candidate_limit),
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
