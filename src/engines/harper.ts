import { Dialect, LocalLinter, SuggestionKind, type Lint } from "harper.js";
import { binaryInlined } from "harper.js/binaryInlined";
import { Array as Arr, Effect, Match, Option } from "effect";
import { replace, type Edit } from "../edits/edit.ts";
import { code_point_offsets } from "../edits/offsets.ts";
import { Engine, EngineError } from "./engine.ts";

const to_edit = (offsets: ReadonlyArray<number>, lint: Lint): Option.Option<Edit> => {
  const span = lint.span();
  const start = offsets[span.start] ?? span.start;
  const end = offsets[span.end] ?? span.end;
  return Arr.head(lint.suggestions()).pipe(
    Option.map((suggestion) =>
      Match.value(suggestion.kind()).pipe(
        Match.when(SuggestionKind.Remove, () => replace(start, end, "")),
        Match.when(SuggestionKind.InsertAfter, () => replace(end, end, suggestion.get_replacement_text())),
        Match.orElse(() => replace(start, end, suggestion.get_replacement_text())),
      ),
    ),
  );
};

export const harper_engine = Effect.gen(function* () {
  const linter = new LocalLinter({ binary: binaryInlined, dialect: Dialect.British });
  yield* Effect.tryPromise({ try: () => linter.setup(), catch: (cause) => new EngineError({ engine: "harper", cause }) });
  return new Engine({
    name: "harper",
    check: (text) =>
      Effect.tryPromise({
        try: () => linter.lint(text, { language: "plaintext" }),
        catch: (cause) => new EngineError({ engine: "harper", cause }),
      }).pipe(
        Effect.map((lints) => {
          const offsets = code_point_offsets(text);
          return Arr.getSomes(lints.map((lint) => to_edit(offsets, lint)));
        }),
      ),
  });
});
