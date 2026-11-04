from dataclasses import dataclass

start = "$START"


@dataclass(frozen=True)
class Keep:
    pass


@dataclass(frozen=True)
class Delete:
    pass


@dataclass(frozen=True)
class Replace:
    text: str


@dataclass(frozen=True)
class Append:
    text: str


@dataclass(frozen=True)
class CaseCapital:
    pass


@dataclass(frozen=True)
class CaseLower:
    pass


type Label = Keep | Delete | Replace | Append | CaseCapital | CaseLower


def encode(label: Label) -> str:
    match label:
        case Keep():
            return "KEEP"
        case Delete():
            return "DELETE"
        case Replace(text):
            return f"REPLACE_{text}"
        case Append(text):
            return f"APPEND_{text}"
        case CaseCapital():
            return "CASE_CAPITAL"
        case CaseLower():
            return "CASE_LOWER"


def decode(value: str) -> Label:
    match value.partition("_"):
        case ("KEEP", "", ""):
            return Keep()
        case ("DELETE", "", ""):
            return Delete()
        case ("CASE", "_", "CAPITAL"):
            return CaseCapital()
        case ("CASE", "_", "LOWER"):
            return CaseLower()
        case ("REPLACE", "_", text):
            return Replace(text)
        case ("APPEND", "_", text):
            return Append(text)
        case _:
            raise ValueError(f"unknown label {value}")


def apply_label(word: str, label: Label) -> tuple[str, ...]:
    match label:
        case Keep():
            return (word,)
        case Delete():
            return ()
        case Replace(text):
            return tuple(text.split(" "))
        case Append(text):
            return (word, *text.split(" "))
        case CaseCapital():
            return (word[:1].upper() + word[1:],)
        case CaseLower():
            return (word.lower(),)


def apply_labels(words: tuple[str, ...], labels: tuple[Label, ...]) -> tuple[str, ...]:
    return tuple(part for word, label in zip(words, labels, strict=True) for part in apply_label(word, label) if part != start)
