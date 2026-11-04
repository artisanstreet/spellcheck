import { Effect, Schema } from "effect";
import { Correction, Edit, apply_edits } from "../edits/edit.ts";
import { Document } from "./document.ts";

const WiEdit = Schema.Tuple(Schema.Number, Schema.Number, Schema.NullOr(Schema.String));

const WiLine = Schema.parseJson(
  Schema.Struct({
    id: Schema.String,
    text: Schema.String,
    edits: Schema.Array(Schema.Tuple(Schema.Number, Schema.Array(WiEdit))),
  }),
);

const to_edit = ([start, end, text]: typeof WiEdit.Type): Edit =>
  new Edit({ start, end, correction: text === null ? Correction.Unknown() : Correction.Known({ text }) });

export const parse_wi = (source: string) =>
  Effect.forEach(
    source.split("\n").filter((line) => line.trim() !== ""),
    (line) =>
      Schema.decodeUnknown(WiLine)(line).pipe(
        Effect.map(
          (entry) =>
            new Document({
              id: entry.id,
              text: entry.text,
              annotations: entry.edits.map(([, edits]) => edits.map(to_edit)),
            }),
        ),
      ),
  );

export const corrected = (document: Document): Document =>
  new Document({
    id: `${document.id}:corrected`,
    text: apply_edits(document.text, document.annotations[0] ?? []),
    annotations: [],
  });
