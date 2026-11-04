import { Context, Data, Effect, Layer } from "effect";

export class BrowserError extends Data.TaggedError("BrowserError")<{ readonly cause: unknown }> {}

const open_options = Effect.tryPromise({
  try: () => chrome.runtime.openOptionsPage(),
  catch: (cause) => new BrowserError({ cause }),
});

export type Accelerator = "GPU" | "CPU";

const accelerator: Effect.Effect<Accelerator> = Effect.tryPromise(() => navigator.gpu.requestAdapter()).pipe(
  Effect.map((adapter): Accelerator => (adapter === null ? "CPU" : "GPU")),
  Effect.orElseSucceed((): Accelerator => "CPU"),
);

export class Browser extends Context.Service<
  Browser,
  {
    readonly open_options: Effect.Effect<void, BrowserError>;
    readonly accelerator: Effect.Effect<Accelerator>;
  }
>()("spellcheck/Browser") {
  static readonly layer = Layer.succeed(Browser)({ open_options, accelerator });
}
