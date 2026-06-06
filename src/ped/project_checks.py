"""Project-level validation (structure + cross-references).

Operates on the raw JSON dict so it can catch out-of-range values *before*
loading clips them. Optionally cross-checks a project against an
InstrumentProfile (articulation ids, mapped parameters).
"""

from __future__ import annotations

from typing import Any

from .core.report import ERROR, WARNING, ValidationReport
from .profiles.instrument_profile import InstrumentProfile


def validate_project_dict(
    data: dict[str, Any], profile: InstrumentProfile | None = None
) -> ValidationReport:
    report = ValidationReport()

    if not data.get("schemaVersion"):
        report.add(WARNING, "schema_version_missing", "Project has no schemaVersion.")

    ppq = data.get("ppq", 960)
    if not isinstance(ppq, int) or ppq <= 0:
        report.add(ERROR, "ppq_invalid", f"ppq must be a positive integer, got {ppq!r}.")

    profile_params = (
        {m.internal_parameter for m in profile.cc_mappings} if profile else set()
    )
    profile_arts = {a.id for a in profile.articulations} if profile else set()

    for t_index, track in enumerate(data.get("tracks", [])):
        where = f"track[{t_index}] {track.get('name', track.get('id', '?'))!r}"
        phrase_ids = {p.get("id") for p in track.get("phrases", [])}

        for note in track.get("notes", []):
            nid = note.get("id", "?")
            pitch = note.get("pitch")
            if not isinstance(pitch, int) or not 0 <= pitch <= 127:
                report.add(
                    ERROR, "note_pitch_range", f"{where} note {nid}: pitch {pitch!r} outside 0-127."
                )
            if note.get("startTick", 0) < 0:
                report.add(
                    ERROR, "note_start_negative", f"{where} note {nid}: negative startTick."
                )
            if note.get("durationTick", 0) < 0:
                report.add(
                    ERROR, "note_duration_negative", f"{where} note {nid}: negative durationTick."
                )
            vel = note.get("velocity", 80)
            if not 0 <= vel <= 127:
                report.add(
                    WARNING, "note_velocity_range",
                    f"{where} note {nid}: velocity {vel} outside 0-127.",
                )
            pid = note.get("phraseId")
            if pid is not None and phrase_ids and pid not in phrase_ids:
                report.add(
                    WARNING, "note_phrase_missing",
                    f"{where} note {nid}: phraseId {pid!r} not defined.",
                )
            aid = note.get("articulationId")
            if profile and aid is not None and aid not in profile_arts:
                report.add(
                    WARNING, "note_articulation_unknown",
                    f"{where} note {nid}: articulation {aid!r} not in profile.",
                )

        for curve in track.get("expressionCurves", []):
            cid = curve.get("id", "?")
            for pt in curve.get("points", []):
                v = pt.get("value")
                if not isinstance(v, (int, float)) or not 0.0 <= v <= 1.0:
                    report.add(
                        ERROR, "curve_value_range",
                        f"{where} curve {cid}: value {v!r} outside 0.0-1.0.",
                    )
                if pt.get("tick", 0) < 0:
                    report.add(
                        ERROR, "curve_tick_negative", f"{where} curve {cid}: negative tick."
                    )
            if profile and curve.get("parameter") not in profile_params:
                report.add(
                    WARNING,
                    "curve_parameter_unmapped",
                    f"{where} curve {cid}: parameter {curve.get('parameter')!r} "
                    f"has no CC mapping in the profile.",
                )

    return report
