import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Tokenizer } from "@huggingface/tokenizers";
import { Effect } from "effect";
import * as ort from "onnxruntime-node";
import { Thresholds, sentence_edits } from "../../tagger/labels.ts";
import { batch_of, split_outputs, tag_text, vocabulary_of } from "../../tagger/tagger.ts";
import { Engine, EngineError } from "./engine.ts";

const failure = (cause: unknown) => new EngineError({ engine: "tagger", cause });

export const load_tagger = (directory: string) =>
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
    const vocabulary = vocabulary_of(tokenizer, labels_text.toString());
    const run = (rows: ReadonlyArray<ReadonlyArray<number>>) => {
      const batch = batch_of(rows, vocabulary.pad);
      return Effect.tryPromise({
        try: () =>
          session.run({
            input_ids: new ort.Tensor("int64", batch.ids, [batch.rows, batch.length]),
            attention_mask: new ort.Tensor("int64", batch.attention, [batch.rows, batch.length]),
          }),
        catch: failure,
      }).pipe(
        Effect.map((output) =>
          split_outputs(
            batch,
            output["label_probabilities"]!.data as Float32Array,
            output["error_probabilities"]!.data as Float32Array,
          ),
        ),
      );
    };
    return { vocabulary, run };
  });

export const tagger_engine = (directory: string, thresholds: Thresholds) =>
  Effect.gen(function* () {
    const { vocabulary, run } = yield* load_tagger(directory);
    return new Engine({
      name: "tagger",
      check: (text) =>
        tag_text(vocabulary, run, thresholds, text).pipe(
          Effect.map((tagged) => tagged.flatMap((sentence) => sentence_edits(sentence.tokens, sentence.start, sentence.verdicts))),
        ),
    });
  });
