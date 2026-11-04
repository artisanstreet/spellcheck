import { metrics } from "../scoring/score.ts";
import type { Result } from "./evaluate.ts";

const percent = (value: number) => `${(value * 100).toFixed(1)}`;

const per_thousand_words = (value: number, words: number) => (words === 0 ? "0" : ((value * 1000) / words).toFixed(1));

const table = (header: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>): string => {
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column]?.length ?? 0)));
  const line = (cells: ReadonlyArray<string>) => cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join("  ");
  return [line(header), line(widths.map((width) => "-".repeat(width))), ...rows.map(line)].join("\n");
};

const annotated_row = (result: Result): ReadonlyArray<string> => {
  const correction = metrics(result.correction);
  const detection = metrics(result.detection);
  return [
    result.corpus,
    result.engine,
    percent(correction.precision),
    percent(correction.recall),
    percent(correction.f05),
    percent(detection.precision),
    percent(detection.recall),
    percent(detection.f05),
    per_thousand_words(result.millis, result.words),
  ];
};

const clean_row = (result: Result): ReadonlyArray<string> => [
  result.corpus,
  result.engine,
  String(result.flags),
  per_thousand_words(result.flags, result.words),
  per_thousand_words(result.millis, result.words),
];

export const report = (results: ReadonlyArray<Result>): string =>
  [
    table(
      ["corpus", "engine", "P", "R", "F0.5", "det P", "det R", "det F0.5", "ms/1k words"],
      results.filter((result) => !result.clean).map(annotated_row),
    ),
    table(
      ["clean corpus", "engine", "flags", "flags/1k words", "ms/1k words"],
      results.filter((result) => result.clean).map(clean_row),
    ),
  ].join("\n\n");
