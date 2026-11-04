import { readdir, readFile, writeFile } from "node:fs/promises";
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

const main = Effect.gen(function* () {
  yield* build_pages;
  yield* externalize_page_scripts;
  yield* build_content_script;
});

Effect.runPromise(main).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
