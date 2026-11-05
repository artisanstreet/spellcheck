import { Context, Data, Effect, Layer, Schema } from "effect";

export const Pickiness = Schema.Literals(["relaxed", "balanced", "strict"]);

export type Pickiness = typeof Pickiness.Type;

export const Preferences = Schema.Struct({
  enabled: Schema.Boolean,
  pickiness: Pickiness,
});

export type Preferences = typeof Preferences.Type;

export const defaults: Preferences = { enabled: true, pickiness: "balanced" };

const key = "preferences";

export class SettingsError extends Data.TaggedError("SettingsError")<{ readonly cause: unknown }> {}

const as_record = (value: unknown): object => (typeof value === "object" && value !== null ? value : {});

const load = Effect.gen(function* () {
  const stored = yield* Effect.tryPromise({
    try: () => chrome.storage.local.get(key),
    catch: (cause) => new SettingsError({ cause }),
  });
  return yield* Schema.decodeUnknownEffect(Preferences)({ ...defaults, ...as_record(stored[key]) }).pipe(
    Effect.orElseSucceed(() => defaults),
  );
});

const save = (preferences: Preferences) =>
  Effect.tryPromise({
    try: () => chrome.storage.local.set({ [key]: preferences }),
    catch: (cause) => new SettingsError({ cause }),
  });

const words_key = "dictionary";

const Words = Schema.Array(Schema.String);

const load_words = Effect.tryPromise({
  try: () => chrome.storage.local.get(words_key),
  catch: (cause) => new SettingsError({ cause }),
}).pipe(Effect.flatMap((stored) => Schema.decodeUnknownEffect(Words)(stored[words_key]).pipe(Effect.orElseSucceed((): ReadonlyArray<string> => []))));

const save_words = (words: ReadonlyArray<string>) =>
  Effect.tryPromise({
    try: () => chrome.storage.local.set({ [words_key]: words }),
    catch: (cause) => new SettingsError({ cause }),
  });

export class Settings extends Context.Service<
  Settings,
  {
    readonly load: Effect.Effect<Preferences, SettingsError>;
    readonly save: (preferences: Preferences) => Effect.Effect<void, SettingsError>;
    readonly load_words: Effect.Effect<ReadonlyArray<string>, SettingsError>;
    readonly save_words: (words: ReadonlyArray<string>) => Effect.Effect<void, SettingsError>;
  }
>()("spellcheck/Settings") {
  static readonly layer = Layer.succeed(Settings)({ load, save, load_words, save_words });
}
