import { Data } from "effect";
import type { Edit } from "../edits/edit.ts";

export class Document extends Data.Class<{
  readonly id: string;
  readonly text: string;
  readonly annotations: ReadonlyArray<ReadonlyArray<Edit>>;
}> {}

export type Corpus = Data.TaggedEnum<{
  Annotated: { readonly name: string; readonly documents: ReadonlyArray<Document> };
  Clean: { readonly name: string; readonly documents: ReadonlyArray<Document> };
}>;

export const Corpus = Data.taggedEnum<Corpus>();
