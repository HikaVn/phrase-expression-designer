"""Instrument-profile validation.

Distinguishes hard errors (the profile would produce wrong/unsafe MIDI) from
warnings (likely a mistake, but usable). See Task 007 in the spec.
"""

from __future__ import annotations

from ..core.report import ERROR, WARNING, Issue, ValidationReport
from .calibration import CalibrationCurve
from .instrument_profile import InstrumentProfile
from .pitch_compat import resolve_keyswitch_note

__all__ = ["ERROR", "WARNING", "Issue", "ValidationReport", "validate_profile"]


def _check_calibration_range(curve: CalibrationCurve, report: ValidationReport) -> None:
    for pt in curve.points:
        if not 0 <= pt.output <= 127:
            report.add(
                ERROR,
                "cc_out_of_range",
                f"Calibration curve {curve.id!r} output {pt.output} is outside 0-127.",
            )
        if not 0.0 <= pt.input <= 1.0:
            report.add(
                WARNING,
                "calibration_input_range",
                f"Calibration curve {curve.id!r} input {pt.input} is outside 0.0-1.0.",
            )


def validate_profile(profile: InstrumentProfile) -> ValidationReport:
    report = ValidationReport()

    # noteNaming present and supported.
    from .pitch_compat import SUPPORTED_NAMINGS  # local import to avoid cycle at import time

    if not profile.note_naming:
        report.add(ERROR, "note_naming_missing", "Profile has no noteNaming.")
    elif profile.note_naming not in SUPPORTED_NAMINGS:
        report.add(
            ERROR,
            "note_naming_unknown",
            f"noteNaming {profile.note_naming!r} not in {SUPPORTED_NAMINGS}.",
        )

    # Keyswitch duplication + playable-range collision.
    seen_ks: dict[int, str] = {}
    for art in profile.articulations:
        trig = art.trigger
        if trig is None or trig.type != "keyswitch":
            continue
        note = resolve_keyswitch_note(trig, profile.note_naming, report, art.id)
        if note is None:
            continue
        if note in seen_ks:
            report.add(
                ERROR,
                "keyswitch_duplicate",
                f"Articulations {seen_ks[note]!r} and {art.id!r} both use keyswitch note {note}.",
            )
        else:
            seen_ks[note] = art.id
        if profile.playable_range and profile.playable_range.contains(note):
            report.add(
                ERROR,
                "keyswitch_range_collision",
                f"Keyswitch note {note} for {art.id!r} falls inside the playable "
                f"range {profile.playable_range.low}-{profile.playable_range.high}.",
            )

    # Articulation cc / program_change trigger values must be in 0-127, or they
    # produce invalid MIDI when an articulation fires on export.
    for art in profile.articulations:
        trig = art.trigger
        if trig is None:
            continue
        for label, value in (("cc", trig.cc), ("value", trig.value), ("program", trig.program)):
            if value is not None and not 0 <= value <= 127:
                report.add(
                    ERROR,
                    "articulation_trigger_range",
                    f"Articulation {art.id!r} trigger {label}={value} is outside 0-127.",
                )

    # CC mappings.
    if not profile.cc_mappings:
        report.add(WARNING, "cc_unassigned", "Profile defines no ccMappings.")
    curve_ids = {c.id for c in profile.calibration_curves}
    for mapping in profile.cc_mappings:
        cc = mapping.cc_number
        if mapping.target.get("type") == "cc" and (cc is None or not 0 <= cc <= 127):
            report.add(
                ERROR,
                "cc_out_of_range",
                f"CC mapping for {mapping.internal_parameter!r} has invalid CC number {cc!r}.",
            )
        if mapping.curve_id and mapping.curve_id not in curve_ids:
            report.add(
                ERROR,
                "calibration_missing",
                f"CC mapping for {mapping.internal_parameter!r} references unknown "
                f"calibration curve {mapping.curve_id!r}.",
            )
        if mapping.input_cc is not None and not 0 <= mapping.input_cc <= 127:
            report.add(
                ERROR,
                "input_cc_out_of_range",
                f"CC mapping for {mapping.internal_parameter!r} has invalid "
                f"inputCc {mapping.input_cc!r} (must be 0-127).",
            )

    for curve in profile.calibration_curves:
        _check_calibration_range(curve, report)

    return report
