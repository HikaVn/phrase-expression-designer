"""MIDI parsing and writing (mido-backed)."""

from .events import CCEvent, KeyswitchEvent
from .reader import read_midi
from .writer import write_midi

__all__ = ["read_midi", "write_midi", "CCEvent", "KeyswitchEvent"]
