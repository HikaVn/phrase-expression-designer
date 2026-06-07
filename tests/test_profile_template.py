from ped.core.pitch import note_name_to_number
from ped.profile_template import build_starter_profile, infer_engine, slugify
from ped.profiles.instrument_profile import InstrumentProfile
from ped.profiles.validation import validate_profile


def test_slugify():
    assert slugify("Kontakt 8", "Vln1") == "kontakt_8_vln1"
    assert slugify(None, None) == "new_profile"
    assert slugify("Spitfire — Strings!") == "spitfire_strings"


def test_infer_engine():
    assert infer_engine("Kontakt 8") == "Kontakt"
    assert infer_engine("EastWest Opus") == "Opus"
    assert infer_engine("Some Unknown Synth") is None
    assert infer_engine(None) is None


def test_starter_profile_is_valid():
    p = build_starter_profile("my_strings", engine="Kontakt", library="My Lib", patch="Vln 1")
    report = validate_profile(p)
    assert report.ok, [str(i) for i in report.errors]
    assert report.warnings == []
    assert {a.id for a in p.articulations} == {"legato", "sustain", "staccato"}
    assert p.mapping_for("intensity").input_cc == 1
    assert p.calibration_by_id("dyn_default") is not None


def test_keyswitch_notes_follow_naming():
    c3 = build_starter_profile("a", note_naming="C3=60")
    c4 = build_starter_profile("b", note_naming="C4=60")
    leg3 = c3.articulation_by_id("legato").trigger.note
    leg4 = c4.articulation_by_id("legato").trigger.note
    assert leg3 == note_name_to_number("C0", "C3=60")  # 24
    assert leg4 == note_name_to_number("C0", "C4=60")  # 12
    assert leg3 - leg4 == 12


def test_roundtrip_save_load(tmp_path):
    p = build_starter_profile("rt", engine="Kontakt", library="Lib")
    out = tmp_path / "rt.json"
    p.save(out)
    again = InstrumentProfile.load(out)
    assert again.to_dict() == p.to_dict()
    assert validate_profile(again).ok


def test_keyswitches_clear_of_playable_range():
    # keyswitches must not collide with the playable range (a validation error).
    p = build_starter_profile("x")
    report = validate_profile(p)
    assert not any(i.code == "keyswitch_range_collision" for i in report.issues)
