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
  readonly pad: number;
  readonly mask: number;
}> {}

export const vocabulary_of = (tokenizer: Tokenizer, labels_text: string): Vocabulary =>
  new Vocabulary({
    tokenizer,
    labels: labels_text.split(/\r?\n/).filter((line) => line !== "").map(decode_label),
    cls: tokenizer.token_to_id("[CLS]") ?? 50281,
    sep: tokenizer.token_to_id("[SEP]") ?? 50282,
    pad: tokenizer.token_to_id("[PAD]") ?? 50283,
    mask: tokenizer.token_to_id("[MASK]") ?? 50284,
  });

export class Probabilities extends Data.Class<{
  readonly labels: Float32Array;
  readonly errors: Float32Array;
}> {}

export type Run<E> = (rows: ReadonlyArray<ReadonlyArray<number>>) => Effect.Effect<ReadonlyArray<Probabilities>, E>;

export class Batch extends Data.Class<{
  readonly ids: BigInt64Array;
  readonly attention: BigInt64Array;
  readonly rows: number;
  readonly length: number;
}> {}

export const batch_of = (rows: ReadonlyArray<ReadonlyArray<number>>, pad: number): Batch => {
  const length = Math.max(...rows.map((row) => row.length));
  const padded = (values: ReadonlyArray<number>, filler: number) => [...values, ...Array<number>(length - values.length).fill(filler)];
  return new Batch({
    ids: BigInt64Array.from(rows.flatMap((row) => padded(row, pad)), BigInt),
    attention: BigInt64Array.from(rows.flatMap((row) => padded(row.map(() => 1), 0)), BigInt),
    rows: rows.length,
    length,
  });
};

export const split_outputs = (batch: Batch, labels: Float32Array, errors: Float32Array): ReadonlyArray<Probabilities> => {
  const size = labels.length / (batch.rows * batch.length);
  return Array.from(
    { length: batch.rows },
    (_, row) =>
      new Probabilities({
        labels: labels.subarray(row * batch.length * size, (row + 1) * batch.length * size),
        errors: errors.subarray(row * batch.length, (row + 1) * batch.length),
      }),
  );
};

export class Tagged extends Data.Class<{
  readonly tokens: ReadonlyArray<Token>;
  readonly start: Verdict;
  readonly verdicts: ReadonlyArray<Verdict>;
}> {}

export class Input extends Data.Class<{
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

export const encode_sentence = (vocabulary: Vocabulary, tokens: ReadonlyArray<Token>): Option.Option<Input> => {
  const input = encode_words(vocabulary, [start_marker, ...tokens.map((token) => token.text)]);
  return tokens.length === 0 || input.ids.length + 1 > token_limit
    ? Option.none()
    : Option.some(new Input({ ids: [...input.ids, vocabulary.sep], firsts: input.firsts }));
};

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
    const input = encode_sentence(vocabulary, tokens);
    if (Option.isNone(input)) return Option.none<Inferred>();
    const [probabilities] = yield* run([input.value.ids]);
    return Option.some(new Inferred({ tokens, probabilities: probabilities!, firsts: input.value.firsts }));
  });

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

export const memoized = <E>(run: Run<E>, capacity: number): Run<E> => {
  const cache = new Map<string, Probabilities>();
  const key = (row: ReadonlyArray<number>) => row.join(",");
  return (rows) => {
    const missing = [...new Map(rows.filter((row) => !cache.has(key(row))).map((row) => [key(row), row])).values()];
    return (missing.length === 0 ? Effect.succeed([]) : run(missing)).pipe(
      Effect.map((found) => {
        found.forEach((probabilities, index) => cache.set(key(missing[index]!), probabilities));
        [...cache.keys()].slice(0, Math.max(0, cache.size - capacity)).forEach((stale) => cache.delete(stale));
        return rows.map((row) => cache.get(key(row))!);
      }),
    );
  };
};
