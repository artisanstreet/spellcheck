import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Effect, Match } from "effect";
import { load_corpora } from "./corpus/load.ts";
import { EngineError, type Engine } from "./engines/engine.ts";
import { Gate } from "../checking/check.ts";
import { checker_engine } from "./engines/checker.ts";
import { harper_engine } from "./engines/harper.ts";
import { nspell_engine } from "./engines/nspell.ts";
import { t5_engine } from "./engines/t5.ts";
import { tagger_engine } from "./engines/tagger.ts";
import { Thresholds } from "../tagger/labels.ts";
import { evaluate } from "./run/evaluate.ts";
import { report } from "./run/report.ts";

const options = Effect.try(() =>
  parseArgs({
    options: {
      engines: { type: "string", default: "nspell,harper" },
      t5: { type: "string", default: "../../spellchecker-mvp/public/models/english" },
      tagger: { type: "string", default: "models/tagger" },
      "error-threshold": { type: "string", default: "0.5" },
      "label-threshold": { type: "string", default: "0.3" },
      "delete-threshold": { type: "string", default: "0.95" },
      "spelling-margin": { type: "string", default: "0.1" },
      commonness: { type: "string", default: "0.8" },
      typo: { type: "string", default: "0.2" },
      limit: { type: "string", default: String(Number.MAX_SAFE_INTEGER) },
      data: { type: "string", default: "data" },
      corpora: { type: "string", default: "corpora" },
      results: { type: "string", default: "results" },
    },
  }).values,
);

type Options = Effect.Success<typeof options>;

const engine = (name: string, values: Options): Effect.Effect<Engine, EngineError> =>
  Match.value(name).pipe(
    Match.when("nspell", () => nspell_engine),
    Match.when("harper", () => harper_engine),
    Match.when("t5", () => t5_engine(values.t5)),
    Match.when("tagger", () =>
      tagger_engine(
        values.tagger,
        new Thresholds({ error: Number(values["error-threshold"]), label: Number(values["label-threshold"]), delete: Number(values["delete-threshold"]) }),
      ),
    ),
    Match.when("checker", () =>
      checker_engine(
        values.tagger,
        new Thresholds({ error: Number(values["error-threshold"]), label: Number(values["label-threshold"]), delete: Number(values["delete-threshold"]) }),
        new Gate({ margin: Number(values["spelling-margin"]), commonness: Number(values.commonness), typo: Number(values.typo) }),
      ),
    ),
    Match.orElse((unknown) => Effect.fail(new EngineError({ engine: unknown, cause: "unknown engine" }))),
  );

const main = Effect.gen(function* () {
  const values = yield* options;
  const corpora = yield* load_corpora(values.data, values.corpora, Number(values.limit));
  const engines = yield* Effect.forEach(values.engines.split(","), (name) => engine(name.trim(), values));
  const results = yield* Effect.forEach(engines, (selected) =>
    Effect.forEach(corpora, (corpus) =>
      Effect.logInfo(`${selected.name} on ${corpus.name} (${corpus.documents.length} documents)`).pipe(
        Effect.andThen(evaluate(selected, corpus)),
      ),
    ),
  ).pipe(Effect.map((groups) => groups.flat()));
  const stamp = new Date().toISOString().replaceAll(":", "-");
  yield* Effect.tryPromise(() => mkdir(values.results, { recursive: true }));
  yield* Effect.tryPromise(() => writeFile(join(values.results, `${stamp}.json`), JSON.stringify(results, null, 2)));
  yield* Effect.sync(() => console.log(`\n${report(results)}\n\nFindings written to ${join(values.results, `${stamp}.json`)}`));
});

Effect.runPromise(main).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
