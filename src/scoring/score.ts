import { Array as Arr, Data, Order } from "effect";
import { Correction } from "../edits/edit.ts";
import { correction_key, span_key, type Canonical } from "../edits/canonical.ts";

export class Counts extends Data.Class<{ readonly tp: number; readonly fp: number; readonly fn: number }> {}

export const no_counts = new Counts({ tp: 0, fp: 0, fn: 0 });

export const add_counts = (left: Counts, right: Counts): Counts =>
  new Counts({ tp: left.tp + right.tp, fp: left.fp + right.fp, fn: left.fn + right.fn });

export class Metrics extends Data.Class<{ readonly precision: number; readonly recall: number; readonly f05: number }> {}

export const metrics = ({ tp, fp, fn }: Counts): Metrics => {
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f05 = precision + recall === 0 ? 0 : (1.25 * precision * recall) / (0.25 * precision + recall);
  return new Metrics({ precision, recall, f05 });
};

export class Comparison extends Data.Class<{
  readonly correction: Counts;
  readonly detection: Counts;
  readonly false_positives: ReadonlyArray<Canonical>;
  readonly misses: ReadonlyArray<Canonical>;
}> {}

const unique_by = (edits: ReadonlyArray<Canonical>, key: (edit: Canonical) => string): ReadonlyArray<Canonical> =>
  Arr.dedupeWith(edits, (left, right) => key(left) === key(right));

export const compare = (gold: ReadonlyArray<Canonical>, hypothesis: ReadonlyArray<Canonical>): Comparison => {
  const unknown_spans = new Set(gold.filter((edit) => Correction.$is("Unknown")(edit.correction)).map(span_key));
  const gold_known = unique_by(
    gold.filter((edit) => Correction.$is("Known")(edit.correction)),
    correction_key,
  );
  const gold_keys = new Set(gold_known.map(correction_key));
  const scored = unique_by(
    hypothesis.filter((edit) => !unknown_spans.has(span_key(edit))),
    correction_key,
  );
  const hypothesis_keys = new Set(scored.map(correction_key));
  const matched = scored.filter((edit) => gold_keys.has(correction_key(edit)));
  const gold_spans = new Set(gold.map(span_key));
  const hypothesis_spans = new Set(hypothesis.map(span_key));
  const detected = [...hypothesis_spans].filter((span) => gold_spans.has(span)).length;
  return new Comparison({
    correction: new Counts({ tp: matched.length, fp: scored.length - matched.length, fn: gold_known.length - matched.length }),
    detection: new Counts({ tp: detected, fp: hypothesis_spans.size - detected, fn: gold_spans.size - detected }),
    false_positives: scored.filter((edit) => !gold_keys.has(correction_key(edit))),
    misses: gold_known.filter((edit) => !hypothesis_keys.has(correction_key(edit))),
  });
};

const by_f05 = Order.mapInput(Order.number, (comparison: Comparison) => metrics(comparison.correction).f05);

export const compare_best = (
  annotations: ReadonlyArray<ReadonlyArray<Canonical>>,
  hypothesis: ReadonlyArray<Canonical>,
): Comparison =>
  Arr.match(annotations, {
    onEmpty: () => compare([], hypothesis),
    onNonEmpty: (all) => Arr.max(Arr.map(all, (gold) => compare(gold, hypothesis)), by_f05),
  });
