import { Tokenizer } from "@huggingface/tokenizers";
import { Data, Effect, Match, Schema } from "effect";
import * as ort from "onnxruntime-web/webgpu";
import type { Pickiness } from "../../settings/settings.ts";
import { Gate, check_text } from "../../checking/check.ts";
import { Source, dictionary_of, frequencies_of, with_words } from "../../dictionary/dictionary.ts";
import { checked_issues } from "../../suggestions/from-checked.ts";
import { Thresholds } from "../../tagger/labels.ts";
import { batch_of, memoized, split_outputs, vocabulary_of } from "../../tagger/tagger.ts";
import { Infer, to_wire, type Checked } from "../messages.ts";

class ModelError extends Data.TaggedError("ModelError")<{ readonly cause: unknown }> {}

ort.env.wasm.wasmPaths = chrome.runtime.getURL("ort/");
ort.env.wasm.numThreads = 1;

const fetch_from = (path: string) =>
  Effect.tryPromise({
    try: () => fetch(chrome.runtime.getURL(path)),
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

const cached_rows = 2000;

const load = Effect.gen(function* () {
  const [model, tokenizer_json, tokenizer_config, labels] = yield* Effect.all(
    [as_bytes("model/model.onnx"), as_text("model/tokenizer.json"), as_text("model/tokenizer_config.json"), as_text("model/labels.txt")],
    { concurrency: "unbounded" },
  );
  const sources = yield* Effect.forEach(
    ["en-us", "en-gb"],
    (name) =>
      Effect.all([as_text(`dictionary/${name}.aff`), as_text(`dictionary/${name}.dic`)]).pipe(
        Effect.map(([aff, dic]) => new Source({ aff, dic })),
      ),
    { concurrency: "unbounded" },
  );
  const frequencies = frequencies_of(yield* as_text("dictionary/frequencies.txt"));
  const dictionary = yield* dictionary_of(sources, frequencies).pipe(Effect.mapError((error) => new ModelError({ cause: error.cause })));
  const session = yield* create_session(model);
  const tokenizer = yield* Effect.try({
    try: () => new Tokenizer(JSON.parse(tokenizer_json), JSON.parse(tokenizer_config)),
    catch: (cause) => new ModelError({ cause }),
  });
  const vocabulary = vocabulary_of(tokenizer, labels);
  const run = (rows: ReadonlyArray<ReadonlyArray<number>>) => {
    const batch = batch_of(rows, vocabulary.pad);
    return Effect.tryPromise({
      try: async () => {
        const output = await session.run({
          input_ids: new ort.Tensor("int64", batch.ids, [batch.rows, batch.length]),
          attention_mask: new ort.Tensor("int64", batch.attention, [batch.rows, batch.length]),
        });
        return split_outputs(
          batch,
          (await output["label_probabilities"]!.getData()) as Float32Array,
          (await output["error_probabilities"]!.getData()) as Float32Array,
        );
      },
      catch: (cause) => new ModelError({ cause }),
    });
  };
  return { dictionary, vocabulary, run: memoized(run, cached_rows) };
});

const thresholds_for = (pickiness: Pickiness): Thresholds =>
  Match.value(pickiness).pipe(
    Match.when("relaxed", () => new Thresholds({ error: 0.8, label: 0, delete: 0.97 })),
    Match.when("balanced", () => new Thresholds({ error: 0.65, label: 0, delete: 0.95 })),
    Match.when("strict", () => new Thresholds({ error: 0.5, label: 0, delete: 0.9 })),
    Match.exhaustive,
  );

const spelling_gate = new Gate({ margin: 0.1, commonness: 0.8, typo: 0.2 });

const check = (loaded: Effect.Effect<Effect.Success<typeof load>, ModelError>, request: typeof Infer.Type) =>
  Effect.gen(function* () {
    const { dictionary, vocabulary, run } = yield* loaded;
    const checked = yield* check_text(with_words(dictionary, request.words), vocabulary, run, thresholds_for(request.pickiness), spelling_gate, request.text);
    return { issues: checked_issues(request.text, checked).map(to_wire) } satisfies Checked;
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
