from difflib import SequenceMatcher
from functools import reduce

from tagger.labels import Append, CaseCapital, CaseLower, Delete, Keep, Label, Replace, start


def word_label(source: str, target: str) -> Label:
    match target:
        case _ if target == source:
            return Keep()
        case _ if target.lower() != source.lower():
            return Replace(target)
        case _ if target == source[:1].upper() + source[1:]:
            return CaseCapital()
        case _ if target == source.lower():
            return CaseLower()
        case _:
            return Replace(target)


def with_inserted(word: str, label: Label, text: str) -> Label:
    match label:
        case Keep():
            return Append(text)
        case CaseCapital():
            return Replace(f"{word[:1].upper()}{word[1:]} {text}")
        case CaseLower():
            return Replace(f"{word.lower()} {text}")
        case Delete():
            return Replace(text)
        case Replace(existing):
            return Replace(f"{existing} {text}")
        case Append(existing):
            return Append(f"{existing} {text}")


def replaced(labels: tuple[Label, ...], index: int, label: Label) -> tuple[Label, ...]:
    return labels[:index] + (label,) + labels[index + 1 :]


def apply_opcode(
    labels: tuple[Label, ...], opcode: tuple[str, int, int, int, int], source: tuple[str, ...], target: tuple[str, ...]
) -> tuple[Label, ...]:
    tag, i1, i2, j1, j2 = opcode
    match tag:
        case "equal":
            return labels
        case "delete":
            return labels[: i1 + 1] + (Delete(),) * (i2 - i1) + labels[i2 + 1 :]
        case "insert":
            return replaced(labels, i1, with_inserted((start, *source)[i1], labels[i1], " ".join(target[j1:j2])))
        case "replace" if i2 - i1 == j2 - j1:
            return labels[: i1 + 1] + tuple(word_label(s, t) for s, t in zip(source[i1:i2], target[j1:j2])) + labels[i2 + 1 :]
        case "replace":
            return labels[: i1 + 1] + (Replace(" ".join(target[j1:j2])),) + (Delete(),) * (i2 - i1 - 1) + labels[i2 + 1 :]
        case _:
            raise ValueError(f"unknown opcode {tag}")


def align(source: tuple[str, ...], target: tuple[str, ...]) -> tuple[tuple[str, ...], tuple[Label, ...]]:
    words = (start, *source)
    opcodes = SequenceMatcher(None, source, target, autojunk=False).get_opcodes()
    labels = reduce(lambda acc, opcode: apply_opcode(acc, opcode, source, target), opcodes, (Keep(),) * len(words))
    return words, labels
