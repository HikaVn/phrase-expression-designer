from ped.cli.main import main
from ped.core.project import Project
from ped.midi.reader import read_midi


def _make_project(path):
    main(["enter-notes", "4 C D E F", "--track", "Lead", "-o", str(path)])
    return path


def test_into_without_output_refuses_to_overwrite(tmp_path, capsys):
    proj = tmp_path / "song.project.json"
    main(["enter-notes", "C D", "--track", "Lead", "-o", str(proj)])
    before = proj.read_bytes()

    rc = main(["enter-notes", "E F", "--into", str(proj), "--track", "Lead"])
    assert rc == 2
    assert proj.read_bytes() == before  # untouched
    err = capsys.readouterr().err
    assert "refusing to overwrite" in err


def test_into_in_place_appends(tmp_path):
    proj = tmp_path / "song.project.json"
    main(["enter-notes", "4 C D", "--track", "Lead", "-o", str(proj)])
    n_before = len(Project.load(proj).tracks[0].notes)

    rc = main(["enter-notes", "4 E F", "--into", str(proj), "--track", "Lead", "--in-place"])
    assert rc == 0
    assert len(Project.load(proj).tracks[0].notes) == n_before + 2


def test_into_output_mid_writes_real_midi(tmp_path):
    proj = tmp_path / "song.project.json"
    main(["enter-notes", "4 C D", "--track", "Lead", "-o", str(proj)])

    out_mid = tmp_path / "appended.mid"
    rc = main(["enter-notes", "4 E F", "--into", str(proj), "--track", "Lead", "-o", str(out_mid)])
    assert rc == 0
    # it must be a real MIDI file, not JSON in a .mid name
    back = read_midi(out_mid)
    assert back.tracks and len(back.tracks[0].notes) == 4  # C D E F
    # the source project was not modified (we wrote to a new file)
    assert len(Project.load(proj).tracks[0].notes) == 2


def test_plain_output_json(tmp_path):
    out = tmp_path / "m.project.json"
    rc = main(["enter-notes", "8 G G 2 Eb", "--track", "Motif", "-o", str(out)])
    assert rc == 0
    p = Project.load(out)
    assert [n.pitch for n in p.tracks[0].notes] == [55, 55, 51]
