from ped.core.curve import CurvePoint, ExpressionCurve
from ped.core.note import Note
from ped.core.track import Track
from ped.engine.expression_mapper import map_track_to_cc
from ped.profiles.articulation import CCMapping
from ped.profiles.calibration import CalibrationCurve, CalibrationPoint
from ped.profiles.instrument_profile import InstrumentProfile


def make_profile(look_ahead_ms):
    return InstrumentProfile(
        id="p",
        note_naming="C3=60",
        cc_mappings=[
            CCMapping(
                internal_parameter="intensity",
                target={"type": "cc", "cc": 1},
                curve_id="lin",
                look_ahead_ms=look_ahead_ms,
            )
        ],
        calibration_curves=[
            CalibrationCurve(
                id="lin",
                points=[CalibrationPoint(0.0, 0), CalibrationPoint(1.0, 127)],
                interpolation="linear",
            )
        ],
    )


def make_track():
    t = Track(id="t", name="v", notes=[Note(id="n", pitch=60, start_tick=0, duration_tick=1920)])
    # Ramp 0 -> 1 over the track.
    t.expression_curves.append(
        ExpressionCurve("c", "intensity", [CurvePoint(0, 0.0, "linear"), CurvePoint(1920, 1.0, "linear")])
    )
    return t


def _value_at_tick(events, tick):
    val = 0
    for e in events:
        if e.tick <= tick:
            val = e.value
        else:
            break
    return val


def test_lookahead_leads_the_curve():
    track = make_track()
    base = map_track_to_cc(track, make_profile(0), ppq=480, bpm=120.0)
    ahead = map_track_to_cc(track, make_profile(500), ppq=480, bpm=120.0)
    # With lookahead the CC at an early tick should already be higher (it read the
    # rising curve from further ahead).
    assert _value_at_tick(ahead, 240) > _value_at_tick(base, 240)


def test_lookahead_zero_matches_default():
    track = make_track()
    a = map_track_to_cc(track, make_profile(0), ppq=480, bpm=120.0)
    b = map_track_to_cc(track, make_profile(0.0), ppq=480, bpm=120.0)
    assert [(e.tick, e.value) for e in a] == [(e.tick, e.value) for e in b]
