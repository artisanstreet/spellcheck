import { diffWordsWithSpace } from "diff";
import { Data } from "effect";
import { replace, type Edit } from "./edit.ts";

class Scan extends Data.Class<{
  readonly offset: number;
  readonly start: number;
  readonly removed: string;
  readonly added: string;
  readonly edits: ReadonlyArray<Edit>;
}> {}

const flush = (scan: Scan): ReadonlyArray<Edit> =>
  scan.removed === "" && scan.added === "" ? scan.edits : [...scan.edits, replace(scan.start, scan.start + scan.removed.length, scan.added)];

export const rewrite_edits = (original: string, corrected: string, offset = 0): ReadonlyArray<Edit> =>
  flush(
    diffWordsWithSpace(original, corrected).reduce((scan, change) => {
      const pending = scan.removed !== "" || scan.added !== "";
      const start = pending ? scan.start : scan.offset;
      return change.removed
        ? new Scan({ ...scan, start, offset: scan.offset + change.value.length, removed: scan.removed + change.value })
        : change.added
          ? new Scan({ ...scan, start, added: scan.added + change.value })
          : new Scan({ offset: scan.offset + change.value.length, start: scan.offset, removed: "", added: "", edits: flush(scan) });
    }, new Scan({ offset, start: offset, removed: "", added: "", edits: [] })),
  );
