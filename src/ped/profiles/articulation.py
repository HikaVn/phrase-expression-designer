"""Articulation and its trigger, plus CCMapping (intent parameter -> MIDI target)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

ARTICULATION_TYPES = ("long", "short", "effect")
TRIGGER_TYPES = ("keyswitch", "cc", "program_change")
KEYSWITCH_MODES = ("latch", "momentary")


@dataclass
class Trigger:
    """How a sound library is told to switch to an articulation.

    For ``keyswitch``: ``note`` is the MIDI note (resolved via the profile's
    noteNaming); ``mode`` is latch (sticky) or momentary (held).
    For ``cc``: ``cc`` + ``value``. For ``program_change``: ``program``.
    """

    type: str
    note: int | None = None
    note_name: str | None = None
    mode: str | None = None
    cc: int | None = None
    value: int | None = None
    program: int | None = None

    def __post_init__(self) -> None:
        if self.type not in TRIGGER_TYPES:
            raise ValueError(
                f"Unknown trigger type {self.type!r}; expected one of {TRIGGER_TYPES}"
            )
        if self.mode is not None and self.mode not in KEYSWITCH_MODES:
            raise ValueError(
                f"Unknown keyswitch mode {self.mode!r}; expected one of {KEYSWITCH_MODES}"
            )

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"type": self.type}
        for key, attr in (
            ("note", self.note),
            ("noteName", self.note_name),
            ("mode", self.mode),
            ("cc", self.cc),
            ("value", self.value),
            ("program", self.program),
        ):
            if attr is not None:
                out[key] = attr
        return out

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Trigger:
        return cls(
            type=data["type"],
            note=data.get("note"),
            note_name=data.get("noteName"),
            mode=data.get("mode"),
            cc=data.get("cc"),
            value=data.get("value"),
            program=data.get("program"),
        )


@dataclass
class Articulation:
    id: str
    name: str
    type: str = "long"
    trigger: Trigger | None = None
    default_macro: str | None = None
    expression_behavior: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"id": self.id, "name": self.name, "type": self.type}
        if self.trigger is not None:
            out["trigger"] = self.trigger.to_dict()
        if self.default_macro is not None:
            out["defaultMacro"] = self.default_macro
        if self.expression_behavior:
            out["expressionBehavior"] = self.expression_behavior
        return out

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Articulation:
        trig = data.get("trigger")
        return cls(
            id=data["id"],
            name=data.get("name", data["id"]),
            type=data.get("type", "long"),
            trigger=Trigger.from_dict(trig) if trig else None,
            default_macro=data.get("defaultMacro"),
            expression_behavior=data.get("expressionBehavior", {}),
        )


@dataclass
class CCMapping:
    """Maps a normalized intent parameter to a MIDI target through a calibration curve."""

    internal_parameter: str
    target: dict[str, Any]  # e.g. {"type": "cc", "cc": 1}
    curve_id: str | None = None
    smoothing_ms: float = 0.0
    look_ahead_ms: float = 0.0
    step_tick: int | None = None  # CC sampling resolution; None -> mapper default

    @property
    def cc_number(self) -> int | None:
        if self.target.get("type") == "cc":
            return self.target.get("cc")
        return None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "internalParameter": self.internal_parameter,
            "target": self.target,
        }
        if self.curve_id is not None:
            out["curveId"] = self.curve_id
        if self.smoothing_ms:
            out["smoothingMs"] = self.smoothing_ms
        if self.look_ahead_ms:
            out["lookAheadMs"] = self.look_ahead_ms
        if self.step_tick is not None:
            out["stepTick"] = self.step_tick
        return out

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> CCMapping:
        step = data.get("stepTick")
        return cls(
            internal_parameter=data["internalParameter"],
            target=data["target"],
            curve_id=data.get("curveId"),
            smoothing_ms=float(data.get("smoothingMs", 0.0)),
            look_ahead_ms=float(data.get("lookAheadMs", 0.0)),
            step_tick=int(step) if step is not None else None,
        )
