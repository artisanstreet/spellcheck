import argparse
from collections import Counter
from dataclasses import dataclass
from itertools import islice
from multiprocessing import Pool
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from tagger.align import align
from tagger.labels import Keep, apply_labels, encode
from tagger.words import split_words

schema = pa.schema([("words", pa.list_(pa.string())), ("labels", pa.list_(pa.string()))])


@dataclass(frozen=True)
class Example:
    words: tuple[str, ...]
    labels: tuple[str, ...]


@dataclass(frozen=True)
class Limits:
    min_words: int
    max_words: int
    max_edit_ratio: float


def label_pair(source_text: str, target_text: str, limits: Limits) -> Example | None:
    source = split_words(source_text)
    target = split_words(target_text)
    if not (limits.min_words <= len(source) <= limits.max_words and limits.min_words <= len(target) <= limits.max_words):
        return None
    words, labels = align(source, target)
    edits = sum(1 for label in labels if label != Keep())
    if edits / len(words) > limits.max_edit_ratio or apply_labels(words, labels) != target:
        return None
    return Example(words, tuple(encode(label) for label in labels))


def label_clean(text: str, limits: Limits) -> Example | None:
    return label_pair(text, text, limits)


@dataclass(frozen=True)
class Job:
    source: str
    target: str
    clean: bool
    limits: Limits


def run_job(job: Job) -> tuple[Example | None, Example | None]:
    return label_pair(job.source, job.target, job.limits), label_clean(job.target, job.limits) if job.clean else None


def pairs(path: Path):
    parquet = pq.ParquetFile(path)
    for batch in parquet.iter_batches(batch_size=10_000, columns=["input", "output"]):
        yield from zip(batch.column("input").to_pylist(), batch.column("output").to_pylist())


def write(writer: pq.ParquetWriter, examples: list[Example]) -> None:
    writer.write_table(
        pa.table({"words": [list(e.words) for e in examples], "labels": [list(e.labels) for e in examples]}, schema=schema)
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dev-size", type=int, default=10_000)
    parser.add_argument("--clean-every", type=int, default=8)
    arguments = parser.parse_args()

    limits = Limits(min_words=3, max_words=80, max_edit_ratio=0.35)
    arguments.output.mkdir(parents=True, exist_ok=True)
    counts: Counter[str] = Counter()
    totals: Counter[str] = Counter()
    jobs = (
        Job(source, target, index % arguments.clean_every == 0, limits)
        for index, (source, target) in enumerate(islice(pairs(arguments.input), arguments.limit))
    )
    with (
        pq.ParquetWriter(arguments.output / "dev.parquet", schema) as dev,
        pq.ParquetWriter(arguments.output / "train.parquet", schema) as train,
        Pool() as pool,
    ):
        buffer: list[Example] = []
        written = 0
        for corrupted, clean in pool.imap(run_job, jobs, chunksize=512):
            totals["pairs"] += 1
            kept = [example for example in (corrupted, clean) if example is not None]
            totals["skipped"] += corrupted is None
            buffer.extend(kept)
            if written >= arguments.dev_size:
                counts.update(label for example in kept for label in example.labels)
            if written < arguments.dev_size and written + len(buffer) >= arguments.dev_size:
                write(dev, buffer)
                written += len(buffer)
                buffer = []
            if len(buffer) >= 20_000:
                write(train, buffer)
                written += len(buffer)
                buffer = []
        if buffer:
            write(dev if written < arguments.dev_size else train, buffer)
            written += len(buffer)

    with open(arguments.output / "labels.tsv", "w") as file:
        file.writelines(f"{label}\t{count}\n" for label, count in counts.most_common())
    print(f"pairs {totals['pairs']}, skipped {totals['skipped']}, examples {written}, distinct labels {len(counts)}")
