import { describe, expect, it } from "vitest";
import { extract_inline_scripts } from "../../src/build/inline-scripts.ts";

describe("extract_inline_scripts", () => {
  it("moves each inline script into a numbered file in place", () => {
    const html = '<head><script src="./keep.js"></script></head><body><script>a()</script><div><script>\n b()\n</script></div></body>';
    const extracted = extract_inline_scripts(html, "popup");
    expect(extracted.html).toBe('<head><script src="./keep.js"></script></head><body><script src="./popup.0.js"></script><div><script src="./popup.1.js"></script></div></body>');
    expect(extracted.scripts).toEqual(["a()", "\n b()\n"]);
  });
});
