import pytest

from tagger.align import align
from tagger.labels import Append, CaseCapital, Delete, Keep, Replace, apply_labels, decode, encode, start
from tagger.words import split_words


def labels_for(source: str, target: str):
    return align(split_words(source), split_words(target))[1]


def test_labels_each_kind_of_edit():
    assert labels_for("i has a apple", "I have an apple") == (Keep(), CaseCapital(), Replace("have"), Replace("an"), Keep())
    assert labels_for("this is is it", "this is it") == (Keep(), Keep(), Keep(), Delete(), Keep())
    assert labels_for("going store", "going to the store") == (Keep(), Append("to the"), Keep())


def test_inserts_at_the_start_attach_to_the_start_marker():
    words, labels = align(split_words("is fine"), split_words("It is fine"))
    assert words[0] == start
    assert labels[0] == Append("It")


def test_insert_after_a_case_change_keeps_the_case_change():
    assert labels_for("he went home", "He then went home")[1] == Replace("He then")


@pytest.mark.parametrize(
    ("source", "target"),
    [
        ("Bitcoin is for $7,094 this morning, which CoinDesk says.", "Bitcoin goes for $7,094 this morning, according to CoinDesk."),
        ("Much many brands and sellers still in the market.", "Many brands and sellers still in the market."),
        ("this is is the latest Maintenance release of Samba 3.6", "This is is the latest maintenance release of Samba 3.6."),
        ("Watcch as this Dodge gets smoked by a Tesla - with the drag strip.", "Watch as this Dodge gets smoked by a Tesla at the drag strip."),
        ("can not stop", "cannot stop"),
        ("", "Hello."),
        ("Hello.", ""),
    ],
)
def test_applying_labels_reproduces_the_target(source, target):
    words, labels = align(split_words(source), split_words(target))
    assert apply_labels(words, labels) == split_words(target)


def test_labels_round_trip_through_their_encoding():
    for label in (Keep(), Delete(), Replace("went to"), Append("the"), CaseCapital()):
        assert decode(encode(label)) == label
