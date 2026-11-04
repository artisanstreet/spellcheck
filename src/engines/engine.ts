import { Data, type Effect } from "effect";
import type { Edit } from "../edits/edit.ts";

export class EngineError extends Data.TaggedError("EngineError")<{ readonly engine: string; readonly cause: unknown }> {}

export class Engine extends Data.Class<{
  readonly name: string;
  readonly check: (text: string) => Effect.Effect<ReadonlyArray<Edit>, EngineError>;
}> {}
