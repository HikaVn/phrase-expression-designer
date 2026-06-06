import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCHEMA = REPO / "schema"


def test_schema_files_are_valid_json():
    for name in ("project.schema.json", "instrument_profile.schema.json"):
        data = json.loads((SCHEMA / name).read_text(encoding="utf-8"))
        assert data["$schema"].startswith("https://json-schema.org/")
        assert "$defs" in data


def test_example_profile_matches_schema_if_jsonschema_available():
    jsonschema = __import__("importlib").util.find_spec("jsonschema")
    if jsonschema is None:
        import pytest
        pytest.skip("jsonschema not installed")
    import jsonschema as js  # noqa: E402

    schema = json.loads((SCHEMA / "instrument_profile.schema.json").read_text())
    profile = json.loads(
        (REPO / "examples/profiles/example_kontakt_strings_vln1.json").read_text()
    )
    js.validate(profile, schema)
