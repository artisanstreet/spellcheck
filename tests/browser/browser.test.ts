import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { site_of } from "../../src/browser/browser.ts";

describe("site_of", () => {
  it("returns the hostname of web pages only", () => {
    expect(site_of("https://www.reddit.com/r/svelte/")).toEqual(Option.some("www.reddit.com"));
    expect(site_of("chrome://extensions")).toEqual(Option.none());
    expect(site_of("not a url")).toEqual(Option.none());
    expect(site_of(undefined)).toEqual(Option.none());
  });
});
