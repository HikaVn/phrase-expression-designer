import pytest

from ped.note_step import StepEntry, from_tokens

PPQ = 480


def pitches(tokens, **kw):
    return [n.pitch for n in from_tokens(tokens, ppq=PPQ, **kw)]


def test_letters_enter_nearest_octave():
    assert pitches("C D E F G") == [60, 62, 64, 65, 67]


def test_number_sets_value_sticky():
    notes = from_tokens("4 C 2 D 4 E", ppq=PPQ)
    assert [n.duration_tick for n in notes] == [480, 960, 480]
    assert [n.start_tick for n in notes] == [0, 480, 1440]


def test_dot_adds_to_value():
    notes = from_tokens("4 . C", ppq=PPQ)  # dotted quarter
    assert notes[0].duration_tick == 720


def test_arrow_transposes_last_semitone():
    # C then up -> C#, then down twice -> B
    assert pitches("C up") == [61]
    assert pitches("C down") == [59]


def test_shift_arrow_transposes_octave():
    assert pitches("C shift-up") == [72]
    assert pitches("C shift-down") == [48]


def test_arrow_with_no_note_is_noop():
    assert pitches("up down") == []


def test_rest_advances_without_note():
    notes = from_tokens("4 C r C", ppq=PPQ)
    assert len(notes) == 2
    assert [n.start_tick for n in notes] == [0, 960]


def test_backspace_undoes_last_note_and_rewinds():
    notes = from_tokens("4 C D backspace E", ppq=PPQ)
    # C(0), D(480) removed, E placed back at 480
    assert [n.pitch for n in notes] == [60, 64]
    assert [n.start_tick for n in notes] == [0, 480]


def test_backspace_then_arrow_targets_new_last():
    # after backspace, transpose should affect the now-last note
    notes = from_tokens("C D backspace up", ppq=PPQ)
    assert [n.pitch for n in notes] == [61]  # C raised to C#


def test_aliases():
    assert pitches("C su") == [72]      # su = shift-up
    assert pitches("C sd") == [48]      # sd = shift-down
    assert from_tokens("C r", ppq=PPQ)[0].pitch == 60  # r = rest (no extra note)


def test_multidigit_value():
    notes = from_tokens("16 C", ppq=PPQ)
    assert notes[0].duration_tick == 120  # sixteenth


def test_velocity_and_articulation():
    notes = from_tokens("C D", velocity=100, articulation="legato")
    assert all(n.velocity == 100 and n.articulation_id == "legato" for n in notes)


def test_bad_value_raises():
    with pytest.raises(ValueError):
        StepEntry().set_duration(5)


def test_unknown_token_raises():
    with pytest.raises(ValueError):
        from_tokens("C Z")
