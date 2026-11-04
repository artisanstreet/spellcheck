import { Context, Data, Effect, Layer, Schema } from "effect";

export const Pickiness = Schema.Literals(["relaxed", "balanced", "strict"]);

export type Pickiness = typeof Pickiness.Type;

export const Preferences = Schema.Struct({
  enabled: Schema.Boolean,
  pickiness: Pickiness,
  disabled_sites: Schema.Array(Schema.String),
});

export type Preferences = typeof Preferences.Type;

export const defaults: Preferences = { enabled: true, pickiness: "balanced", disabled_sites: [] };

export const checks_site = (preferences: Preferences, site: string): boolean =>
  preferences.enabled && !preferences.disabled_sites.includes(site);

export const with_site = (preferences: Preferences, site: string, checked: boolean): Preferences => ({
  ...preferences,
  disabled_sites: checked
    ? preferences.disabled_sites.filter((disabled) => disabled !== site)
    : [...new Set([...preferences.disabled_sites, site])],
});

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

export class Settings extends Context.Service<
  Settings,
  {
    readonly load: Effect.Effect<Preferences, SettingsError>;
    readonly save: (preferences: Preferences) => Effect.Effect<void, SettingsError>;
  }
>()("spellcheck/Settings") {
  static readonly layer = Layer.succeed(Settings)({ load, save });
}
