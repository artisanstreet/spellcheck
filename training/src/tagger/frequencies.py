import argparse
from collections import Counter
from collections.abc import Iterable
from pathlib import Path

import pyarrow.parquet as pq
import regex

word_pattern = regex.compile(r"\p{L}+(?:['’]\p{L}+)*")


def count_words(sentences: Iterable[str]) -> Counter[str]:
    return Counter(word.lower().replace("’", "'") for sentence in sentences for word in word_pattern.findall(sentence))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--column", default="output")
    parser.add_argument("--min-count", type=int, default=3)
    parser.add_argument("--limit", type=int, default=120_000)
    arguments = parser.parse_args()

    counts = count_words(pq.read_table(arguments.input, columns=[arguments.column]).column(0).to_pylist())
    kept = [(word, count) for word, count in counts.most_common(arguments.limit) if count >= arguments.min_count]
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text("".join(f"{word}\t{count}\n" for word, count in kept), encoding="utf-8")
    print(f"words {len(counts)}, kept {len(kept)}")
