import { describe, expect, it } from "vitest";
import { shadow_styles } from "../../../src/extension/content/shadow-styles.ts";

describe("shadow_styles", () => {
  it("scopes root tokens to the shadow host and drops font faces", () => {
    const css = '@font-face { font-family: "Spline Sans"; src: url(a.ttf); }\n:root { --ink: white; }\n:root[data-theme="light"] { --ink: black; }';
    expect(shadow_styles(css)).toBe('\n:host { --ink: white; }\n:host([data-theme="light"]) { --ink: black; }');
  });
});
