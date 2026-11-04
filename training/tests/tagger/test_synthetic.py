from tagger.synthetic import Pair, capitalise_sentences, unique_pairs


def test_keeps_well_formed_pairs_with_normalised_spacing():
    lines = ['{"source": "i  has a dog ", "target": "I have a dog", "errors": ["agreement"]}']
    assert unique_pairs(lines) == (Pair("i has a dog", "I have a dog"),)


def test_drops_malformed_empty_and_duplicate_lines():
    lines = [
        "not json",
        '{"source": "hi there"}',
        '{"source": " ", "target": "Hi."}',
        '{"source": 3, "target": "three"}',
        '{"source": "See you tmrw", "target": "See you tmrw"}',
        '{"source": "See you  tmrw", "target": "See you tmrw"}',
    ]
    assert unique_pairs(lines) == (Pair("See you tmrw", "See you tmrw"),)


def test_capitalises_every_sentence_start_in_the_target():
    assert unique_pairs(['{"source": "hey. you there? ok", "target": "hey. you there? ok"}']) == (
        Pair("hey. you there? ok", "Hey. You there? Ok"),
    )


def test_leaves_mixed_case_words_and_mid_sentence_words_alone():
    assert capitalise_sentences("iPhone died, sorry. call me at 5 pm") == "iPhone died, sorry. Call me at 5 pm"
