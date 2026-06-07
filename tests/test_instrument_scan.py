from pathlib import Path

from ped.instrument_scan import parse_auval, scan_vst3

# Real-world auval -a lines (incl. clean ones, an effect, and a noisy name).
SAMPLE = """\
aumu NiK8 -NI-  -  Native Instruments: Kontakt 8
aumu NiO5 -NI-  -  Native Instruments: Kontakt 5
aumu dls  appl  -  Apple: DLSMusicDevice
aumu EwOp -EW-  -  East West: OpusLOGGER NOT INITIALIZED:
aufx Dely appl  -  Apple: AUDelay
augn afpl appl  -  Apple: AUAudioFilePlayer
Log file at: [/Library/Application Support/East West/Opus/log/Opus.log]
- - - - - - - - - - - - - - - - - - - -
"""


def test_parses_instruments_only():
    plugins = parse_auval(SAMPLE)  # instruments_only=True by default
    names = [p.name for p in plugins]
    assert "Kontakt 8" in names
    assert "Kontakt 5" in names
    assert "DLSMusicDevice" in names
    # the effect / generator / log lines are excluded
    assert "AUDelay" not in names
    assert all(p.au_type == "aumu" for p in plugins)


def test_codes_are_clean():
    plugins = parse_auval(SAMPLE)
    k8 = next(p for p in plugins if p.name == "Kontakt 8")
    assert k8.subtype == "NiK8"
    assert k8.manufacturer_code == "-NI-"
    assert k8.manufacturer == "Native Instruments"
    assert k8.format == "AU"


def test_trailing_space_subtype():
    plugins = parse_auval(SAMPLE)
    dls = next(p for p in plugins if p.name == "DLSMusicDevice")
    assert dls.subtype == "dls"  # 4-char "dls " stripped


def test_all_types_includes_effects():
    plugins = parse_auval(SAMPLE, instruments_only=False)
    names = {p.name for p in plugins}
    assert "AUDelay" in names
    assert "AUAudioFilePlayer" in names


def test_non_component_lines_ignored():
    plugins = parse_auval(SAMPLE, instruments_only=False)
    assert all("Log file" not in p.name for p in plugins)
    # 6 component lines in the sample
    assert len(plugins) == 6


def test_scan_vst3_folder(tmp_path):
    d = tmp_path / "VST3"
    d.mkdir()
    (d / "My Synth.vst3").mkdir()
    (d / "Another.vst3").mkdir()
    (d / "notes.txt").write_text("ignore me")
    plugins = scan_vst3([d])
    names = sorted(p.name for p in plugins)
    assert names == ["Another", "My Synth"]
    assert all(p.format == "VST3" for p in plugins)
    assert all(p.path and p.path.endswith(".vst3") for p in plugins)


def test_scan_vst3_missing_dir_is_empty():
    assert scan_vst3([Path("/no/such/dir/xyz")]) == []
