"""Sibelius-style text note input → a list of Notes.

Mirrors a notation program's *alphabetic step input*: you set a note value once
(it sticks), then type letters A–G; each note lands in the octave nearest the
previous one, and the cursor advances. Example::

    "4 C D E F  2 G | 4 A G F E  1 C"

Grammar (whitespace-separated tokens):
  * duration: ``1 2 4 8 16 32 64`` with optional dots — sticky until changed
    (``4`` = quarter, ``8.`` = dotted eighth).
  * note: ``[+/-]* letter [accidentals] [octave] [~]`` — e.g. ``C``, ``F#``,
    ``Bb``, ``C5`` (explicit, scientific C4=60), ``+C`` (octave above nearest).
    Accidentals: ``#``/``s`` = sharp, ``b`` = flat, ``x`` = double-sharp.
    A leading duration is allowed too: ``8C`` sets the value *and* plays C.
  * chord: ``[C E G]`` or ``[CEG]`` — simultaneous notes at the current value
    (a leading duration / trailing ``~`` may attach: ``4[CEG]~``).
  * tie: a trailing ``~`` ties a note/chord into the next one of the same
    pitch(es), extending its duration. A tie must be continued (else error).
  * rest: ``r`` (uses the current value).
  * barline: ``|`` is ignored (decorative).

Pitch names are scientific (C4 = MIDI 60), independent of any profile's
noteNaming — note entry is about pitches, not keyswitch spelling.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .core.note import Note

_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
_ACCIDENTAL = {"#": 1, "s": 1, "b": -1, "x": 2}
_VALID_DURATIONS = {1, 2, 4, 8, 16, 32, 64}

_DUR_RE = re.compile(r"^(\d+)(\.*)$")
_REST_RE = re.compile(r"^[rR]$")
_CHORD_RE = re.compile(r"^(\d+\.*)?\[([^\]]*)\](~?)$")
_NOTE_RE = re.compile(r"^(\d+\.*)?([+-]*)([A-Ga-g])([#sbx]*)(-?\d+)?(~?)$")
_SPEC_RE = re.compile(r"([+-]*)([A-Ga-g])([#sbx]*)(-?\d+)?")


def _duration_ticks(value: int, dots: int, ppq: int) -> int:
    if value not in _VALID_DURATIONS:
        raise ValueError(f"bad note value {value}; expected one of {sorted(_VALID_DURATIONS)}")
    base = ppq * 4 / value
    factor = 2 - (1 / (2**dots)) if dots else 1.0  # dotted: 1.5, double: 1.75, ...
    return round(base * factor)


def _nearest_midi(semitone: int, reference: int, octave_shift: int) -> int:
    k = round((reference - semitone) / 12)
    return semitone + 12 * k + 12 * octave_shift


def _resolve(signs: str, letter: str, accidentals: str, octave: str | None, ref: int) -> int:
    semitone = _PC[letter.upper()] + sum(_ACCIDENTAL[a] for a in accidentals)
    shift = signs.count("+") - signs.count("-")
    if octave:
        return (int(octave) + 1) * 12 + semitone + 12 * shift
    return _nearest_midi(semitone, ref, shift)


def _chord_specs(inner: str) -> list[tuple[str, str, str, str | None]]:
    matches = list(_SPEC_RE.finditer(inner))
    if "".join(m.group(0) for m in matches) != inner:
        raise ValueError(f"bad chord contents {inner!r}")
    return [(m.group(1), m.group(2), m.group(3), m.group(4)) for m in matches]


@dataclass
class _State:
    ppq: int
    velocity: int
    articulation: str | None
    id_prefix: str
    notes: list[Note] = field(default_factory=list)
    tick: int = 0
    cur_value: int = 4
    cur_dots: int = 0
    prev_midi: int | None = None
    reference: int = 60
    pending_ties: dict[int, int] = field(default_factory=dict)  # pitch -> note index
    counter: int = 0

    def length(self) -> int:
        return _duration_ticks(self.cur_value, self.cur_dots, self.ppq)


def _apply_group(
    state: _State, specs: list[tuple[str, str, str, str | None]], tie: bool, token: str
) -> None:
    """Place a chord/note group at the current tick, resolving ties."""
    length = state.length()
    ref = state.prev_midi if state.prev_midi is not None else state.reference
    midis: list[int] = []
    for signs, letter, accidentals, octave in specs:
        midi = _resolve(signs, letter, accidentals, octave, ref)
        if not 0 <= midi <= 127:
            raise ValueError(f"token {token!r} resolves to MIDI {midi}, outside 0-127")
        midis.append(midi)
        ref = midi  # stack subsequent chord notes near the previous one

    covering: dict[int, int] = {}
    for midi in midis:
        if midi in state.pending_ties:  # tie continuation: extend the held note
            idx = state.pending_ties[midi]
            state.notes[idx].duration_tick += length
            covering[midi] = idx
        else:
            state.counter += 1
            state.notes.append(
                Note(
                    id=f"{state.id_prefix}{state.counter:04d}",
                    pitch=midi,
                    start_tick=state.tick,
                    duration_tick=length,
                    velocity=state.velocity,
                    articulation_id=state.articulation,
                )
            )
            covering[midi] = len(state.notes) - 1

    dangling = set(state.pending_ties) - set(midis)
    if dangling:
        raise ValueError(f"tie not continued for pitch(es) {sorted(dangling)} at {token!r}")

    state.pending_ties = dict(covering) if tie else {}
    state.tick += length
    # Carry the chord *root* (first note) as the reference so repeated/tied
    # chords stay at the same pitch instead of drifting up each time.
    state.prev_midi = midis[0]


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
    """Parse a Sibelius-style entry string into Notes. Raises ValueError on bad input."""
    # Collapse spaces inside chord brackets so "[C E G]" is one token.
    text = re.sub(r"\[[^\]]*\]", lambda m: m.group(0).replace(" ", ""), text)

    state = _State(
        ppq=ppq, velocity=velocity, articulation=articulation, id_prefix=id_prefix,
        tick=start_tick, cur_value=default_duration,
        reference=(default_octave + 1) * 12,
    )

    for token in text.split():
        if token == "|":
            continue

        m = _DUR_RE.match(token)
        if m:
            state.cur_value, state.cur_dots = int(m.group(1)), len(m.group(2))
            state.length()  # validate early
            continue

        if _REST_RE.match(token):
            if state.pending_ties:
                raise ValueError(f"tie not continued before rest at {token!r}")
            state.tick += state.length()
            continue

        chord = _CHORD_RE.match(token)
        if chord:
            dur, inner, tie = chord.groups()
            if dur:
                dm = _DUR_RE.match(dur)
                assert dm is not None
                state.cur_value, state.cur_dots = int(dm.group(1)), len(dm.group(2))
            specs = _chord_specs(inner)
            if not specs:
                raise ValueError(f"empty chord {token!r}")
            _apply_group(state, specs, bool(tie), token)
            continue

        note = _NOTE_RE.match(token)
        if not note:
            raise ValueError(f"unrecognized token {token!r}")
        dur, signs, letter, accidentals, octave, tie = note.groups()
        if dur:
            dm = _DUR_RE.match(dur)
            assert dm is not None
            state.cur_value, state.cur_dots = int(dm.group(1)), len(dm.group(2))
        _apply_group(state, [(signs, letter, accidentals, octave)], bool(tie), token)

    if state.pending_ties:
        raise ValueError("unresolved tie at end of input")

    return state.notes
