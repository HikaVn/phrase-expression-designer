import pytest

from ped.instrument_scan import InstrumentPlugin
from ped.interactive import ask, choose
from ped.profiles.validation import validate_profile
from ped.wizards import calibration_wizard, new_profile_wizard


def scripted(answers):
    """Return an input_fn that pops scripted answers in order (ignores the prompt)."""
    answers = list(answers)
    return lambda _prompt: answers.pop(0)


def sink():
    return lambda _msg: None


# --- interactive helpers ---------------------------------------------------

def test_ask_default_and_value():
    assert ask("x", "def", input_fn=scripted([""]), output_fn=sink()) == "def"
    assert ask("x", "def", input_fn=scripted(["hi"]), output_fn=sink()) == "hi"


def test_choose_returns_value():
    opts = [("a", 1), ("b", 2), ("c", 3)]
    assert choose(opts, input_fn=scripted(["2"]), output_fn=sink()) == 2


def test_choose_skip():
    opts = [("a", 1)]
    assert choose(opts, allow_skip=True, input_fn=scripted(["0"]), output_fn=sink()) is None


def test_choose_retries_on_bad_input():
    opts = [("a", 1), ("b", 2)]
    assert choose(opts, input_fn=scripted(["x", "9", "1"]), output_fn=sink()) == 1


def test_choose_empty_returns_none():
    assert choose([], input_fn=scripted([]), output_fn=sink()) is None


# --- new-profile wizard ----------------------------------------------------

def fake_scan():
    return [
        InstrumentPlugin(format="AU", name="Kontakt 8", manufacturer="Native Instruments",
                         au_type="aumu", subtype="NiK8", manufacturer_code="-NI-"),
        InstrumentPlugin(format="VST3", name="Opus", manufacturer=None),
    ]


def test_new_profile_wizard_pick_and_defaults():
    # pick #1 (Kontakt 8); accept defaults for engine/library, set patch, default naming/id
    answers = ["1", "", "", "Violin 1", "", ""]
    profile = new_profile_wizard(scan=fake_scan, input_fn=scripted(answers), output_fn=sink())
    assert profile.engine == "Kontakt"          # inferred default accepted
    assert profile.library == "Kontakt 8"        # default = chosen name
    assert profile.patch == "Violin 1"
    assert profile.note_naming == "C3=60"
    assert profile.id == "kontakt_8_violin_1"
    assert validate_profile(profile).ok


def test_new_profile_wizard_skip_then_manual_name():
    # skip the menu (0), type a name, override library, C4=60
    answers = ["0", "My Synth", "", "Lib X", "", "C4=60", "custom_id"]
    profile = new_profile_wizard(scan=fake_scan, input_fn=scripted(answers), output_fn=sink())
    assert profile.id == "custom_id"
    assert profile.library == "Lib X"
    assert profile.note_naming == "C4=60"
    assert validate_profile(profile).ok


# --- calibration wizard ----------------------------------------------------

def test_calibration_wizard_partial_table():
    # ppp, pp, p, mp, mf, f, ff, fff  → fill p / mf / ff, blank the rest, then curve id
    answers = ["", "", "30", "", "70", "", "110", "", "my_dyn"]
    curve = calibration_wizard(input_fn=scripted(answers), output_fn=sink())
    assert curve.id == "my_dyn"
    assert curve.map(0.0) == 30   # lowest provided point
    assert curve.map(1.0) == 110  # highest provided point


def test_calibration_wizard_skips_bad_values():
    # invalid + out-of-range are skipped; need >=1 level for build
    answers = ["abc", "200", "64", "", "", "", "", "", "dyn"]
    curve = calibration_wizard(input_fn=scripted(answers), output_fn=sink())
    assert curve.id == "dyn"
    assert curve.map(0.0) == 64  # only ppp=64 survived (abc/200 skipped)


def test_calibration_wizard_empty_raises():
    answers = ["", "", "", "", "", "", "", "", "dyn"]
    with pytest.raises(ValueError):
        calibration_wizard(input_fn=scripted(answers), output_fn=sink())
