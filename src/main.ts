import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Effect, Match } from "effect";
import { load_corpora } from "./corpus/load.ts";
import { EngineError, type Engine } from "./engines/engine.ts";
import { harper_engine } from "./engines/harper.ts";
import { nspell_engine } from "./engines/nspell.ts";
import { t5_engine } from "./engines/t5.ts";
import { evaluate } from "./run/evaluate.ts";
import { report } from "./run/report.ts";

const options = Effect.try(() =>
  parseArgs({
    options: {
      engines: { type: "string", default: "nspell,harper" },
      t5: { type: "string", default: "../../spellchecker-mvp/public/models/english" },
      limit: { type: "string", default: String(Number.MAX_SAFE_INTEGER) },
      data: { type: "string", default: "data" },
      corpora: { type: "string", default: "corpora" },
      results: { type: "string", default: "results" },
    },
  }).values,
);

const engine = (name: string, t5_directory: string): Effect.Effect<Engine, EngineError> =>
  Match.value(name).pipe(
    Match.when("nspell", () => nspell_engine),
    Match.when("harper", () => harper_engine),
    Match.when("t5", () => t5_engine(t5_directory)),
    Match.orElse((unknown) => Effect.fail(new EngineError({ engine: unknown, cause: "unknown engine" }))),
  );

const main = Effect.gen(function* () {
  const values = yield* options;
  const corpora = yield* load_corpora(values.data, values.corpora, Number(values.limit));
  const engines = yield* Effect.forEach(values.engines.split(","), (name) => engine(name.trim(), values.t5));
  const results = yield* Effect.forEach(engines, (selected) =>
    Effect.forEach(corpora, (corpus) =>
      Effect.logInfo(`${selected.name} on ${corpus.name} (${corpus.documents.length} documents)`).pipe(
        Effect.zipRight(evaluate(selected, corpus)),
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
