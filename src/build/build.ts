import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { Data, Effect } from "effect";
import { effect } from "svelte-effect-runtime/compiler";
import { build, createBuilder } from "vite";
import { extract_inline_scripts } from "./inline-scripts.ts";

class BuildError extends Data.TaggedError("BuildError")<{ readonly step: string; readonly cause: unknown }> {}

const output = resolve("dist");

const step = <A>(name: string, run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: (cause) => new BuildError({ step: name, cause }) });

const build_pages = Effect.gen(function* () {
  const builder = yield* step("pages", () => createBuilder());
  yield* step("pages", () => builder.buildApp());
});

const externalize_page_scripts = Effect.gen(function* () {
  const pages = (yield* step("list pages", () => readdir(output))).filter((file) => file.endsWith(".html"));
  yield* Effect.forEach(pages, (page) =>
    Effect.gen(function* () {
      const path = join(output, page);
      const extracted = extract_inline_scripts(yield* step(`read ${page}`, () => readFile(path, "utf8")), basename(page, ".html"));
      yield* step(`write ${page}`, () => writeFile(path, extracted.html));
      yield* Effect.forEach(extracted.scripts, (script, index) =>
        step(`write ${page} script`, () => writeFile(join(output, `${basename(page, ".html")}.${index}.js`), script)),
      );
    }),
  );
});

const build_content_script = step("content script", () =>
  build({
    configFile: false,
    publicDir: false,
    plugins: [...effect(), svelte({ compilerOptions: { css: "injected", experimental: { async: true } } })],
    build: {
      outDir: output,
      emptyOutDir: false,
      lib: {
        entry: resolve("src/extension/content/content.ts"),
        name: "spellcheck",
        formats: ["iife"],
        fileName: () => "content.js",
      },
    },
  }),
);

const build_module = (name: string, entry: string) =>
  step(name, () =>
    build({
      configFile: false,
      publicDir: false,
      resolve: { conditions: ["onnxruntime-web-use-extern-wasm", "browser", "module", "import", "default"] },
      build: {
        outDir: output,
        emptyOutDir: false,
        lib: { entry: resolve(entry), formats: ["es"], fileName: () => `${name}.js` },
      },
    }),
  );

const runtime_files = ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm", "ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"];

const copy_runtime = Effect.gen(function* () {
  yield* step("runtime folder", () => mkdir(join(output, "ort"), { recursive: true }));
  yield* Effect.forEach(runtime_files, (file) =>
    step(`copy ${file}`, () => cp(resolve("node_modules/onnxruntime-web/dist", file), join(output, "ort", file))),
  );
});

const model_files = ["model.onnx", "tokenizer.json", "tokenizer_config.json", "labels.txt"];

const copy_model = (directory: string) =>
  Effect.gen(function* () {
    yield* step("model folder", () => mkdir(join(output, "model"), { recursive: true }));
    yield* Effect.forEach(model_files, (file) => step(`copy ${file}`, () => cp(resolve(directory, file), join(output, "model", file))));
  });

const dictionaries = [
  { name: "en-us", package: "dictionary-en" },
  { name: "en-gb", package: "dictionary-en-gb" },
];

const copy_dictionaries = Effect.gen(function* () {
  yield* step("dictionary folder", () => mkdir(join(output, "dictionary"), { recursive: true }));
  yield* Effect.forEach(dictionaries, (dictionary) =>
    Effect.forEach(["aff", "dic"], (extension) =>
      step(`copy ${dictionary.name}.${extension}`, () =>
        cp(resolve("node_modules", dictionary.package, `index.${extension}`), join(output, "dictionary", `${dictionary.name}.${extension}`)),
      ),
    ),
  );
});

const main = Effect.gen(function* () {
  yield* build_pages;
  yield* externalize_page_scripts;
  yield* build_content_script;
  yield* build_module("background", "src/extension/background/background.ts");
  yield* build_module("offscreen", "src/extension/offscreen/offscreen.ts");
  yield* copy_runtime;
  yield* copy_dictionaries;
  yield* copy_model(process.env["SPELLCHECK_MODEL"] ?? "models/tagger");
});

Effect.runPromise(main).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
