import { Context, Data, Effect, Layer, Option } from "effect";

export class BrowserError extends Data.TaggedError("BrowserError")<{ readonly cause: unknown }> {}

export const site_of = (url: string | undefined): Option.Option<string> =>
  Option.fromNullishOr(url).pipe(
    Option.flatMap((value) => Option.liftThrowable(() => new URL(value))()),
    Option.filter((parsed) => parsed.protocol === "http:" || parsed.protocol === "https:"),
    Option.map((parsed) => parsed.hostname),
  );

const current_site = Effect.gen(function* () {
  const [tab] = yield* Effect.tryPromise({
    try: () => chrome.tabs.query({ active: true, currentWindow: true }),
    catch: (cause) => new BrowserError({ cause }),
  });
  return site_of(tab?.url);
});

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
    readonly current_site: Effect.Effect<Option.Option<string>, BrowserError>;
    readonly open_options: Effect.Effect<void, BrowserError>;
    readonly accelerator: Effect.Effect<Accelerator>;
  }
>()("spellcheck/Browser") {
  static readonly layer = Layer.succeed(Browser)({ current_site, open_options, accelerator });
}
