import copy

from ped.profile_editor import (
    add_articulation,
    add_cc_mapping,
    edit_metadata,
    edit_profile_wizard,
    remove_articulation,
    remove_cc_mapping,
)
from ped.profile_template import build_starter_profile
from ped.profiles.validation import validate_profile


def scripted(answers):
    answers = list(answers)
    return lambda _prompt: answers.pop(0)


def sink():
    return lambda _msg: None


def base():
    return build_starter_profile("p", engine="Kontakt", library="Lib", patch="Vln")


def test_edit_metadata():
    p = base()
    # engine, library, patch, naming, range low, range high
    answers = ["Play", "New Lib", "Cello", "C4=60", "48", "84"]
    edit_metadata(p, input_fn=scripted(answers), output_fn=sink())
    assert p.engine == "Play"
    assert p.library == "New Lib"
    assert p.patch == "Cello"
    assert p.note_naming == "C4=60"
    assert (p.playable_range.low, p.playable_range.high) == (48, 84)


def test_edit_metadata_blank_keeps_values():
    p = base()
    answers = ["", "", "", "", "", ""]  # keep everything
    before = copy.deepcopy(p.to_dict())
    edit_metadata(p, input_fn=scripted(answers), output_fn=sink())
    assert p.to_dict() == before


def test_add_articulation_keyswitch_by_name():
    p = base()
    # id, name, type(#1 long), trigger(#1 keyswitch), note "D#0", mode(#1 latch)
    answers = ["tremolo", "Tremolo", "1", "1", "D#0", "1"]
    add_articulation(p, input_fn=scripted(answers), output_fn=sink())
    art = p.articulation_by_id("tremolo")
    assert art is not None
    assert art.trigger.type == "keyswitch"
    assert art.trigger.note == 27  # D#0 under C3=60
    assert validate_profile(p).ok


def test_add_articulation_cancel_on_blank_id():
    p = base()
    n = len(p.articulations)
    add_articulation(p, input_fn=scripted([""]), output_fn=sink())
    assert len(p.articulations) == n


def test_remove_articulation():
    p = base()
    # remove #1 (legato)
    remove_articulation(p, input_fn=scripted(["1"]), output_fn=sink())
    assert p.articulation_by_id("legato") is None


def test_add_and_remove_cc_mapping():
    p = base()
    # parameter, cc, curve(#1 dyn_default), inputCc blank, smoothing blank
    add_cc_mapping(p, input_fn=scripted(["brightness", "74", "1", "", ""]), output_fn=sink())
    m = p.mapping_for("brightness")
    assert m is not None and m.cc_number == 74 and m.curve_id == "dyn_default"
    # remove it (it's the last one in the list)
    idx = len(p.cc_mappings)
    remove_cc_mapping(p, input_fn=scripted([str(idx)]), output_fn=sink())
    assert p.mapping_for("brightness") is None


def test_edit_loop_save_returns_true():
    p = base()
    # menu order: 1 Edit metadata ... 9 Save & quit. Pick metadata (1), fill, then Save.
    # metadata prompts: engine, library, patch, naming, low, high
    answers = ["1", "Spitfire Player", "BBCSO", "Violins 1", "", "", "", "9"]
    saved = edit_profile_wizard(p, input_fn=scripted(answers), output_fn=sink())
    assert saved is True
    assert p.library == "BBCSO"
    assert p.engine == "Spitfire Player"


def test_edit_loop_quit_without_saving():
    p = base()
    saved = edit_profile_wizard(p, input_fn=scripted(["0"]), output_fn=sink())  # skip = quit
    assert saved is False
