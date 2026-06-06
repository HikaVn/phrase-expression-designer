from ped.core.curve import CurvePoint, ExpressionCurve
from ped.core.note import Note
from ped.core.track import Track
from ped.engine.expression_mapper import map_track_to_cc
from ped.engine.rule_engine import generate_keyswitches
from ped.engine.templates import build_curve, template_names
from ped.profiles.instrument_profile import InstrumentProfile


def make_track(profile_id="p"):
    notes = [
        Note(id="n0", pitch=60, start_tick=0, duration_tick=470, articulation_id="legato"),
        Note(id="n1", pitch=62, start_tick=480, duration_tick=470, articulation_id="legato"),
        Note(id="n2", pitch=64, start_tick=960, duration_tick=470, articulation_id="spiccato"),
    ]
    t = Track(id="t0", name="Vln", instrument_profile_id=profile_id, notes=notes)
    t.expression_curves.append(
        ExpressionCurve("c_int", "intensity", [
            CurvePoint(0, 0.2, "smooth"),
            CurvePoint(1430, 0.9, "smooth"),
        ])
    )
    return t


def test_templates_registered():
    names = template_names()
    assert "natural_swell" in names and "phrase_arch" in names


def test_build_curve_spans_range():
    c = build_curve("phrase_arch", "x", 0, 1000)
    assert c.parameter == "intensity"
    assert c.points[0].tick == 0
    assert c.points[-1].tick == 1000
    assert c.value_at(500) > c.value_at(0)  # arch peaks in the middle


def test_map_track_to_cc_in_range(example_profile_path):
    profile = InstrumentProfile.load(example_profile_path)
    events = map_track_to_cc(make_track(), profile, ppq=480, bpm=120.0)
    assert events, "expected CC events for intensity->CC1"
    assert all(0 <= e.value <= 127 for e in events)
    assert all(e.cc == 1 for e in events)  # only intensity curve present -> CC1
    # ticks are non-decreasing
    assert events == sorted(events)


def test_no_duplicate_consecutive_cc(example_profile_path):
    profile = InstrumentProfile.load(example_profile_path)
    events = [e for e in map_track_to_cc(make_track(), profile, ppq=480) if e.cc == 1]
    values = [e.value for e in events]
    assert all(a != b for a, b in zip(values, values[1:], strict=False))


def test_keyswitch_latch_only_on_change(example_profile_path):
    profile = InstrumentProfile.load(example_profile_path)
    ks = generate_keyswitches(make_track(), profile)
    # legato (24) once, then spiccato (26) once -> two switches, not three.
    assert [e.note for e in ks] == [24, 26]


def test_keyswitch_placed_before_note(example_profile_path):
    profile = InstrumentProfile.load(example_profile_path)
    ks = generate_keyswitches(make_track(), profile, lead_tick=10)
    assert ks[0].tick == 0          # clamped (note starts at 0)
    assert ks[1].tick == 960 - 10   # spiccato note starts at 960
