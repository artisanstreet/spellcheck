import { Data } from "effect";

export class Extracted extends Data.Class<{ readonly html: string; readonly scripts: ReadonlyArray<string> }> {}

const inline_script = /<script>([\s\S]*?)<\/script>/;

export const extract_inline_scripts = (html: string, name: string): Extracted => {
  const parts = html.split(inline_script);
  return new Extracted({
    html: parts.map((part, index) => (index % 2 === 0 ? part : `<script src="./${name}.${(index - 1) / 2}.js"></script>`)).join(""),
    scripts: parts.filter((_, index) => index % 2 === 1),
  });
};
