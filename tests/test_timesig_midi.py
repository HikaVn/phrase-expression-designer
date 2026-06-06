from ped.core.musictime import TimeSignature
from ped.core.note import Note
from ped.core.project import Project, TempoEvent
from ped.core.track import Track
from ped.midi.reader import read_midi
from ped.midi.writer import write_midi


def build_project(ppq=480):
    p = Project(project_name="ts", ppq=ppq)
    p.tempo_map.append(TempoEvent(0, 120.0))
    p.time_signature_map = [TimeSignature(1, 3, 4), TimeSignature(3, 4, 4)]
    p.tracks.append(
        Track(id="t0", name="Vln", notes=[Note(id="n", pitch=60, start_tick=0, duration_tick=240)])
    )
    return p


def test_time_signature_roundtrip(tmp_path):
    p = build_project()
    out = tmp_path / "ts.mid"
    write_midi(p, out)
    back = read_midi(out)
    sigs = [(t.start_bar, t.numerator, t.denominator) for t in back.time_signature_map]
    assert (1, 3, 4) in sigs
    assert (3, 4, 4) in sigs


def test_project_dict_roundtrip_includes_timesig():
    p = build_project()
    again = Project.from_dict(p.to_dict())
    assert [t.to_dict() for t in again.time_signature_map] == [
        t.to_dict() for t in p.time_signature_map
    ]
