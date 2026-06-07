import copy

from ped.profiles.articulation import CCMapping
from ped.profiles.instrument_profile import InstrumentProfile
from ped.profiles.validation import validate_profile

EXAMPLE = "examples/profiles/example_kontakt_strings_vln1.json"


def test_input_cc_roundtrips():
    m = CCMapping(internal_parameter="intensity", target={"type": "cc", "cc": 1}, input_cc=1)
    again = CCMapping.from_dict(m.to_dict())
    assert again.input_cc == 1


def test_input_cc_omitted_when_none():
    m = CCMapping(internal_parameter="intensity", target={"type": "cc", "cc": 1})
    assert "inputCc" not in m.to_dict()
    assert CCMapping.from_dict(m.to_dict()).input_cc is None


def test_example_profile_has_input_cc_and_is_valid():
    profile = InstrumentProfile.load(EXAMPLE)
    assert profile.mapping_for("intensity").input_cc == 1
    report = validate_profile(profile)
    assert report.ok, [str(i) for i in report.errors]
    assert report.warnings == []


def test_input_cc_out_of_range_errors():
    profile = InstrumentProfile.load(EXAMPLE)
    data = copy.deepcopy(profile.to_dict())
    data["ccMappings"][0]["inputCc"] = 200
    report = validate_profile(InstrumentProfile.from_dict(data))
    assert any(i.code == "input_cc_out_of_range" for i in report.errors)
