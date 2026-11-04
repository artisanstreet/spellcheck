import { Schema } from "effect";
import { Pickiness } from "../settings/settings.ts";
import { Issue, Kind } from "../suggestions/issue.ts";

export const WireIssue = Schema.Struct({
  start: Schema.Number,
  end: Schema.Number,
  kind: Schema.Literals(["spelling", "grammar"]),
  message: Schema.String,
  replacements: Schema.Array(Schema.String),
});

export type WireIssue = typeof WireIssue.Type;

export const Check = Schema.TaggedStruct("Check", { text: Schema.String, pickiness: Pickiness });

export const Infer = Schema.TaggedStruct("Infer", { text: Schema.String, pickiness: Pickiness });

export const Checked = Schema.Struct({ issues: Schema.Array(WireIssue) });

export type Checked = typeof Checked.Type;

export const to_wire = (issue: Issue): WireIssue => ({
  start: issue.start,
  end: issue.end,
  kind: Kind.$match(issue.kind, { Spelling: () => "spelling" as const, Grammar: () => "grammar" as const }),
  message: issue.message,
  replacements: issue.replacements,
});

export const from_wire = (wire: WireIssue): Issue =>
  new Issue({
    start: wire.start,
    end: wire.end,
    kind: wire.kind === "spelling" ? Kind.Spelling() : Kind.Grammar(),
    message: wire.message,
    replacements: wire.replacements,
  });
