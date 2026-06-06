"""Track: a sequence of notes plus the expression curves and phrases that shape them."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .curve import ExpressionCurve
from .note import Note
from .phrase import Phrase


@dataclass
class Track:
    id: str
    name: str
    instrument_profile_id: str | None = None
    notes: list[Note] = field(default_factory=list)
    expression_curves: list[ExpressionCurve] = field(default_factory=list)
    phrases: list[Phrase] = field(default_factory=list)

    def curve_for(self, parameter: str) -> ExpressionCurve | None:
        """Return the first expression curve targeting ``parameter``, if any."""
        for curve in self.expression_curves:
            if curve.parameter == parameter:
                return curve
        return None

    def tick_span(self) -> tuple[int, int]:
        """(start, end) tick covering all notes; (0, 0) when empty."""
        if not self.notes:
            return (0, 0)
        start = min(n.start_tick for n in self.notes)
        end = max(n.end_tick for n in self.notes)
        return (start, end)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "instrumentProfileId": self.instrument_profile_id,
            "notes": [n.to_dict() for n in self.notes],
            "expressionCurves": [c.to_dict() for c in self.expression_curves],
            "phrases": [p.to_dict() for p in self.phrases],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Track:
        return cls(
            id=data["id"],
            name=data["name"],
            instrument_profile_id=data.get("instrumentProfileId"),
            notes=[Note.from_dict(n) for n in data.get("notes", [])],
            expression_curves=[
                ExpressionCurve.from_dict(c) for c in data.get("expressionCurves", [])
            ],
            phrases=[Phrase.from_dict(p) for p in data.get("phrases", [])],
        )
