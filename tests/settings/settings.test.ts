import { describe, expect, it } from "vitest";
import { checks_site, defaults, with_site } from "../../src/settings/settings.ts";

describe("with_site", () => {
  it("disables and re-enables a site without duplicates", () => {
    const off = with_site(with_site(defaults, "reddit.com", false), "reddit.com", false);
    expect(off.disabled_sites).toEqual(["reddit.com"]);
    expect(checks_site(off, "reddit.com")).toBe(false);
    expect(checks_site(off, "github.com")).toBe(true);
    expect(with_site(off, "reddit.com", true).disabled_sites).toEqual([]);
  });

  it("checks no site while paused", () => {
    expect(checks_site({ ...defaults, enabled: false }, "github.com")).toBe(false);
  });
});
