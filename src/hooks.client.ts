import { ClientRuntime } from "svelte-effect-runtime";
import { Settings } from "./settings/settings.ts";

export const init = () => {
  ClientRuntime.make(Settings.layer);
};
