import copy

from ped.profiles.instrument_profile import InstrumentProfile
from ped.profiles.validation import validate_profile


def test_example_profile_is_valid(example_profile_dict):
    profile = InstrumentProfile.from_dict(example_profile_dict)
    report = validate_profile(profile)
    assert report.ok, [str(i) for i in report.errors]
    assert report.warnings == []


def test_duplicate_keyswitch_detected(example_profile_dict):
    data = copy.deepcopy(example_profile_dict)
    # Make spiccato collide with legato (both note 24).
    for art in data["articulations"]:
        if art["id"] == "spiccato":
            art["trigger"]["note"] = 24
    report = validate_profile(InstrumentProfile.from_dict(data))
    assert any(i.code == "keyswitch_duplicate" for i in report.errors)


def test_keyswitch_inside_playable_range(example_profile_dict):
    data = copy.deepcopy(example_profile_dict)
    for art in data["articulations"]:
        if art["id"] == "legato":
            art["trigger"]["note"] = 60  # inside 55-103
    report = validate_profile(InstrumentProfile.from_dict(data))
    assert any(i.code == "keyswitch_range_collision" for i in report.errors)


def test_missing_calibration_reference(example_profile_dict):
    data = copy.deepcopy(example_profile_dict)
    data["ccMappings"][0]["curveId"] = "does_not_exist"
    report = validate_profile(InstrumentProfile.from_dict(data))
    assert any(i.code == "calibration_missing" for i in report.errors)


def test_cc_out_of_range(example_profile_dict):
    data = copy.deepcopy(example_profile_dict)
    data["ccMappings"][0]["target"]["cc"] = 200
    report = validate_profile(InstrumentProfile.from_dict(data))
    assert any(i.code == "cc_out_of_range" for i in report.errors)


def test_note_name_mismatch_warns(example_profile_dict):
    data = copy.deepcopy(example_profile_dict)
    # note 24 with noteName C0 is correct under C3=60; break the name only.
    for art in data["articulations"]:
        if art["id"] == "legato":
            art["trigger"]["noteName"] = "C1"  # C1 under C3=60 == 36, != 24
    report = validate_profile(InstrumentProfile.from_dict(data))
    assert any(i.code == "keyswitch_note_mismatch" for i in report.warnings)


def test_missing_cc_mappings_warns(example_profile_dict):
    data = copy.deepcopy(example_profile_dict)
    data["ccMappings"] = []
    report = validate_profile(InstrumentProfile.from_dict(data))
    assert report.ok  # warnings only
    assert any(i.code == "cc_unassigned" for i in report.warnings)
