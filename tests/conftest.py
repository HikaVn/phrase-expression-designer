import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = REPO_ROOT / "examples"


@pytest.fixture
def example_profile_path() -> Path:
    return EXAMPLES / "profiles" / "example_kontakt_strings_vln1.json"


@pytest.fixture
def example_profile_dict(example_profile_path) -> dict:
    return json.loads(example_profile_path.read_text(encoding="utf-8"))


@pytest.fixture
def sample_midi_path() -> Path:
    return EXAMPLES / "midi" / "simple_phrase.mid"
