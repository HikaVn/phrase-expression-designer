"""Phrase: a contiguous span of musical time that shares expressive shaping.

Phrases are the unit a Phrase Painter / template operates over. A phrase is
defined by a tick range; notes reference it by ``phrase_id``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class Phrase:
    id: str
    start_tick: int
    end_tick: int
    name: Optional[str] = None

    @property
    def length_tick(self) -> int:
        return self.end_tick - self.start_tick

    def contains(self, tick: int) -> bool:
        return self.start_tick <= tick < self.end_tick

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "startTick": self.start_tick,
            "endTick": self.end_tick,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Phrase":
        return cls(
            id=data["id"],
            start_tick=int(data["startTick"]),
            end_tick=int(data["endTick"]),
            name=data.get("name"),
        )
