import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Tokenizer } from "@huggingface/tokenizers";
import { Data, Effect } from "effect";
import * as ort from "onnxruntime-node";
import { rewrite_edits } from "../edits/rewrite.ts";
import { Engine, EngineError } from "./engine.ts";

const end_token = 1;
const input_limit = 128;

class Model extends Data.Class<{
  readonly encoder: ort.InferenceSession;
  readonly decoder: ort.InferenceSession;
  readonly cached: ort.InferenceSession;
  readonly tokenizer: Tokenizer;
}> {}

const failure = (cause: unknown) => new EngineError({ engine: "t5", cause });

const run = (session: ort.InferenceSession, feeds: Record<string, ort.Tensor>) =>
  Effect.tryPromise({ try: () => session.run(feeds), catch: failure });

const ids_tensor = (ids: ReadonlyArray<number>) => new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]);

const argmax = (values: Float32Array): number =>
  values.reduce((best, value, index) => (value > (values[best] ?? -Infinity) ? index : best), 0);

const sentences = (text: string) =>
  Array.from(text.matchAll(/[^.!?\n]+(?:[.!?]+|(?=\n)|$)/g), (match) => {
    const content = match[0].trim();
    return { content, start: match.index + match[0].indexOf(content) };
  }).filter((sentence) => sentence.content !== "");

const generate = (model: Model, sentence: string) =>
  Effect.gen(function* () {
    const ids = model.tokenizer.encode(`gec: ${sentence}`).ids;
    if (ids.length > input_limit) return sentence;
    const input_ids = ids_tensor(ids);
    const mask = ids_tensor(ids.map(() => 1));
    const encoded = yield* run(model.encoder, { input_ids, attention_mask: mask });
    const fixed = { encoder_attention_mask: mask, encoder_hidden_states: encoded["last_hidden_state"]! };
    const limit = Math.min(160, Math.max(32, ids.length * 2 + 16));
    const generated: Array<number> = [];
    let cache: Record<string, ort.Tensor> = {};
    let next_input = ids_tensor([0]);
    for (let step = 0; step < limit; step++) {
      const output = yield* run(step === 0 ? model.decoder : model.cached, { ...fixed, ...cache, input_ids: next_input });
      const next = argmax(output["logits"]!.data as Float32Array);
      if (next === end_token) break;
      generated.push(next);
      cache = {
        ...cache,
        ...Object.fromEntries(
          Object.entries(output)
            .filter(([name]) => name.startsWith("present."))
            .map(([name, value]) => [name.replace("present.", "past_key_values."), value]),
        ),
      };
      next_input = ids_tensor([next]);
    }
    return model.tokenizer.decode(generated, { skip_special_tokens: true });
  });

export const t5_engine = (directory: string) =>
  Effect.gen(function* () {
    const read = (name: string) => Effect.tryPromise({ try: () => readFile(join(directory, name)), catch: failure });
    const session = (name: string) =>
      read(name).pipe(Effect.flatMap((data) => Effect.tryPromise({ try: () => ort.InferenceSession.create(data), catch: failure })));
    const [encoder, decoder, cached, tokenizer_json, tokenizer_config] = yield* Effect.all([
      session("encoder_model.onnx"),
      session("decoder_model.onnx"),
      session("decoder_with_past_model.onnx"),
      read("tokenizer.json"),
      read("tokenizer_config.json"),
    ]);
    const tokenizer = yield* Effect.try({
      try: () => new Tokenizer(JSON.parse(tokenizer_json.toString()), JSON.parse(tokenizer_config.toString())),
      catch: failure,
    });
    const model = new Model({ encoder, decoder, cached, tokenizer });
    return new Engine({
      name: "t5",
      check: (text) =>
        Effect.forEach(sentences(text), ({ content, start }) =>
          generate(model, content).pipe(Effect.map((corrected) => rewrite_edits(content, corrected, start))),
        ).pipe(Effect.map((groups) => groups.flat())),
    });
  });
