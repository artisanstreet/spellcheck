from tagger.words import split_words


def test_splits_like_the_typescript_harness():
    assert split_words("Don’t pay $7,094 now!") == ("Don't", "pay", "$", "7", ",", "094", "now", "!")
