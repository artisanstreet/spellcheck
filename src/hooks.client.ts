import { Layer } from "effect";
import { ClientRuntime } from "svelte-effect-runtime";
import { Browser } from "./browser/browser.ts";
import { Settings } from "./settings/settings.ts";

export const init = () => {
  ClientRuntime.make(Layer.mergeAll(Settings.layer, Browser.layer));
};
