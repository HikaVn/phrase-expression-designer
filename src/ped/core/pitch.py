"""Note-name <-> MIDI-number conversion with C3=60 / C4=60 handling.

The same MIDI number is spelled with different octave numbers depending on the
convention a vendor or DAW uses:

    "C4=60"  scientific pitch notation; MIDI 60 == C4   (most software default)
    "C3=60"  Yamaha / Logic / many Kontakt libraries;   MIDI 60 == C3

Keyswitches are the main reason this matters: a library manual may say
"C0 = Legato", but C0 maps to MIDI 24 under C3=60 and MIDI 12 under C4=60.
Getting it wrong silently puts the keyswitch on the wrong note.
"""

from __future__ import annotations

# Semitone offset from C within an octave.
_NAME_TO_SEMITONE = {
    "C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3, "E": 4, "FB": 4,
    "E#": 5, "F": 5, "F#": 6, "GB": 6, "G": 7, "G#": 8, "AB": 8, "A": 9,
    "A#": 10, "BB": 10, "B": 11, "CB": 11, "B#": 0,
}
_SEMITONE_TO_NAME = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# octave_offset is added to the written octave before multiplying by 12.
#   C4=60 -> (4 + 1) * 12 + 0 = 60
#   C3=60 -> (3 + 2) * 12 + 0 = 60
_OCTAVE_OFFSET = {"C4=60": 1, "C3=60": 2}

SUPPORTED_NAMINGS = tuple(_OCTAVE_OFFSET)


def _octave_offset(naming: str) -> int:
    try:
        return _OCTAVE_OFFSET[naming]
    except KeyError as exc:
        raise ValueError(
            f"Unknown noteNaming {naming!r}; expected one of {SUPPORTED_NAMINGS}"
        ) from exc


def note_name_to_number(name: str, naming: str = "C4=60") -> int:
    """Convert a note name such as 'C#3' or 'Bb-1' to a MIDI note number.

    Raises ValueError on an unparseable name or unknown naming convention.
    """
    raw = name.strip().replace("♯", "#").replace("♭", "b")
    if not raw:
        raise ValueError("Empty note name")

    # Split the trailing (possibly negative) octave from the leading letter+accidental.
    i = len(raw)
    while i > 0 and (raw[i - 1].isdigit() or raw[i - 1] == "-"):
        i -= 1
    letter, octave_str = raw[:i], raw[i:]
    if not octave_str:
        raise ValueError(f"Note name {name!r} is missing an octave number")

    semitone = _NAME_TO_SEMITONE.get(letter.upper())
    if semitone is None:
        raise ValueError(f"Unrecognized pitch class {letter!r} in {name!r}")
    try:
        octave = int(octave_str)
    except ValueError as exc:
        raise ValueError(f"Bad octave {octave_str!r} in {name!r}") from exc

    number = (octave + _octave_offset(naming)) * 12 + semitone
    if not 0 <= number <= 127:
        raise ValueError(f"Note name {name!r} maps to {number}, outside MIDI 0-127")
    return number


def number_to_note_name(number: int, naming: str = "C4=60") -> str:
    """Convert a MIDI note number to a note name under the given convention."""
    if not 0 <= number <= 127:
        raise ValueError(f"MIDI note number {number} out of range 0-127")
    offset = _octave_offset(naming)
    octave = number // 12 - offset
    return f"{_SEMITONE_TO_NAME[number % 12]}{octave}"
