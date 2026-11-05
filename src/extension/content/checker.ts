import { Context, Data, Effect, Layer, Schema } from "effect";
import type { Pickiness } from "../../settings/settings.ts";
import type { Issue } from "../../suggestions/issue.ts";
import { Check, Checked, from_wire } from "../messages.ts";

export class CheckError extends Data.TaggedError("CheckError")<{ readonly cause: unknown }> {}

export class Result extends Data.Class<{ readonly text: string; readonly issues: ReadonlyArray<Issue> }> {}

const check = (text: string, pickiness: Pickiness, words: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    if (text.trim() === "") return new Result({ text, issues: [] });
    const response = yield* Effect.tryPromise({
      try: () => chrome.runtime.sendMessage(Check.make({ text, pickiness, words })),
      catch: (cause) => new CheckError({ cause }),
    });
    const checked = yield* Schema.decodeUnknownEffect(Checked)(response).pipe(Effect.mapError((cause) => new CheckError({ cause })));
    return new Result({ text, issues: checked.issues.map(from_wire) });
  });

export class Checker extends Context.Service<
  Checker,
  { readonly check: (text: string, pickiness: Pickiness, words: ReadonlyArray<string>) => Effect.Effect<Result, CheckError> }
>()("spellcheck/Checker") {
  static readonly layer = Layer.succeed(Checker)({ check });
}
