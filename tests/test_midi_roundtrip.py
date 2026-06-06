from ped.core.note import Note
from ped.core.project import Project, TempoEvent
from ped.core.track import Track
from ped.midi.events import CCEvent, KeyswitchEvent
from ped.midi.reader import read_midi
from ped.midi.writer import write_midi
import pytest


def build_project(ppq=480):
    p = Project(project_name="t", ppq=ppq)
    p.tempo_map.append(TempoEvent(0, 120.0))
    notes = [
        Note(id=f"n{i}", pitch=60 + i, start_tick=i * ppq, duration_tick=ppq - 10, velocity=70 + i)
        for i in range(4)
    ]
    p.tracks.append(Track(id="t0", name="Vln", notes=notes))
    return p


def test_sample_midi_loads(sample_midi_path):
    p = read_midi(sample_midi_path)
    assert len(p.tracks) == 1
    assert len(p.tracks[0].notes) == 16
    assert p.ppq == 480


def test_note_timing_preserved(tmp_path):
    p = build_project()
    out = tmp_path / "rt.mid"
    write_midi(p, out)
    back = read_midi(out)
    orig = p.tracks[0].notes
    got = back.tracks[0].notes
    assert len(got) == len(orig)
    for a, b in zip(orig, got):
        assert (b.pitch, b.start_tick, b.duration_tick, b.velocity) == (
            a.pitch, a.start_tick, a.duration_tick, a.velocity
        )


def test_cc_and_keyswitch_written(tmp_path):
    p = build_project()
    out = tmp_path / "withcc.mid"
    cc = [CCEvent(tick=0, cc=1, value=20), CCEvent(tick=480, cc=1, value=90)]
    ks = [KeyswitchEvent(tick=0, note=24)]
    write_midi(p, out, cc_events={0: cc}, keyswitches={0: ks})

    import mido
    mid = mido.MidiFile(str(out))
    ccs = [m for tr in mid.tracks for m in tr if m.type == "control_change"]
    assert {(m.control, m.value) for m in ccs} == {(1, 20), (1, 90)}
    # keyswitch note 24 appears and note count (4 melody) is unchanged
    note_ons = [m for tr in mid.tracks for m in tr if m.type == "note_on" and m.velocity > 0]
    assert any(m.note == 24 for m in note_ons)
    assert sum(1 for m in note_ons if m.note != 24) == 4


def test_refuses_to_overwrite_input(tmp_path):
    p = build_project()
    src = tmp_path / "in.mid"
    write_midi(p, src)
    with pytest.raises(ValueError):
        write_midi(p, src, input_path=src)
