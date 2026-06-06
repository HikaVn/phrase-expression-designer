from ped.profiles.instrument_profile import InstrumentProfile
from ped.project_checks import validate_project_dict


def good_project():
    return {
        "schemaVersion": "0.1.0",
        "ppq": 480,
        "tracks": [
            {
                "id": "t0",
                "name": "Vln",
                "phrases": [{"id": "ph1", "startTick": 0, "endTick": 960}],
                "notes": [
                    {"id": "n0", "pitch": 60, "startTick": 0, "durationTick": 460,
                     "velocity": 80, "phraseId": "ph1"}
                ],
                "expressionCurves": [
                    {"id": "c0", "parameter": "intensity",
                     "points": [{"tick": 0, "value": 0.5, "shape": "smooth"}]}
                ],
            }
        ],
    }


def test_valid_project_passes():
    report = validate_project_dict(good_project())
    assert report.ok, [str(i) for i in report.errors]


def test_pitch_out_of_range():
    p = good_project()
    p["tracks"][0]["notes"][0]["pitch"] = 200
    report = validate_project_dict(p)
    assert any(i.code == "note_pitch_range" for i in report.errors)


def test_curve_value_out_of_range():
    p = good_project()
    p["tracks"][0]["expressionCurves"][0]["points"][0]["value"] = 1.5
    report = validate_project_dict(p)
    assert any(i.code == "curve_value_range" for i in report.errors)


def test_bad_ppq():
    p = good_project()
    p["ppq"] = 0
    report = validate_project_dict(p)
    assert any(i.code == "ppq_invalid" for i in report.errors)


def test_unknown_phrase_ref_warns():
    p = good_project()
    p["tracks"][0]["notes"][0]["phraseId"] = "ghost"
    report = validate_project_dict(p)
    assert any(i.code == "note_phrase_missing" for i in report.warnings)


def test_cross_check_with_profile():
    p = good_project()
    p["tracks"][0]["notes"][0]["articulationId"] = "unknown_art"
    profile = InstrumentProfile(id="p", note_naming="C3=60")
    report = validate_project_dict(p, profile)
    assert any(i.code == "note_articulation_unknown" for i in report.warnings)
    assert any(i.code == "curve_parameter_unmapped" for i in report.warnings)
