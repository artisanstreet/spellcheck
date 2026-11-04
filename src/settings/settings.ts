import { Context, Data, Effect, Layer, Schema } from "effect";

export const Preferences = Schema.Struct({
  enabled: Schema.Boolean,
});

export type Preferences = typeof Preferences.Type;

const defaults: Preferences = { enabled: true };

const key = "preferences";

export class SettingsError extends Data.TaggedError("SettingsError")<{ readonly cause: unknown }> {}

const load = Effect.gen(function* () {
  const stored = yield* Effect.tryPromise({
    try: () => chrome.storage.local.get(key),
    catch: (cause) => new SettingsError({ cause }),
  });
  return yield* Schema.decodeUnknownEffect(Preferences)(stored[key] ?? defaults).pipe(
    Effect.orElseSucceed(() => defaults),
  );
});

const save = (preferences: Preferences) =>
  Effect.tryPromise({
    try: () => chrome.storage.local.set({ [key]: preferences }),
    catch: (cause) => new SettingsError({ cause }),
  });

export class Settings extends Context.Service<
  Settings,
  {
    readonly load: Effect.Effect<Preferences, SettingsError>;
    readonly save: (preferences: Preferences) => Effect.Effect<void, SettingsError>;
  }
>()("spellcheck/Settings") {
  static readonly layer = Layer.succeed(Settings)({ load, save });
}
