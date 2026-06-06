"""Project: the top-level container, with JSON load/save."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional, Union

from .. import SCHEMA_VERSION
from .track import Track


@dataclass
class TempoEvent:
    """A tempo change. ``tick`` is absolute; ``bpm`` is beats per minute."""

    tick: int
    bpm: float

    def to_dict(self) -> dict[str, Any]:
        return {"tick": self.tick, "bpm": self.bpm}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "TempoEvent":
        return cls(tick=int(data["tick"]), bpm=float(data["bpm"]))


@dataclass
class Project:
    project_name: str = "Untitled Project"
    schema_version: str = SCHEMA_VERSION
    # ticks per quarter note. Not in the original spec sketch, but required to
    # interpret tick timing as real time / round-trip MIDI; see docs/DATA_FORMAT.md.
    ppq: int = 960
    tempo_map: list[TempoEvent] = field(default_factory=list)
    tracks: list[Track] = field(default_factory=list)

    def track_by_name(self, name: str) -> Optional[Track]:
        for track in self.tracks:
            if track.name == name:
                return track
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "schemaVersion": self.schema_version,
            "projectName": self.project_name,
            "ppq": self.ppq,
            "tempoMap": [t.to_dict() for t in self.tempo_map],
            "tracks": [t.to_dict() for t in self.tracks],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Project":
        return cls(
            project_name=data.get("projectName", "Untitled Project"),
            schema_version=data.get("schemaVersion", SCHEMA_VERSION),
            ppq=int(data.get("ppq", 960)),
            tempo_map=[TempoEvent.from_dict(t) for t in data.get("tempoMap", [])],
            tracks=[Track.from_dict(t) for t in data.get("tracks", [])],
        )

    # -- JSON I/O ---------------------------------------------------------
    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    def save(self, path: Union[str, Path]) -> None:
        Path(path).write_text(self.to_json() + "\n", encoding="utf-8")

    @classmethod
    def load(cls, path: Union[str, Path]) -> "Project":
        return cls.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))
