from ped.core.note import Note
from ped.core.track import Track
from ped.engine.performance import LegatoRules, apply_legato_overlap
from ped.profiles.articulation import Articulation, Trigger
from ped.profiles.instrument_profile import InstrumentProfile


def profile():
    return InstrumentProfile(
        id="p",
        note_naming="C3=60",
        articulations=[
            Articulation(id="legato", name="Legato", type="long",
                         trigger=Trigger(type="keyswitch", note=24)),
            Articulation(id="spiccato", name="Spiccato", type="short",
                         trigger=Trigger(type="keyswitch", note=26)),
        ],
    )


def test_connected_long_notes_overlap():
    notes = [
        Note(id="a", pitch=60, start_tick=0, duration_tick=470, articulation_id="legato"),
        Note(id="b", pitch=62, start_tick=480, duration_tick=470, articulation_id="legato"),
    ]
    t = Track(id="t", name="v", notes=notes)
    apply_legato_overlap(t, profile(), LegatoRules(connect_gap_ticks=30, overlap_ticks=20))
    # first note now reaches 20 ticks past the second note's start
    assert notes[0].end_tick == 500


def test_large_gap_not_connected():
    notes = [
        Note(id="a", pitch=60, start_tick=0, duration_tick=400, articulation_id="legato"),
        Note(id="b", pitch=62, start_tick=900, duration_tick=400, articulation_id="legato"),
    ]
    t = Track(id="t", name="v", notes=notes)
    apply_legato_overlap(t, profile(), LegatoRules(connect_gap_ticks=30))
    assert notes[0].end_tick == 400  # unchanged


def test_short_articulation_not_overlapped():
    notes = [
        Note(id="a", pitch=60, start_tick=0, duration_tick=100, articulation_id="spiccato"),
        Note(id="b", pitch=62, start_tick=120, duration_tick=100, articulation_id="spiccato"),
    ]
    t = Track(id="t", name="v", notes=notes)
    apply_legato_overlap(t, profile(), LegatoRules(connect_gap_ticks=30, overlap_ticks=20))
    assert notes[0].end_tick == 100  # short notes are not connected


def test_overlap_never_past_next_note_end():
    notes = [
        Note(id="a", pitch=60, start_tick=0, duration_tick=470, articulation_id="legato"),
        Note(id="b", pitch=62, start_tick=480, duration_tick=5, articulation_id="legato"),
    ]
    t = Track(id="t", name="v", notes=notes)
    apply_legato_overlap(t, profile(), LegatoRules(connect_gap_ticks=30, overlap_ticks=100))
    assert notes[0].end_tick < notes[1].end_tick
