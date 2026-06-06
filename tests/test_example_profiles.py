import importlib.util
import json
from pathlib import Path

import pytest

from ped.profiles.instrument_profile import InstrumentProfile
from ped.profiles.validation import validate_profile

REPO = Path(__file__).resolve().parents[1]
PROFILE_DIR = REPO / "examples" / "profiles"
PROFILES = sorted(PROFILE_DIR.glob("*.json"))


@pytest.mark.parametrize("path", PROFILES, ids=lambda p: p.name)
def test_example_profile_valid(path):
    report = validate_profile(InstrumentProfile.load(path))
    assert report.ok, [str(i) for i in report.errors]
    assert report.warnings == []


@pytest.mark.parametrize("path", PROFILES, ids=lambda p: p.name)
def test_example_profile_matches_schema(path):
    if importlib.util.find_spec("jsonschema") is None:
        pytest.skip("jsonschema not installed")
    import jsonschema as js

    schema = json.loads((REPO / "schema/instrument_profile.schema.json").read_text())
    js.validate(json.loads(path.read_text()), schema)


def test_there_are_multiple_profiles():
    assert len(PROFILES) >= 3
