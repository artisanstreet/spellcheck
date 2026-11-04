import regex

word_pattern = regex.compile(r"[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*|\S")


def split_words(text: str) -> tuple[str, ...]:
    return tuple(match.group(0).replace("’", "'") for match in word_pattern.finditer(text))
