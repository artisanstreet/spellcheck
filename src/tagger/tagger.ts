import type { Tokenizer } from "@huggingface/tokenizers";
import { Data, Effect, Option } from "effect";
import { Token, tokenize } from "../evaluation/edits/tokens.ts";
import { sentences } from "../evaluation/engines/sentences.ts";
import { Thresholds, decode_label, verdict, type Label, type Verdict } from "./labels.ts";

const start_marker = "$START";
const token_limit = 160;

export class Vocabulary extends Data.Class<{
  readonly tokenizer: Tokenizer;
  readonly labels: ReadonlyArray<Label>;
  readonly cls: number;
  readonly sep: number;
}> {}

export const vocabulary_of = (tokenizer: Tokenizer, labels_text: string): Vocabulary =>
  new Vocabulary({
    tokenizer,
    labels: labels_text.split(/\r?\n/).filter((line) => line !== "").map(decode_label),
    cls: tokenizer.token_to_id("[CLS]") ?? 50281,
    sep: tokenizer.token_to_id("[SEP]") ?? 50282,
  });

export class Probabilities extends Data.Class<{
  readonly labels: Float32Array;
  readonly errors: Float32Array;
}> {}

export type Run<E> = (ids: ReadonlyArray<number>) => Effect.Effect<Probabilities, E>;

export class Tagged extends Data.Class<{
  readonly tokens: ReadonlyArray<Token>;
  readonly start: Verdict;
  readonly verdicts: ReadonlyArray<Verdict>;
}> {}

class Input extends Data.Class<{
  readonly ids: ReadonlyArray<number>;
  readonly firsts: ReadonlyArray<number>;
}> {}

const encode_words = (vocabulary: Vocabulary, words: ReadonlyArray<string>): Input =>
  words.reduce(
    (input, word) => {
      const pieces = vocabulary.tokenizer.encode(` ${word}`, { add_special_tokens: false }).ids;
      return new Input({ ids: [...input.ids, ...pieces], firsts: [...input.firsts, input.ids.length] });
    },
    new Input({ ids: [vocabulary.cls], firsts: [] }),
  );

const best_edit = (probabilities: Float32Array, offset: number, size: number) => {
  const edit_mass = Math.max(1e-9, 1 - (probabilities[offset] ?? 0));
  return Array.from({ length: size - 1 }, (_, index) => index + 1).reduce(
    (best, index) => {
      const confidence = (probabilities[offset + index] ?? 0) / edit_mass;
      return confidence > best.confidence ? { index, confidence } : best;
    },
    { index: 0, confidence: 0 },
  );
};

export class Inferred extends Data.Class<{
  readonly tokens: ReadonlyArray<Token>;
  readonly probabilities: Probabilities;
  readonly firsts: ReadonlyArray<number>;
}> {}

export const infer_sentence = <E>(vocabulary: Vocabulary, run: Run<E>, content: string, start: number) =>
  Effect.gen(function* () {
    const tokens = tokenize(content).map((token) => new Token({ ...token, start: token.start + start, end: token.end + start }));
    const input = encode_words(vocabulary, [start_marker, ...tokens.map((token) => token.text)]);
    if (tokens.length === 0 || input.ids.length + 1 > token_limit) return Option.none<Inferred>();
    const probabilities = yield* run([...input.ids, vocabulary.sep]);
    return Option.some(new Inferred({ tokens, probabilities, firsts: input.firsts }));
  });

export const word_errors = (inferred: Inferred): ReadonlyArray<number> =>
  inferred.firsts.slice(1).map((position) => inferred.probabilities.errors[position] ?? 0);

const tagged_of = (vocabulary: Vocabulary, thresholds: Thresholds, inferred: Inferred): Tagged => {
  const size = vocabulary.labels.length;
  const verdicts = inferred.firsts.map((position) => {
    const best = best_edit(inferred.probabilities.labels, position * size, size);
    return verdict(inferred.probabilities.errors[position] ?? 0, vocabulary.labels[best.index]!, best.confidence, thresholds);
  });
  return new Tagged({ tokens: inferred.tokens, start: verdicts[0]!, verdicts: verdicts.slice(1) });
};

export const tag_sentence = <E>(vocabulary: Vocabulary, run: Run<E>, thresholds: Thresholds, content: string, start: number) =>
  infer_sentence(vocabulary, run, content, start).pipe(Effect.map(Option.map((inferred) => tagged_of(vocabulary, thresholds, inferred))));

export const tag_text = <E>(vocabulary: Vocabulary, run: Run<E>, thresholds: Thresholds, text: string) =>
  Effect.forEach(sentences(text), ({ content, start }) => tag_sentence(vocabulary, run, thresholds, content, start)).pipe(
    Effect.map((tagged) => tagged.flatMap(Option.toArray)),
  );
