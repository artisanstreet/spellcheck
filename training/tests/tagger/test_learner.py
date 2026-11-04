from tagger.learner import Correction, sentence_pairs

text = "I has a dog. It are big.  We like it."


def test_applies_corrections_per_sentence():
    corrections = (Correction(2, 5, "have"), Correction(16, 19, "is"))
    assert sentence_pairs(text, corrections) == (
        ("I has a dog.", "I have a dog."),
        ("It are big.", "It is big."),
        ("We like it.", "We like it."),
    )


def test_drops_sentences_with_unknown_or_crossing_corrections():
    corrections = (Correction(2, 5, None), Correction(11, 15, ". It"))
    assert sentence_pairs(text, corrections) == (("We like it.", "We like it."),)


def test_insertions_at_the_end_of_a_sentence_stay_with_it():
    assert sentence_pairs("I like it", (Correction(9, 9, "."),)) == (("I like it", "I like it."),)
