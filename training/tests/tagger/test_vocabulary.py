from tagger.vocabulary import Vocabulary, ignored, token_targets, top_labels, word_targets


def test_keep_comes_first_and_rare_labels_are_cut():
    counts = [("DELETE", 50), ("KEEP", 900), ("REPLACE_goes", 7), ("APPEND_,", 30)]
    assert top_labels(counts, 3).labels == ("KEEP", "DELETE", "APPEND_,")


def test_unknown_labels_are_ignored_but_still_detected():
    vocabulary = Vocabulary(("KEEP", "DELETE"))
    assert word_targets(["KEEP", "DELETE", "REPLACE_recieved"], vocabulary) == ((0, 1, ignored), (0, 1, 1))


def test_only_the_first_token_of_each_word_carries_its_target():
    word_ids = [None, 0, 0, 1, 2, 2, 2, None]
    assert token_targets(word_ids, (5, 6, 7)) == [ignored, 5, ignored, 6, 7, ignored, ignored, ignored]
