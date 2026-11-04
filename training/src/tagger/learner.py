import argparse
import json
import random
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

import pyarrow.parquet as pq
import regex

from tagger.prepare import Example, Limits, label_pair, schema, write

sentence_pattern = regex.compile(r"[^.!?\n]+(?:[.!?]+|(?=\n)|$)")


@dataclass(frozen=True)
class Correction:
    start: int
    end: int
    text: str | None


@dataclass(frozen=True)
class Span:
    start: int
    end: int


def sentence_spans(text: str) -> tuple[Span, ...]:
    def trimmed(match: regex.Match) -> Span | None:
        content = match.group(0)
        stripped = content.strip()
        offset = match.start() + content.find(stripped)
        return Span(offset, offset + len(stripped)) if stripped else None

    return tuple(span for span in map(trimmed, sentence_pattern.finditer(text)) if span is not None)


def corrected(text: str, span: Span, corrections: Iterable[Correction]) -> str:
    ordered = sorted(corrections, key=lambda correction: correction.start, reverse=True)
    sentence = text[span.start : span.end]
    for correction in ordered:
        sentence = sentence[: correction.start - span.start] + (correction.text or "") + sentence[correction.end - span.start :]
    return sentence.strip()


def sentence_pairs(text: str, corrections: tuple[Correction, ...]) -> tuple[tuple[str, str], ...]:
    def inside(span: Span, correction: Correction) -> bool:
        return span.start <= correction.start and correction.end <= span.end

    def touches(span: Span, correction: Correction) -> bool:
        return correction.start < span.end and span.start < correction.end or (
            correction.start == correction.end and span.start <= correction.start <= span.end
        )

    def pair(span: Span) -> tuple[str, str] | None:
        mine = tuple(correction for correction in corrections if touches(span, correction))
        if any(not inside(span, correction) or correction.text is None for correction in mine):
            return None
        return text[span.start : span.end], corrected(text, span, mine)

    return tuple(found for found in map(pair, sentence_spans(text)) if found is not None)


def essays(path: Path) -> Iterable[tuple[str, tuple[Correction, ...]]]:
    with open(path, encoding="utf-8") as file:
        for line in file:
            essay = json.loads(line)
            annotations = dict((annotator, edits) for annotator, edits in essay["edits"])
            edits = annotations.get(0, next(iter(annotations.values()), []))
            yield essay["text"], tuple(Correction(start, end, text) for start, end, text in edits)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, nargs="+", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--dev-size", type=int, default=1000)
    arguments = parser.parse_args()

    limits = Limits(min_words=3, max_words=80, max_edit_ratio=0.5)
    pairs = [pair for path in arguments.input for text, corrections in essays(path) for pair in sentence_pairs(text, corrections)]
    examples: list[Example] = [example for source, target in pairs if (example := label_pair(source, target, limits)) is not None]
    random.Random(0).shuffle(examples)
    arguments.output.mkdir(parents=True, exist_ok=True)
    for name, chunk in [("dev", examples[: arguments.dev_size]), ("train", examples[arguments.dev_size :])]:
        with pq.ParquetWriter(arguments.output / f"{name}.parquet", schema) as writer:
            write(writer, chunk)
    edited = sum(1 for example in examples if any(label != "KEEP" for label in example.labels))
    print(f"sentences {len(pairs)}, examples {len(examples)}, with edits {edited}")
