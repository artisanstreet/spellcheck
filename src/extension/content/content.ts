import { mount } from "svelte";
import { ClientRuntime } from "svelte-effect-runtime";
import tokens from "@artisanstreet/ui/tokens.css?inline";
import surfaces from "@artisanstreet/ui/surfaces.css?inline";
import { Settings } from "../../settings/settings.ts";
import Overlay from "./overlay.svelte";
import { shadow_styles } from "./shadow-styles.ts";

const host = document.createElement("spellcheck-root");
const shadow = host.attachShadow({ mode: "closed" });
const style = document.createElement("style");
style.textContent = shadow_styles(`${tokens}\n${surfaces}`);
shadow.append(style);
document.documentElement.append(host);

ClientRuntime.make(Settings.layer);
mount(Overlay, { target: shadow });
