import { Tokenizer } from "@huggingface/tokenizers";
import { Data, Effect, Match, Schema } from "effect";
import * as ort from "onnxruntime-web/webgpu";
import type { Pickiness } from "../../settings/settings.ts";
import { issues_of } from "../../suggestions/from-tagger.ts";
import { Thresholds } from "../../tagger/labels.ts";
import { Probabilities, tag_text, vocabulary_of } from "../../tagger/tagger.ts";
import { Infer, to_wire, type Checked } from "../messages.ts";

class ModelError extends Data.TaggedError("ModelError")<{ readonly cause: unknown }> {}

ort.env.wasm.wasmPaths = chrome.runtime.getURL("ort/");
ort.env.wasm.numThreads = 1;

const fetch_from = (path: string) =>
  Effect.tryPromise({
    try: () => fetch(chrome.runtime.getURL(`model/${path}`)),
    catch: (cause) => new ModelError({ cause }),
  });

const as_text = (path: string) =>
  fetch_from(path).pipe(Effect.flatMap((response) => Effect.tryPromise({ try: () => response.text(), catch: (cause) => new ModelError({ cause }) })));

const as_bytes = (path: string) =>
  fetch_from(path).pipe(
    Effect.flatMap((response) => Effect.tryPromise({ try: () => response.arrayBuffer(), catch: (cause) => new ModelError({ cause }) })),
  );

const create_session = (model: ArrayBuffer) =>
  Effect.tryPromise({
    try: () => ort.InferenceSession.create(model, { executionProviders: ["webgpu"] }),
    catch: (cause) => new ModelError({ cause }),
  }).pipe(
    Effect.catch(() =>
      Effect.tryPromise({
        try: () => ort.InferenceSession.create(model, { executionProviders: ["wasm"] }),
        catch: (cause) => new ModelError({ cause }),
      }),
    ),
  );

const load = Effect.gen(function* () {
  const [model, tokenizer_json, tokenizer_config, labels] = yield* Effect.all(
    [as_bytes("model.onnx"), as_text("tokenizer.json"), as_text("tokenizer_config.json"), as_text("labels.txt")],
    { concurrency: "unbounded" },
  );
  const session = yield* create_session(model);
  const tokenizer = yield* Effect.try({
    try: () => new Tokenizer(JSON.parse(tokenizer_json), JSON.parse(tokenizer_config)),
    catch: (cause) => new ModelError({ cause }),
  });
  return { session, vocabulary: vocabulary_of(tokenizer, labels) };
});

const ids_tensor = (ids: ReadonlyArray<number>) => new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]);

const thresholds_for = (pickiness: Pickiness): Thresholds =>
  Match.value(pickiness).pipe(
    Match.when("relaxed", () => new Thresholds({ error: 0.8, label: 0 })),
    Match.when("balanced", () => new Thresholds({ error: 0.65, label: 0 })),
    Match.when("strict", () => new Thresholds({ error: 0.5, label: 0 })),
    Match.exhaustive,
  );

const check = (loaded: Effect.Effect<Effect.Success<typeof load>, ModelError>, request: typeof Infer.Type) =>
  Effect.gen(function* () {
    const { session, vocabulary } = yield* loaded;
    const run = (ids: ReadonlyArray<number>) =>
      Effect.tryPromise({
        try: () => session.run({ input_ids: ids_tensor(ids), attention_mask: ids_tensor(ids.map(() => 1)) }),
        catch: (cause) => new ModelError({ cause }),
      }).pipe(
        Effect.flatMap((output) =>
          Effect.tryPromise({
            try: async () =>
              new Probabilities({
                labels: (await output["label_probabilities"]!.getData()) as Float32Array,
                errors: (await output["error_probabilities"]!.getData()) as Float32Array,
              }),
            catch: (cause) => new ModelError({ cause }),
          }),
        ),
      );
    const tagged = yield* tag_text(vocabulary, run, thresholds_for(request.pickiness), request.text);
    return { issues: issues_of(request.text, tagged).map(to_wire) } satisfies Checked;
  });

const serve = Effect.gen(function* () {
  const loaded = yield* Effect.cached(load);
  yield* Effect.sync(() =>
    chrome.runtime.onMessage.addListener((message: unknown, _sender, respond: (response: Checked) => void) => {
      if (!Schema.is(Infer)(message)) return false;
      Effect.runFork(
        check(loaded, message).pipe(
          Effect.tapError((error) => Effect.logError("spellcheck model failed", error.cause)),
          Effect.orElseSucceed((): Checked => ({ issues: [] })),
          Effect.tap((checked) => Effect.sync(() => respond(checked))),
        ),
      );
      return true;
    }),
  );
});

Effect.runFork(serve);
