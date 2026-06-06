from ped.core.curve import CurvePoint, ExpressionCurve
from ped.core.note import Note
from ped.core.track import Track
from ped.engine.performance import VelocityRules, apply_velocity_rules, detect_phrases
from ped.profiles.articulation import Articulation, Trigger
from ped.profiles.instrument_profile import InstrumentProfile

PPQ = 480


def profile():
    return InstrumentProfile(
        id="p",
        note_naming="C3=60",
        articulations=[
            Articulation(
                id="legato", name="Legato", type="long",
                trigger=Trigger(type="keyswitch", note=24),
                expression_behavior={"velocityRole": "secondary", "ccRole": "primary"},
            ),
            Articulation(
                id="spiccato", name="Spiccato", type="short",
                trigger=Trigger(type="keyswitch", note=26),
                expression_behavior={"velocityRole": "primary", "ccRole": "secondary"},
            ),
        ],
    )


def test_detect_phrases_splits_on_rest():
    notes = [
        Note(id="a", pitch=60, start_tick=0, duration_tick=460),
        Note(id="b", pitch=62, start_tick=480, duration_tick=460),   # connected
        Note(id="c", pitch=64, start_tick=480 * 4, duration_tick=460),  # after a long rest
    ]
    t = Track(id="t", name="v", notes=notes)
    phrases = detect_phrases(t, PPQ, gap_beats=1.0)
    assert len(phrases) == 2
    assert notes[0].phrase_id == notes[1].phrase_id
    assert notes[2].phrase_id != notes[0].phrase_id


def test_short_articulation_velocity_follows_intensity():
    notes = [
        Note(id="a", pitch=60, start_tick=0, duration_tick=100, velocity=64, articulation_id="spiccato"),
        Note(id="b", pitch=62, start_tick=1000, duration_tick=100, velocity=64, articulation_id="spiccato"),
    ]
    t = Track(id="t", name="v", notes=notes)
    t.expression_curves.append(
        ExpressionCurve("c", "intensity", [CurvePoint(0, 0.1, "linear"), CurvePoint(1000, 0.9, "linear")])
    )
    detect_phrases(t, PPQ, gap_beats=0.01)  # keep them separate so no phrase-end blends
    apply_velocity_rules(t, profile(), PPQ, rules=VelocityRules(downbeat_accent=0))
    # louder intensity later -> higher velocity
    assert notes[1].velocity > notes[0].velocity


def test_long_articulation_velocity_steady():
    # secondary velocityRole -> velocity not driven by intensity (CC carries it).
    notes = [
        Note(id="a", pitch=60, start_tick=10, duration_tick=100, velocity=70, articulation_id="legato"),
    ]
    t = Track(id="t", name="v", notes=notes)
    t.expression_curves.append(ExpressionCurve("c", "intensity", [CurvePoint(0, 1.0, "linear")]))
    apply_velocity_rules(t, profile(), PPQ, rules=VelocityRules(downbeat_accent=0, phrase_end_release=1.0))
    assert notes[0].velocity == 70


def test_downbeat_accent_applied():
    notes = [Note(id="a", pitch=60, start_tick=0, duration_tick=100, velocity=70, articulation_id="legato")]
    t = Track(id="t", name="v", notes=notes)
    apply_velocity_rules(t, profile(), PPQ, rules=VelocityRules(downbeat_accent=10, phrase_end_release=1.0))
    assert notes[0].velocity == 80  # 70 + 10 on the bar-1 downbeat


def test_phrase_end_release_softens_last_note():
    notes = [
        Note(id="a", pitch=60, start_tick=10, duration_tick=460, velocity=80, articulation_id="legato"),
        Note(id="b", pitch=62, start_tick=480, duration_tick=460, velocity=80, articulation_id="legato"),
    ]
    t = Track(id="t", name="v", notes=notes)
    detect_phrases(t, PPQ)
    apply_velocity_rules(t, profile(), PPQ, rules=VelocityRules(downbeat_accent=0, slur_softening=1.0, phrase_end_release=0.5))
    assert notes[1].velocity < notes[0].velocity  # last note released


def test_velocity_clamped():
    notes = [Note(id="a", pitch=60, start_tick=0, duration_tick=100, velocity=127, articulation_id="legato")]
    t = Track(id="t", name="v", notes=notes)
    apply_velocity_rules(t, profile(), PPQ, rules=VelocityRules(downbeat_accent=50))
    assert 1 <= notes[0].velocity <= 127
