"""InstrumentProfile: per-instrument mapping from intent to MIDI, with JSON I/O."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional, Union

from .. import SCHEMA_VERSION
from .articulation import Articulation, CCMapping
from .calibration import CalibrationCurve


@dataclass
class PlayableRange:
    low: int
    high: int

    def contains(self, note: int) -> bool:
        return self.low <= note <= self.high

    def to_dict(self) -> dict[str, Any]:
        return {"low": self.low, "high": self.high}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PlayableRange":
        return cls(low=int(data["low"]), high=int(data["high"]))


@dataclass
class InstrumentProfile:
    id: str
    schema_version: str = SCHEMA_VERSION
    engine: Optional[str] = None
    library: Optional[str] = None
    patch: Optional[str] = None
    note_naming: str = "C3=60"
    playable_range: Optional[PlayableRange] = None
    articulations: list[Articulation] = field(default_factory=list)
    cc_mappings: list[CCMapping] = field(default_factory=list)
    calibration_curves: list[CalibrationCurve] = field(default_factory=list)

    def articulation_by_id(self, art_id: str) -> Optional[Articulation]:
        for art in self.articulations:
            if art.id == art_id:
                return art
        return None

    def calibration_by_id(self, curve_id: str) -> Optional[CalibrationCurve]:
        for curve in self.calibration_curves:
            if curve.id == curve_id:
                return curve
        return None

    def mapping_for(self, parameter: str) -> Optional[CCMapping]:
        for mapping in self.cc_mappings:
            if mapping.internal_parameter == parameter:
                return mapping
        return None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "schemaVersion": self.schema_version,
            "id": self.id,
            "engine": self.engine,
            "library": self.library,
            "patch": self.patch,
            "noteNaming": self.note_naming,
            "articulations": [a.to_dict() for a in self.articulations],
            "ccMappings": [m.to_dict() for m in self.cc_mappings],
            "calibrationCurves": [c.to_dict() for c in self.calibration_curves],
        }
        if self.playable_range is not None:
            out["playableRange"] = self.playable_range.to_dict()
        return out

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "InstrumentProfile":
        pr = data.get("playableRange")
        return cls(
            id=data["id"],
            schema_version=data.get("schemaVersion", SCHEMA_VERSION),
            engine=data.get("engine"),
            library=data.get("library"),
            patch=data.get("patch"),
            note_naming=data.get("noteNaming", "C3=60"),
            playable_range=PlayableRange.from_dict(pr) if pr else None,
            articulations=[Articulation.from_dict(a) for a in data.get("articulations", [])],
            cc_mappings=[CCMapping.from_dict(m) for m in data.get("ccMappings", [])],
            calibration_curves=[
                CalibrationCurve.from_dict(c) for c in data.get("calibrationCurves", [])
            ],
        )

    # -- JSON I/O ---------------------------------------------------------
    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    def save(self, path: Union[str, Path]) -> None:
        Path(path).write_text(self.to_json() + "\n", encoding="utf-8")

    @classmethod
    def load(cls, path: Union[str, Path]) -> "InstrumentProfile":
        return cls.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))
