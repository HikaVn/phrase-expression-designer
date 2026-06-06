from ped.core.curve import CurvePoint, ExpressionCurve
from ped.core.note import Note
from ped.core.track import Track
from ped.engine.expression_mapper import map_track_to_cc
from ped.profiles.articulation import CCMapping
from ped.profiles.calibration import CalibrationCurve, CalibrationPoint
from ped.profiles.instrument_profile import InstrumentProfile


def make_profile(step_tick):
    return InstrumentProfile(
        id="p",
        note_naming="C3=60",
        cc_mappings=[
            CCMapping(
                internal_parameter="intensity",
                target={"type": "cc", "cc": 1},
                curve_id="lin",
                step_tick=step_tick,
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
    t.expression_curves.append(
        ExpressionCurve("c", "intensity", [CurvePoint(0, 0.0, "linear"), CurvePoint(1920, 1.0, "linear")])
    )
    return t


def test_finer_step_produces_more_events():
    track = make_track()
    coarse = map_track_to_cc(track, make_profile(480), ppq=480)
    fine = map_track_to_cc(track, make_profile(30), ppq=480)
    assert len(fine) > len(coarse)


def test_step_tick_roundtrips_in_profile_json(tmp_path):
    profile = make_profile(45)
    out = tmp_path / "p.json"
    profile.save(out)
    again = InstrumentProfile.load(out)
    assert again.cc_mappings[0].step_tick == 45
