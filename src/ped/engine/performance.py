"""Performance Rule Engine (spec §9.8).

Turns raw notes + articulations + phrase context into more natural performance
data. These rules mutate a Track in place (and return it) so they compose:

    detect_phrases(track, ppq)
    apply_velocity_rules(track, profile, ppq, ts_map)

Rules implemented:
  * rest-based phrase detection (gap larger than a threshold starts a new phrase)
  * short articulations (velocityRole == "primary") take dynamics from the
    intensity curve; long ones keep velocity steady (CC carries dynamics)
  * strong-beat (bar downbeat) accent
  * phrase-end release (soften the last note of a phrase)
  * legato/slur re-attack suppression (soften connected same-articulation notes)
"""

from __future__ import annotations

from dataclasses import dataclass

from ..core.curve import clip01
from ..core.musictime import TimeSignature, tick_to_position
from ..core.phrase import Phrase
from ..core.track import Track
from ..profiles.instrument_profile import InstrumentProfile


@dataclass
class VelocityRules:
    vel_min: int = 30          # velocity at intensity 0.0 (primary-role notes)
    vel_max: int = 120         # velocity at intensity 1.0
    downbeat_accent: int = 8   # added on a bar downbeat
    phrase_end_release: float = 0.85  # multiplier on the last note of a phrase
    slur_softening: float = 0.85      # multiplier on connected long notes
    slur_gap_ticks: int = 5    # max gap to count as "connected"


def _clamp_vel(v: float) -> int:
    return max(1, min(127, int(round(v))))


def detect_phrases(track: Track, ppq: int, gap_beats: float = 1.0) -> list[Phrase]:
    """Split the track's notes into phrases on rests >= ``gap_beats`` quarter notes.

    Assigns ``phrase_id`` to every note and replaces ``track.phrases``.
    """
    gap_ticks = int(gap_beats * ppq)
    notes = sorted(track.notes, key=lambda n: (n.start_tick, n.pitch))
    phrases: list[Phrase] = []
    current: list = []
    prev_end = None

    def flush() -> None:
        if not current:
            return
        pid = f"{track.id}_phrase_{len(phrases) + 1:03d}"
        start = current[0].start_tick
        end = max(n.end_tick for n in current)
        phrases.append(Phrase(id=pid, start_tick=start, end_tick=end))
        for n in current:
            n.phrase_id = pid

    for note in notes:
        if prev_end is not None and note.start_tick - prev_end >= gap_ticks:
            flush()
            current = []
        current.append(note)
        prev_end = max(prev_end, note.end_tick) if prev_end is not None else note.end_tick
    flush()

    track.phrases = phrases
    return phrases


def _is_downbeat(tick: int, ppq: int, ts_map: list[TimeSignature] | None) -> bool:
    _bar, beat, off = tick_to_position(tick, ppq, ts_map)
    return beat == 1 and off == 0


def apply_velocity_rules(
    track: Track,
    profile: InstrumentProfile,
    ppq: int = 960,
    ts_map: list[TimeSignature] | None = None,
    rules: VelocityRules | None = None,
) -> Track:
    """Adjust note velocities per the performance rules. Mutates and returns ``track``."""
    rules = rules or VelocityRules()
    intensity = track.curve_for("intensity")
    notes = sorted(track.notes, key=lambda n: n.start_tick)
    phrase_last: dict[str, int] = {}
    for n in notes:
        if n.phrase_id is not None:
            phrase_last[n.phrase_id] = max(phrase_last.get(n.phrase_id, 0), n.end_tick)

    prev = None
    for note in notes:
        art = profile.articulation_by_id(note.articulation_id) if note.articulation_id else None
        behavior = art.expression_behavior if art else {}
        vel_role = behavior.get("velocityRole", "secondary")

        vel = float(note.velocity)
        # Short / primary-role: dynamics come from the intensity curve.
        if vel_role == "primary" and intensity is not None:
            level = clip01(intensity.value_at(note.start_tick))
            vel = rules.vel_min + (rules.vel_max - rules.vel_min) * level

        # Strong-beat accent.
        if _is_downbeat(note.start_tick, ppq, ts_map):
            vel += rules.downbeat_accent

        # Legato/slur re-attack suppression for connected long notes.
        if (
            prev is not None
            and art is not None
            and art.type == "long"
            and prev[1] is not None
            and prev[1].type == "long"
            and note.articulation_id == prev[0].articulation_id
            and note.start_tick - prev[0].end_tick <= rules.slur_gap_ticks
        ):
            vel *= rules.slur_softening

        # Phrase-end release.
        if note.phrase_id is not None and note.end_tick == phrase_last.get(note.phrase_id):
            vel *= rules.phrase_end_release

        note.velocity = _clamp_vel(vel)
        prev = (note, art)

    return track
