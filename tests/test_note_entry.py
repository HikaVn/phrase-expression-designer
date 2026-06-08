import pytest

from ped.note_entry import parse_note_entry

PPQ = 480


def midis(text, **kw):
    return [n.pitch for n in parse_note_entry(text, ppq=PPQ, **kw)]


def test_ascending_nearest_octave():
    # default octave 4: C4=60, then nearest stepwise up
    assert midis("C D E F G") == [60, 62, 64, 65, 67]


def test_nearest_picks_closest_not_always_up():
    # after D4 (62), B nearest is B3 (59), not B4 (71)
    assert midis("D B") == [62, 59]


def test_explicit_octave_scientific():
    assert midis("C5") == [72]
    assert midis("C4 C3") == [60, 48]


def test_octave_shift_signs():
    # C4=60; +C -> nearest C to 60 then up an octave = 72; -C -> nearest C to 72 (72) down = 60
    assert midis("C +C -C") == [60, 72, 60]


def test_accidentals():
    assert midis("C# Db") == [61, 61]   # enharmonic, both land at 61
    assert midis("Cx") == [62]          # double sharp


def test_bb_nearest_to_reference():
    # first note, reference C4(60): Bb pitch class 10 -> nearest is 58 (Bb3)
    assert midis("Bb") == [58]


def test_sticky_duration_and_start_ticks():
    notes = parse_note_entry("4 C 2 D 4 E", ppq=PPQ)
    assert [n.duration_tick for n in notes] == [480, 960, 480]
    assert [n.start_tick for n in notes] == [0, 480, 1440]


def test_dotted_duration():
    notes = parse_note_entry("4. C", ppq=PPQ)
    assert notes[0].duration_tick == 720  # 480 * 1.5


def test_leading_duration_on_note():
    notes = parse_note_entry("8C 8D", ppq=PPQ)
    assert [n.duration_tick for n in notes] == [240, 240]


def test_rest_advances_time_without_note():
    notes = parse_note_entry("4 C r C", ppq=PPQ)
    assert len(notes) == 2
    assert [n.start_tick for n in notes] == [0, 960]  # rest consumed 480


def test_barline_ignored():
    assert midis("C D | E F") == [60, 62, 64, 65]


def test_velocity_and_articulation_applied():
    notes = parse_note_entry("C D", velocity=100, articulation="legato")
    assert all(n.velocity == 100 and n.articulation_id == "legato" for n in notes)


def test_start_octave_option():
    assert midis("C", default_octave=5) == [72]


def test_bad_token_raises():
    with pytest.raises(ValueError):
        parse_note_entry("C H D")  # H is not a note


def test_out_of_range_raises():
    with pytest.raises(ValueError):
        parse_note_entry("C10")  # (10+1)*12 = 132 > 127
