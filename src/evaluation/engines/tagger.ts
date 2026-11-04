import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Tokenizer } from "@huggingface/tokenizers";
import { Data, Effect } from "effect";
import * as ort from "onnxruntime-node";
import { Token, tokenize } from "../edits/tokens.ts";
import { Thresholds, decode_label, sentence_edits, verdict, type Label } from "../../tagger/labels.ts";
import { Engine, EngineError } from "./engine.ts";
import { sentences } from "./sentences.ts";

const start_marker = "$START";
const token_limit = 160;

class Model extends Data.Class<{
  readonly session: ort.InferenceSession;
  readonly tokenizer: Tokenizer;
  readonly labels: ReadonlyArray<Label>;
  readonly cls: number;
  readonly sep: number;
}> {}

class Input extends Data.Class<{
  readonly ids: ReadonlyArray<number>;
  readonly firsts: ReadonlyArray<number>;
}> {}

const failure = (cause: unknown) => new EngineError({ engine: "tagger", cause });

const encode_words = (model: Model, words: ReadonlyArray<string>): Input =>
  words.reduce(
    (input, word) => {
      const pieces = model.tokenizer.encode(` ${word}`, { add_special_tokens: false }).ids;
      return new Input({ ids: [...input.ids, ...pieces], firsts: [...input.firsts, input.ids.length] });
    },
    new Input({ ids: [model.cls], firsts: [] }),
  );

const ids_tensor = (ids: ReadonlyArray<number>) => new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]);

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

const check_sentence = (model: Model, thresholds: Thresholds, content: string, start: number) =>
  Effect.gen(function* () {
    const tokens = tokenize(content).map((token) => new Token({ ...token, start: token.start + start, end: token.end + start }));
    const input = encode_words(model, [start_marker, ...tokens.map((token) => token.text)]);
    if (input.ids.length + 1 > token_limit) return [];
    const ids = [...input.ids, model.sep];
    const output = yield* Effect.tryPromise({
      try: () => model.session.run({ input_ids: ids_tensor(ids), attention_mask: ids_tensor(ids.map(() => 1)) }),
      catch: failure,
    });
    const label_probabilities = output["label_probabilities"]!.data as Float32Array;
    const error_probabilities = output["error_probabilities"]!.data as Float32Array;
    const verdicts = input.firsts.map((position) => {
      const best = best_edit(label_probabilities, position * model.labels.length, model.labels.length);
      return verdict(error_probabilities[position] ?? 0, model.labels[best.index]!, best.confidence, thresholds);
    });
    return sentence_edits(tokens, verdicts[0]!, verdicts.slice(1));
  });

export const tagger_engine = (directory: string, thresholds: Thresholds) =>
  Effect.gen(function* () {
    const read = (name: string) => Effect.tryPromise({ try: () => readFile(join(directory, name)), catch: failure });
    const [model_data, tokenizer_json, tokenizer_config, labels_text] = yield* Effect.all([
      read("model.onnx"),
      read("tokenizer.json"),
      read("tokenizer_config.json"),
      read("labels.txt"),
    ]);
    const session = yield* Effect.tryPromise({ try: () => ort.InferenceSession.create(model_data), catch: failure });
    const tokenizer = yield* Effect.try({
      try: () => new Tokenizer(JSON.parse(tokenizer_json.toString()), JSON.parse(tokenizer_config.toString())),
      catch: failure,
    });
    const labels = labels_text.toString().split("\n").filter((line) => line !== "").map(decode_label);
    const model = new Model({ session, tokenizer, labels, cls: tokenizer.token_to_id("[CLS]") ?? 50281, sep: tokenizer.token_to_id("[SEP]") ?? 50282 });
    return new Engine({
      name: "tagger",
      check: (text) =>
        Effect.forEach(sentences(text), ({ content, start }) => check_sentence(model, thresholds, content, start)).pipe(
          Effect.map((groups) => groups.flat()),
        ),
    });
  });
