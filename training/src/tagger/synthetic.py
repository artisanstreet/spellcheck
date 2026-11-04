import argparse
import json
import random
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

import pyarrow.parquet as pq
import regex

from tagger.prepare import Example, Limits, label_pair, schema, write


sentence_start = regex.compile(r"(^|[.!?]\s+)(\p{Ll})(?=\p{Ll}*(?:\P{L}|$))")


def capitalise_sentences(text: str) -> str:
    return sentence_start.sub(lambda match: match[1] + match[2].upper(), text)


@dataclass(frozen=True)
class Pair:
    source: str
    target: str


def pair_of(line: str) -> Pair | None:
    try:
        record = json.loads(line)
    except json.JSONDecodeError:
        return None
    match record:
        case {"source": str(source), "target": str(target)} if source.strip() and target.strip():
            return Pair(" ".join(source.split()), capitalise_sentences(" ".join(target.split())))
        case _:
            return None


def unique_pairs(lines: Iterable[str]) -> tuple[Pair, ...]:
    pairs = (pair for line in lines if (pair := pair_of(line)) is not None)
    return tuple(dict.fromkeys(pairs))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, nargs="+", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--dev-size", type=int, default=200)
    arguments = parser.parse_args()

    lines = [line for path in arguments.input for line in path.read_text(encoding="utf-8").splitlines()]
    pairs = unique_pairs(lines)
    limits = Limits(min_words=3, max_words=80, max_edit_ratio=0.5)
    examples: list[Example] = [example for pair in pairs if (example := label_pair(pair.source, pair.target, limits)) is not None]
    random.Random(0).shuffle(examples)
    arguments.output.mkdir(parents=True, exist_ok=True)
    for name, chunk in [("dev", examples[: arguments.dev_size]), ("train", examples[arguments.dev_size :])]:
        with pq.ParquetWriter(arguments.output / f"{name}.parquet", schema) as writer:
            write(writer, chunk)
    edited = sum(1 for example in examples if any(label != "KEEP" for label in example.labels))
    print(f"lines {len(lines)}, unique pairs {len(pairs)}, examples {len(examples)}, with edits {edited}")
