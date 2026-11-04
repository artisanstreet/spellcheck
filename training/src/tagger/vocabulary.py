from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path

ignored = -100
keep = "KEEP"


@dataclass(frozen=True)
class Vocabulary:
    labels: tuple[str, ...]
    indices: dict[str, int] = field(init=False, repr=False, compare=False)

    def __post_init__(self) -> None:
        object.__setattr__(self, "indices", {label: index for index, label in enumerate(self.labels)})

    def index(self, label: str) -> int:
        return self.indices.get(label, ignored)


def read_counts(path: Path) -> Iterable[tuple[str, int]]:
    with open(path, encoding="utf-8") as file:
        for line in file:
            label, _, count = line.rstrip("\n").rpartition("\t")
            yield label, int(count)


def top_labels(counts: Iterable[tuple[str, int]], size: int) -> Vocabulary:
    ranked = sorted(counts, key=lambda entry: -entry[1])
    rest = tuple(label for label, _ in ranked if label != keep)
    return Vocabulary((keep, *rest[: size - 1]))


def word_targets(labels: Iterable[str], vocabulary: Vocabulary) -> tuple[tuple[int, ...], tuple[int, ...]]:
    labels = tuple(labels)
    return tuple(vocabulary.index(label) for label in labels), tuple(int(label != keep) for label in labels)


def token_targets(word_ids: list[int | None], values: tuple[int, ...]) -> list[int]:
    return [
        ignored if word is None or (position > 0 and word == word_ids[position - 1]) else values[word]
        for position, word in enumerate(word_ids)
    ]
