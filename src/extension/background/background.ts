import { Data, Effect, Schema } from "effect";
import { Check, Checked, Infer } from "../messages.ts";

class OffscreenError extends Data.TaggedError("OffscreenError")<{ readonly cause: unknown }> {}

const create_offscreen = Effect.tryPromise({
  try: async () => {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: "Runs the spellcheck model on this device",
    });
  },
  catch: (cause) => new OffscreenError({ cause }),
});

const infer = (request: typeof Check.Type) =>
  Effect.tryPromise({
    try: () => chrome.runtime.sendMessage(Infer.make({ text: request.text, pickiness: request.pickiness, words: request.words })),
    catch: (cause) => new OffscreenError({ cause }),
  }).pipe(Effect.flatMap((response) => Schema.decodeUnknownEffect(Checked)(response)));

const serve = Effect.gen(function* () {
  const offscreen = yield* Effect.cached(create_offscreen);
  yield* Effect.sync(() =>
    chrome.runtime.onMessage.addListener((message: unknown, _sender, respond: (response: Checked) => void) => {
      if (!Schema.is(Check)(message)) return false;
      Effect.runFork(
        offscreen.pipe(
          Effect.andThen(infer(message)),
          Effect.tapError((error) => Effect.logError("spellcheck check failed", error)),
          Effect.orElseSucceed((): Checked => ({ issues: [] })),
          Effect.tap((checked) => Effect.sync(() => respond(checked))),
        ),
      );
      return true;
    }),
  );
});

Effect.runFork(serve);
