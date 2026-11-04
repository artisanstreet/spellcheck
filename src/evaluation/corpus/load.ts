import { execFile } from "node:child_process";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { Data, Effect } from "effect";
import { Corpus, type Document } from "./document.ts";
import { parse_marked } from "./marked.ts";
import { corrected, parse_wi } from "./wi.ts";

export class CorpusError extends Data.TaggedError("CorpusError")<{ readonly corpus: string; readonly cause: unknown }> {}

const wi_url = "https://www.cl.cam.ac.uk/research/nl/bea2019st/data/wi+locness_v2.1.bea19.tar.gz";
const wi_splits = ["A", "B", "C", "N"];

const attempt = <A>(corpus: string, run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: (cause) => new CorpusError({ corpus, cause }) });

const exists = (path: string) =>
  Effect.tryPromise(() => access(path)).pipe(
    Effect.as(true),
    Effect.orElseSucceed(() => false),
  );

const fetch_wi = (directory: string) =>
  Effect.gen(function* () {
    const archive = join(directory, "wi.tar.gz");
    yield* Effect.logInfo(`Downloading W&I+LOCNESS into ${directory}`);
    yield* attempt("wi", () => mkdir(directory, { recursive: true }));
    const response = yield* attempt("wi", () => fetch(wi_url));
    const body = yield* attempt("wi", () => response.arrayBuffer());
    yield* attempt("wi", () => writeFile(archive, new Uint8Array(body)));
    yield* attempt("wi", () => promisify(execFile)("tar", ["xzf", archive, "-C", directory]));
  });

const limited = (documents: ReadonlyArray<Document>, limit: number) => documents.slice(0, limit);

export const load_wi = (data: string, limit: number) =>
  Effect.gen(function* () {
    const directory = join(data, "wi");
    const json = join(directory, "wi+locness", "json");
    if (!(yield* exists(json))) yield* fetch_wi(directory);
    const documents = yield* Effect.forEach(wi_splits, (split) =>
      attempt("wi", () => readFile(join(json, `${split}.dev.json`), "utf8")).pipe(
        Effect.flatMap(parse_wi),
        Effect.mapError((cause) => new CorpusError({ corpus: "wi", cause })),
      ),
    ).pipe(Effect.map((splits) => limited(splits.flat(), limit)));
    return [
      Corpus.Annotated({ name: "wi-dev", documents }),
      Corpus.Clean({ name: "wi-dev-corrected", documents: documents.map(corrected) }),
    ];
  });

const load_marked = (directory: string, make: (name: string, documents: ReadonlyArray<Document>) => Corpus, limit: number) =>
  Effect.gen(function* () {
    if (!(yield* exists(directory))) return [];
    const files = (yield* attempt(directory, () => readdir(directory))).filter((file) => file.endsWith(".txt"));
    return yield* Effect.forEach(files, (file) =>
      attempt(file, () => readFile(join(directory, file), "utf8")).pipe(
        Effect.map((source) => {
          const name = `${basename(directory)}/${basename(file, ".txt")}`;
          return make(name, limited(parse_marked(name, source), limit));
        }),
      ),
    );
  });

export const load_corpora = (data: string, corpora: string, limit: number) =>
  Effect.all([
    load_wi(data, limit),
    load_marked(join(corpora, "mistakes"), (name, documents) => Corpus.Annotated({ name, documents }), limit),
    load_marked(join(corpora, "clean"), (name, documents) => Corpus.Clean({ name, documents }), limit),
  ]).pipe(Effect.map((groups) => groups.flat()));
