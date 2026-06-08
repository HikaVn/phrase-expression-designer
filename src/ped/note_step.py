"""Sibelius-style live step entry: keypresses build a phrase one note at a time.

This is the keyboard scheme of a notation program, as a small state machine:

  * letters ``A``–``G``      enter that note at the octave nearest the previous
  * a number (``1 2 4 8 16 32 64``)   set the current note value (sticky)
  * ``.``                    add a dot to the current value
  * up / down                transpose the last note by a semitone
  * shift-up / shift-down     transpose the last note by an octave
  * rest                     advance by the current value (no note)
  * backspace                undo the last note

The state machine (``StepEntry``) is pure and unit-tested; a thin terminal
driver (in the CLI) turns raw keypresses into these tokens. In a terminal the
numeric keypad can't be told apart from the number row — both act as the value,
which is all that matters here.
"""

from __future__ import annotations

from .core.note import Note
from .note_entry import _PC, _duration_ticks, _nearest_midi

_LETTERS = set("ABCDEFG")
_DURATIONS = {1, 2, 4, 8, 16, 32, 64}

# token aliases accepted by key(). NOTE: never alias single letters A-G — those
# are note names (e.g. "d" must stay the note D, not "down").
_ALIASES = {
    "su": "shift-up", "sup": "shift-up", "shiftup": "shift-up",
    "sd": "shift-down", "sdown": "shift-down", "shiftdown": "shift-down",
    "rest": "r", "bs": "backspace", "back": "backspace", "dot": ".",
}


class StepEntry:
    def __init__(
        self,
        *,
        ppq: int = 480,
        default_octave: int = 4,
        default_duration: int = 4,
        velocity: int = 80,
        articulation: str | None = None,
        id_prefix: str = "n",
    ) -> None:
        self.ppq = ppq
        self.velocity = velocity
        self.articulation = articulation
        self.id_prefix = id_prefix
        self.notes: list[Note] = []
        self.tick = 0
        self.cur_value = default_duration
        self.cur_dots = 0
        self.reference = (default_octave + 1) * 12
        self.prev_midi: int | None = None
        self._last_index: int | None = None
        self._counter = 0

    # -- queries ----------------------------------------------------------
    def length(self) -> int:
        return _duration_ticks(self.cur_value, self.cur_dots, self.ppq)

    # -- actions ----------------------------------------------------------
    def set_duration(self, value: int) -> None:
        if value not in _DURATIONS:
            raise ValueError(f"bad note value {value}; expected one of {sorted(_DURATIONS)}")
        self.cur_value, self.cur_dots = value, 0

    def add_dot(self) -> None:
        self.cur_dots += 1

    def note(self, letter: str) -> None:
        semitone = _PC[letter.upper()]
        ref = self.prev_midi if self.prev_midi is not None else self.reference
        midi = _nearest_midi(semitone, ref, 0)
        if not 0 <= midi <= 127:
            raise ValueError(f"note {letter!r} resolves to MIDI {midi}, outside 0-127")
        length = self.length()
        self._counter += 1
        self.notes.append(
            Note(
                id=f"{self.id_prefix}{self._counter:04d}",
                pitch=midi,
                start_tick=self.tick,
                duration_tick=length,
                velocity=self.velocity,
                articulation_id=self.articulation,
            )
        )
        self._last_index = len(self.notes) - 1
        self.tick += length
        self.prev_midi = midi

    def rest(self) -> None:
        self.tick += self.length()
        self._last_index = None

    def transpose_last(self, semitones: int) -> None:
        if self._last_index is None:
            return
        note = self.notes[self._last_index]
        new = note.pitch + semitones
        if 0 <= new <= 127:
            note.pitch = new
            self.prev_midi = new

    def backspace(self) -> None:
        if not self.notes:
            return
        removed = self.notes.pop()
        self.tick = removed.start_tick
        self.prev_midi = self.notes[-1].pitch if self.notes else None
        self._last_index = len(self.notes) - 1 if self.notes else None

    # -- token dispatch ---------------------------------------------------
    def key(self, token: str) -> None:
        token = _ALIASES.get(token.lower(), token)
        if len(token) == 1 and token.upper() in _LETTERS:
            self.note(token)
        elif token.isdigit():
            self.set_duration(int(token))
        elif token == ".":
            self.add_dot()
        elif token == "up":
            self.transpose_last(1)
        elif token == "down":
            self.transpose_last(-1)
        elif token == "shift-up":
            self.transpose_last(12)
        elif token == "shift-down":
            self.transpose_last(-12)
        elif token == "r":
            self.rest()
        elif token == "backspace":
            self.backspace()
        else:
            raise ValueError(f"unknown key token {token!r}")


def from_tokens(tokens: str | list[str], **kwargs: object) -> list[Note]:
    """Apply a whitespace-separated token string (or list) and return the notes."""
    entry = StepEntry(**kwargs)  # type: ignore[arg-type]
    seq = tokens.split() if isinstance(tokens, str) else tokens
    for tok in seq:
        entry.key(tok)
    return entry.notes
