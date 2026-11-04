from tagger.frequencies import count_words


def test_counts_lowercased_words_and_keeps_contractions_whole():
    counts = count_words(["Don’t go, don't GO!", "It's 5 o'clock"])
    assert counts == {"don't": 2, "go": 2, "it's": 1, "o'clock": 1}
