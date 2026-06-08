"""Sibelius-style text note input → a list of Notes.

Mirrors a notation program's *alphabetic step input*: you set a note value once
(it sticks), then type letters A–G; each note lands in the octave nearest the
previous one, and the cursor advances. Example::

    "4 C D E F  2 G  4 A G F E  1 C"

Grammar (whitespace-separated tokens):
  * duration: ``1 2 4 8 16 32 64`` with optional dots — sticky until changed
    (``4`` = quarter, ``8.`` = dotted eighth).
  * note: ``[+/-]* letter [accidentals] [octave]`` — e.g. ``C``, ``F#``, ``Bb``,
    ``C5`` (explicit, scientific C4=60), ``+C`` (an octave above nearest).
    Accidentals: ``#``/``s`` = sharp, ``b`` = flat, ``x`` = double-sharp.
    A leading duration is allowed too: ``8C`` sets the value *and* plays C.
  * rest: ``r`` (uses the current value).
  * barline: ``|`` is ignored (decorative).

Pitch names are scientific (C4 = MIDI 60), independent of any profile's
noteNaming — note entry is about pitches, not keyswitch spelling.
"""

from __future__ import annotations

import re

from .core.note import Note

_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
_ACCIDENTAL = {"#": 1, "s": 1, "b": -1, "x": 2}
_VALID_DURATIONS = {1, 2, 4, 8, 16, 32, 64}

_DURATION_RE = re.compile(r"^(\d+)(\.*)$")
_REST_RE = re.compile(r"^[rR]$")
_NOTE_RE = re.compile(r"^(\d+\.*)?([+-]*)([A-Ga-g])([#sbx]*)(-?\d+)?$")


def _duration_ticks(value: int, dots: int, ppq: int) -> int:
    if value not in _VALID_DURATIONS:
        raise ValueError(f"bad note value {value}; expected one of {sorted(_VALID_DURATIONS)}")
    base = ppq * 4 / value
    factor = 2 - (1 / (2**dots)) if dots else 1.0  # dotted: 1.5, double: 1.75, ...
    return round(base * factor)


def _nearest_midi(semitone: int, reference: int, octave_shift: int) -> int:
    """Pick the octave of ``semitone`` (chromatic pitch class) nearest ``reference``."""
    k = round((reference - semitone) / 12)
    midi = semitone + 12 * k + 12 * octave_shift
    return midi


def parse_note_entry(
    text: str,
    *,
    ppq: int = 480,
    default_octave: int = 4,
    default_duration: int = 4,
    velocity: int = 80,
    articulation: str | None = None,
    start_tick: int = 0,
    id_prefix: str = "n",
) -> list[Note]:
    """Parse a Sibelius-style entry string into Notes. Raises ValueError on bad tokens."""
    notes: list[Note] = []
    tick = start_tick
    cur_value = default_duration
    cur_dots = 0
    reference = (default_octave + 1) * 12  # C of the default octave (scientific)
    prev_midi: int | None = None
    counter = 0

    for token in text.split():
        if token == "|":
            continue

        m = _DURATION_RE.match(token)
        if m:
            cur_value = int(m.group(1))
            cur_dots = len(m.group(2))
            _duration_ticks(cur_value, cur_dots, ppq)  # validate early
            continue

        if _REST_RE.match(token):
            tick += _duration_ticks(cur_value, cur_dots, ppq)
            continue

        m = _NOTE_RE.match(token)
        if not m:
            raise ValueError(f"unrecognized token {token!r}")
        dur, signs, letter, accidentals, octave = m.groups()

        if dur:
            dm = _DURATION_RE.match(dur)
            assert dm is not None
            cur_value = int(dm.group(1))
            cur_dots = len(dm.group(2))

        semitone = _PC[letter.upper()] + sum(_ACCIDENTAL[a] for a in accidentals)
        octave_shift = signs.count("+") - signs.count("-")

        if octave is not None:
            midi = (int(octave) + 1) * 12 + semitone + 12 * octave_shift
        else:
            ref = prev_midi if prev_midi is not None else reference
            midi = _nearest_midi(semitone, ref, octave_shift)

        if not 0 <= midi <= 127:
            raise ValueError(f"token {token!r} resolves to MIDI {midi}, outside 0-127")

        length = _duration_ticks(cur_value, cur_dots, ppq)
        counter += 1
        notes.append(
            Note(
                id=f"{id_prefix}{counter:04d}",
                pitch=midi,
                start_tick=tick,
                duration_tick=length,
                velocity=velocity,
                articulation_id=articulation,
            )
        )
        tick += length
        prev_midi = midi

    return notes
