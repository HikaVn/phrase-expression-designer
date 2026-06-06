import pytest

from ped.core.pitch import note_name_to_number, number_to_note_name


def test_c3_60_convention():
    assert note_name_to_number("C3", "C3=60") == 60
    assert note_name_to_number("C0", "C3=60") == 24  # classic keyswitch row


def test_c4_60_convention():
    assert note_name_to_number("C4", "C4=60") == 60
    assert note_name_to_number("C0", "C4=60") == 12


def test_conventions_differ_by_one_octave():
    for name in ("C0", "D#2", "A3", "G5"):
        assert note_name_to_number(name, "C3=60") - note_name_to_number(name, "C4=60") == 12


def test_accidentals_and_negative_octaves():
    assert note_name_to_number("C#3", "C3=60") == 61
    assert note_name_to_number("Db3", "C3=60") == 61
    assert note_name_to_number("C-1", "C4=60") == 0  # MIDI 0 under C4=60
    assert note_name_to_number("C-2", "C3=60") == 0  # MIDI 0 under C3=60


def test_roundtrip_number_to_name():
    for naming in ("C3=60", "C4=60"):
        for n in (0, 24, 60, 61, 103, 127):
            name = number_to_note_name(n, naming)
            assert note_name_to_number(name, naming) == n


def test_unknown_naming_raises():
    with pytest.raises(ValueError):
        note_name_to_number("C3", "C5=60")


def test_bad_name_raises():
    with pytest.raises(ValueError):
        note_name_to_number("H3", "C3=60")
    with pytest.raises(ValueError):
        note_name_to_number("C", "C3=60")
