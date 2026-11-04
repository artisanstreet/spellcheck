from tagger.prepare import Limits, label_clean, label_pair

limits = Limits(min_words=3, max_words=10, max_edit_ratio=0.35)


def test_labels_a_light_correction():
    example = label_pair("She go to school .", "She goes to school .", limits)
    assert example is not None
    assert example.words == ("$START", "She", "go", "to", "school", ".")
    assert example.labels == ("KEEP", "KEEP", "REPLACE_goes", "KEEP", "KEEP", "KEEP")


def test_rejects_rewrites():
    assert label_pair("The cat sat on the mat .", "A dog was lying under it !", limits) is None


def test_rejects_short_and_long_sentences():
    assert label_pair("Hi .", "Hi !", limits) is None
    assert label_pair(" ".join(["word"] * 11), " ".join(["word"] * 11), limits) is None


def test_clean_examples_keep_everything():
    example = label_clean("This sentence is already fine .", limits)
    assert example is not None
    assert set(example.labels) == {"KEEP"}
