import nspell from "nspell";
import { Data, Effect, Option } from "effect";
import type { Token } from "../evaluation/edits/tokens.ts";
import { slang } from "./slang.ts";
import { typo_cost } from "./typo.ts";

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
const nearby_cost = 1.2;
const completion_cost = 2;
const short_word = 3;
const lexicon_size = 60_000;

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

const matching_case = (typed: string, word: string) =>
  /^\p{Lu}/u.test(typed) ? word.slice(0, 1).toUpperCase() + word.slice(1) : word;

export type Lexicon = ReadonlyMap<string, ReadonlyArray<string>>;

export const lexicon_of = (words: ReadonlyArray<string>): Lexicon =>
  words.reduce((lexicon, word) => {
    const initial = word[0]!.toLowerCase();
    return lexicon.set(initial, [...(lexicon.get(initial) ?? []), word]);
  }, new Map<string, Array<string>>());

const contains_in_order = (letters: string, word: string): boolean =>
  Array.from(letters).reduce((position, letter) => (position < 0 ? position : word.indexOf(letter, position) + 1 || -1), 0) > 0;

export const nearby_words = (lexicon: Lexicon, commonness: (word: string) => number, typed: string): ReadonlyArray<string> => {
  const lower = typed.toLowerCase();
  const reachable = (word: string, cost: number) =>
    cost <= nearby_cost || (cost <= completion_cost && (lower.length > short_word || contains_in_order(lower, word.toLowerCase())));
  const initials = new Set([lower[0], lower[1]].filter((letter) => letter !== undefined));
  return [...initials]
    .flatMap((letter) => lexicon.get(letter) ?? [])
    .filter((word) => Math.abs(word.length - lower.length) <= 2 && word.toLowerCase() !== lower)
    .map((word) => ({ word, cost: typo_cost(lower, word) }))
    .filter((entry) => reachable(entry.word, entry.cost))
    .map((entry) => ({ word: entry.word, score: entry.cost - 0.5 * commonness(entry.word) }))
    .toSorted((left, right) => left.score - right.score)
    .map((entry) => matching_case(typed, entry.word));
};

export const dictionary_of = (sources: ReadonlyArray<Source>, frequencies: ReadonlyMap<string, number>) =>
  Effect.try({
    try: () => sources.map((source) => nspell({ aff: source.aff, dic: source.dic })),
    catch: (cause) => new DictionaryError({ cause }),
  }).pipe(
    Effect.map((spellers) => {
      const correct = (word: string) => spellers.some((speller) => speller.correct(word));
      const commonness = commonness_in(frequencies);
      const proper = (word: string) => [word, word.slice(0, 1).toUpperCase() + word.slice(1)].find(correct);
      const lexicon = lexicon_of([...frequencies.keys()].slice(0, lexicon_size).flatMap((word) => Option.toArray(Option.fromNullishOr(proper(word)))));
      return new Dictionary({
        known: (word) => slang.has(word.toLowerCase()) || correct(word) || correct(`${word}'t`),
        suggest: (word) =>
          [...new Set([...nearby_words(lexicon, commonness, word).slice(0, candidate_limit), ...spellers.flatMap((speller) => speller.suggest(word))])].slice(
            0,
            candidate_limit + 2,
          ),
        commonness,
      });
    }),
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
