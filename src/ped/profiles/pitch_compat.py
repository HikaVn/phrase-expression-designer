"""Bridge between Trigger note specs and the core pitch helpers.

Resolves a keyswitch trigger to a concrete MIDI note number, honoring the
profile's noteNaming and flagging note / noteName disagreements (a classic
C3=60 vs C4=60 mistake).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from ..core.pitch import SUPPORTED_NAMINGS, note_name_to_number

if TYPE_CHECKING:
    from .articulation import Trigger
    from .validation import ValidationReport

__all__ = ["SUPPORTED_NAMINGS", "resolve_keyswitch_note"]


def resolve_keyswitch_note(
    trigger: "Trigger",
    naming: str,
    report: Optional["ValidationReport"] = None,
    art_id: str = "",
) -> Optional[int]:
    """Return the effective MIDI note for a keyswitch trigger, or None if unknown.

    The explicit ``note`` wins; ``noteName`` is used as a fallback and as a
    cross-check. Disagreements and missing data are reported when a report is
    supplied.
    """
    from_name: Optional[int] = None
    if trigger.note_name and naming in SUPPORTED_NAMINGS:
        try:
            from_name = note_name_to_number(trigger.note_name, naming)
        except ValueError as exc:
            if report is not None:
                report.add(
                    "error",
                    "keyswitch_note_name",
                    f"Articulation {art_id!r}: {exc}",
                )

    if trigger.note is not None:
        if from_name is not None and from_name != trigger.note and report is not None:
            report.add(
                "warning",
                "keyswitch_note_mismatch",
                f"Articulation {art_id!r}: note {trigger.note} disagrees with "
                f"noteName {trigger.note_name!r} ({from_name}) under {naming}.",
            )
        return int(trigger.note)

    if from_name is not None:
        return from_name

    if report is not None:
        report.add(
            "error",
            "keyswitch_note_missing",
            f"Articulation {art_id!r}: keyswitch trigger has neither note nor a "
            f"resolvable noteName.",
        )
    return None
