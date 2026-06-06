from ped.core.note import Note
from ped.core.track import Track
from ped.engine.rule_engine import generate_articulation_events
from ped.profiles.articulation import Articulation, Trigger
from ped.profiles.instrument_profile import InstrumentProfile


def make_track(art_ids):
    notes = [
        Note(id=f"n{i}", pitch=60 + i, start_tick=i * 480, duration_tick=460, articulation_id=a)
        for i, a in enumerate(art_ids)
    ]
    return Track(id="t", name="v", notes=notes)


def profile_with(*arts):
    return InstrumentProfile(id="p", note_naming="C3=60", articulations=list(arts))


def test_cc_trigger_emitted():
    prof = profile_with(
        Articulation(id="open", name="Open", type="long",
                     trigger=Trigger(type="cc", cc=32, value=0)),
        Articulation(id="mute", name="Mute", type="long",
                     trigger=Trigger(type="cc", cc=32, value=64)),
    )
    ev = generate_articulation_events(make_track(["open", "mute"]), prof)
    assert [(c.cc, c.value) for c in ev.cc_events] == [(32, 0), (32, 64)]
    assert ev.keyswitches == []


def test_program_change_trigger_emitted():
    prof = profile_with(
        Articulation(id="p1", name="P1", type="long", trigger=Trigger(type="program_change", program=1)),
        Articulation(id="p2", name="P2", type="long", trigger=Trigger(type="program_change", program=5)),
    )
    ev = generate_articulation_events(make_track(["p1", "p2", "p2"]), prof)
    # latch: p2 repeated -> only two switches
    assert [pc.program for pc in ev.program_changes] == [1, 5]


def test_keyswitch_latch_dedup():
    prof = profile_with(
        Articulation(id="leg", name="Leg", type="long", trigger=Trigger(type="keyswitch", note=24)),
        Articulation(id="spi", name="Spi", type="short", trigger=Trigger(type="keyswitch", note=26)),
    )
    ev = generate_articulation_events(make_track(["leg", "leg", "spi"]), prof)
    assert [k.note for k in ev.keyswitches] == [24, 26]


def test_momentary_keyswitch_repeats():
    prof = profile_with(
        Articulation(id="leg", name="Leg", type="long",
                     trigger=Trigger(type="keyswitch", note=24, mode="momentary")),
    )
    ev = generate_articulation_events(make_track(["leg", "leg", "leg"]), prof)
    assert [k.note for k in ev.keyswitches] == [24, 24, 24]
