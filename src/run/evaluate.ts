import { Data, Duration, Effect } from "effect";
import { canonicalize_all, type Canonical } from "../edits/canonical.ts";
import { Correction } from "../edits/edit.ts";
import { count_words } from "../edits/tokens.ts";
import { Corpus, type Document } from "../corpus/document.ts";
import type { Engine } from "../engines/engine.ts";
import { add_counts, compare_best, no_counts, type Counts } from "../scoring/score.ts";

export class Finding extends Data.Class<{
  readonly document: string;
  readonly false_positives: ReadonlyArray<string>;
  readonly misses: ReadonlyArray<string>;
}> {}

export class Result extends Data.Class<{
  readonly engine: string;
  readonly corpus: string;
  readonly clean: boolean;
  readonly correction: Counts;
  readonly detection: Counts;
  readonly flags: number;
  readonly words: number;
  readonly millis: number;
  readonly findings: ReadonlyArray<Finding>;
}> {}

const describe = (edit: Canonical): string =>
  `${edit.original || "∅"} → ${Correction.$match(edit.correction, { Known: ({ text }) => text || "∅", Unknown: () => "?" })}`;

const evaluate_document = (engine: Engine, document: Document) =>
  Effect.timed(engine.check(document.text)).pipe(
    Effect.map(([duration, edits]) => {
      const hypothesis = canonicalize_all(document.text, edits);
      const comparison = compare_best(
        document.annotations.map((annotation) => canonicalize_all(document.text, annotation)),
        hypothesis,
      );
      return { duration, hypothesis, comparison, words: count_words(document.text), id: document.id };
    }),
  );

export const evaluate = (engine: Engine, corpus: Corpus) =>
  Effect.gen(function* () {
    const { name, documents } = corpus;
    const outcomes = yield* Effect.forEach(documents, (document) => evaluate_document(engine, document));
    return new Result({
      engine: engine.name,
      corpus: name,
      clean: Corpus.$is("Clean")(corpus),
      correction: outcomes.reduce((total, outcome) => add_counts(total, outcome.comparison.correction), no_counts),
      detection: outcomes.reduce((total, outcome) => add_counts(total, outcome.comparison.detection), no_counts),
      flags: outcomes.reduce((total, outcome) => total + outcome.hypothesis.length, 0),
      words: outcomes.reduce((total, outcome) => total + outcome.words, 0),
      millis: outcomes.reduce((total, outcome) => total + Duration.toMillis(outcome.duration), 0),
      findings: outcomes
        .map(
          (outcome) =>
            new Finding({
              document: outcome.id,
              false_positives: outcome.comparison.false_positives.map(describe),
              misses: outcome.comparison.misses.map(describe),
            }),
        )
        .filter((finding) => finding.false_positives.length > 0 || finding.misses.length > 0),
    });
  });
