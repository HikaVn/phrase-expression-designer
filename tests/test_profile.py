from ped.profiles.instrument_profile import InstrumentProfile


def test_load_example(example_profile_path):
    profile = InstrumentProfile.load(example_profile_path)
    assert profile.id == "example_kontakt_strings_vln1"
    assert profile.note_naming == "C3=60"
    assert profile.playable_range.contains(72)
    assert profile.articulation_by_id("legato").trigger.mode == "latch"
    assert profile.mapping_for("intensity").cc_number == 1
    assert profile.calibration_by_id("dynamic_default") is not None


def test_save_load_roundtrip(example_profile_path, tmp_path):
    profile = InstrumentProfile.load(example_profile_path)
    out = tmp_path / "p.json"
    profile.save(out)
    again = InstrumentProfile.load(out)
    assert again.to_dict() == profile.to_dict()
