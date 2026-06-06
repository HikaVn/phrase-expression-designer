"""Write a Project (plus generated CC / keyswitch events) to a Standard MIDI File.

Note timing is preserved exactly: every input note's start tick, duration, pitch
and velocity are written back unchanged. Generated events are merged in by
absolute tick with a stable ordering so keyswitches and CC land just before the
notes they apply to.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Union

import mido

from ..core.project import Project
from .events import CCEvent, KeyswitchEvent

# Ordering at identical ticks: tempo, keyswitch-on, cc, note-off, note-on, off-tail.
_PRIORITY = {"meta": 0, "ks_on": 1, "cc": 2, "note_off": 3, "note_on": 4, "off_tail": 5}


def _refuse_overwrite_input(out_path: Path, input_path: Optional[Path]) -> None:
    if input_path is not None and out_path.resolve() == Path(input_path).resolve():
        raise ValueError(
            f"Refusing to overwrite the input file {out_path}; choose a different output name."
        )


def write_midi(
    project: Project,
    path: Union[str, Path],
    cc_events: Optional[dict[int, list[CCEvent]]] = None,
    keyswitches: Optional[dict[int, list[KeyswitchEvent]]] = None,
    input_path: Optional[Union[str, Path]] = None,
) -> None:
    """Write ``project`` to ``path``.

    ``cc_events`` / ``keyswitches`` map a track index (into project.tracks) to its
    generated events. ``input_path``, if given, guards against overwriting the
    source file.
    """
    out_path = Path(path)
    _refuse_overwrite_input(out_path, Path(input_path) if input_path else None)

    cc_events = cc_events or {}
    keyswitches = keyswitches or {}

    mid = mido.MidiFile(ticks_per_beat=project.ppq)

    for t_index, track in enumerate(project.tracks):
        mtrack = mido.MidiTrack()
        mid.tracks.append(mtrack)
        if track.name:
            mtrack.append(mido.MetaMessage("track_name", name=track.name, time=0))

        # Tempo map goes on the first track.
        timeline: list[tuple[int, int, mido.Message]] = []
        if t_index == 0:
            for tempo in project.tempo_map:
                timeline.append(
                    (
                        tempo.tick,
                        _PRIORITY["meta"],
                        mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(tempo.bpm), time=0),
                    )
                )

        for note in track.notes:
            timeline.append(
                (note.start_tick, _PRIORITY["note_on"],
                 mido.Message("note_on", note=note.pitch, velocity=note.velocity, time=0))
            )
            timeline.append(
                (note.end_tick, _PRIORITY["note_off"],
                 mido.Message("note_off", note=note.pitch, velocity=0, time=0))
            )

        for ev in cc_events.get(t_index, []):
            timeline.append(
                (ev.tick, _PRIORITY["cc"],
                 mido.Message("control_change", control=ev.cc, value=ev.value,
                              channel=ev.channel, time=0))
            )

        for ks in keyswitches.get(t_index, []):
            timeline.append(
                (ks.tick, _PRIORITY["ks_on"],
                 mido.Message("note_on", note=ks.note, velocity=ks.velocity,
                              channel=ks.channel, time=0))
            )
            timeline.append(
                (ks.tick + ks.duration_tick, _PRIORITY["off_tail"],
                 mido.Message("note_off", note=ks.note, velocity=0,
                              channel=ks.channel, time=0))
            )

        timeline.sort(key=lambda item: (item[0], item[1]))

        prev_tick = 0
        for abs_tick, _priority, msg in timeline:
            msg.time = abs_tick - prev_tick
            prev_tick = abs_tick
            mtrack.append(msg)

    if not mid.tracks:  # empty project -> still produce a valid file
        mid.tracks.append(mido.MidiTrack())

    mid.save(str(out_path))
