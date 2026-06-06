"""Read a Standard MIDI File into a Project (notes, tempo, PPQ)."""

from __future__ import annotations

from pathlib import Path

import mido

from ..core.musictime import TimeSignature
from ..core.note import Note
from ..core.project import Project, TempoEvent
from ..core.track import Track


def read_midi(path: str | Path) -> Project:
    """Parse a MIDI file into a Project. One Project Track per MIDI track that has notes."""
    mid = mido.MidiFile(str(path))
    project = Project(project_name=Path(path).stem, ppq=mid.ticks_per_beat)

    tempo_map: list[TempoEvent] = []
    # (tick, numerator, denominator) collected before we know bar boundaries.
    raw_time_sigs: list[tuple[int, int, int]] = []

    for index, mtrack in enumerate(mid.tracks):
        abs_tick = 0
        name = ""
        # pitch -> list of (start_tick, velocity) for overlapping/stacked notes
        pending: dict[int, list[tuple[int, int]]] = {}
        notes: list[Note] = []
        note_counter = 0

        for msg in mtrack:
            abs_tick += msg.time
            if msg.type == "track_name":
                name = msg.name
            elif msg.type == "set_tempo":
                bpm = mido.tempo2bpm(msg.tempo)
                tempo_map.append(TempoEvent(tick=abs_tick, bpm=round(bpm, 6)))
            elif msg.type == "time_signature":
                raw_time_sigs.append((abs_tick, msg.numerator, msg.denominator))
            elif msg.type == "note_on" and msg.velocity > 0:
                pending.setdefault(msg.note, []).append((abs_tick, msg.velocity))
            elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                stack = pending.get(msg.note)
                if stack:
                    start_tick, velocity = stack.pop(0)
                    note_counter += 1
                    notes.append(
                        Note(
                            id=f"note_t{index}_{note_counter:04d}",
                            pitch=msg.note,
                            start_tick=start_tick,
                            duration_tick=max(0, abs_tick - start_tick),
                            velocity=velocity,
                        )
                    )

        if notes:
            project.tracks.append(
                Track(
                    id=f"track_{index}",
                    name=name or f"Track {index}",
                    notes=sorted(notes, key=lambda n: (n.start_tick, n.pitch)),
                )
            )

    # Deduplicate identical tempo events and keep them time-ordered.
    seen: set[tuple[int, float]] = set()
    for ev in sorted(tempo_map, key=lambda t: t.tick):
        key = (ev.tick, ev.bpm)
        if key not in seen:
            seen.add(key)
            project.tempo_map.append(ev)

    project.time_signature_map = _time_sigs_to_bars(raw_time_sigs, project.ppq)
    return project


def _time_sigs_to_bars(
    raw: list[tuple[int, int, int]], ppq: int
) -> list[TimeSignature]:
    """Convert (tick, num, den) time-signature events to bar-based TimeSignatures.

    Assumes (per MIDI convention) that signature changes fall on bar boundaries.
    """
    ordered = sorted(set(raw), key=lambda x: x[0])
    out: list[TimeSignature] = []
    prev_tick = 0
    prev_bar = 1
    prev_num, prev_den = 4, 4
    for i, (tick, num, den) in enumerate(ordered):
        if i == 0:
            bar = 1
        else:
            bar_ticks = ppq * 4 // prev_den * prev_num
            bar = prev_bar + (tick - prev_tick) // bar_ticks if bar_ticks else prev_bar
        out.append(TimeSignature(start_bar=bar, numerator=num, denominator=den))
        prev_tick, prev_bar, prev_num, prev_den = tick, bar, num, den
    return out
