"""Note: a single played note in tick time."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class Note:
    """A musical note.

    Timing is in ticks; ticks-per-quarter is held on the owning Project so that
    a Note stays tempo/PPQ agnostic.
    """

    id: str
    pitch: int  # MIDI note number 0-127
    start_tick: int
    duration_tick: int
    velocity: int = 80  # 1-127
    articulation_id: Optional[str] = None
    phrase_id: Optional[str] = None

    @property
    def end_tick(self) -> int:
        return self.start_tick + self.duration_tick

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "pitch": self.pitch,
            "startTick": self.start_tick,
            "durationTick": self.duration_tick,
            "velocity": self.velocity,
            "articulationId": self.articulation_id,
            "phraseId": self.phrase_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Note":
        return cls(
            id=data["id"],
            pitch=int(data["pitch"]),
            start_tick=int(data["startTick"]),
            duration_tick=int(data["durationTick"]),
            velocity=int(data.get("velocity", 80)),
            articulation_id=data.get("articulationId"),
            phrase_id=data.get("phraseId"),
        )
