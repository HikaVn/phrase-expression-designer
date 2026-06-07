"""Interactive editor for an existing InstrumentProfile.

A flat menu (no deep nesting) of small, individually testable actions. Each
editor mutates the profile in place; the main loop returns whether the user
chose to save. Built on the injectable ``ask`` / ``choose`` helpers so the whole
thing is unit-testable without a terminal.
"""

from __future__ import annotations

from typing import Any

from .core.pitch import note_name_to_number
from .interactive import InputFn, OutputFn, ask, choose
from .profiles.articulation import (
    ARTICULATION_TYPES,
    KEYSWITCH_MODES,
    TRIGGER_TYPES,
    Articulation,
    CCMapping,
    Trigger,
)
from .profiles.instrument_profile import InstrumentProfile, PlayableRange
from .profiles.validation import validate_profile
from .wizards import calibration_wizard


def _byte(raw: str) -> int | None:
    """Parse a MIDI 0-127 value; None for blank or out-of-range/invalid input."""
    raw = raw.strip()
    return int(raw) if raw.isdigit() and 0 <= int(raw) <= 127 else None


def _parse_note(raw: str, naming: str) -> int | None:
    """A keyswitch note as a number ('24') or a name ('C0'), per noteNaming."""
    raw = raw.strip()
    if not raw:
        return None
    if raw.lstrip("-").isdigit():
        return int(raw)
    try:
        return note_name_to_number(raw, naming)
    except ValueError:
        return None


def summary(profile: InstrumentProfile) -> str:
    pr = profile.playable_range
    rng = f"{pr.low}-{pr.high}" if pr else "—"
    return (
        f"Profile {profile.id!r}: engine={profile.engine!r} library={profile.library!r} "
        f"patch={profile.patch!r} naming={profile.note_naming} range={rng}\n"
        f"  articulations={len(profile.articulations)} "
        f"ccMappings={len(profile.cc_mappings)} "
        f"calibrationCurves={len(profile.calibration_curves)}"
    )


def edit_metadata(
    profile: InstrumentProfile, *, input_fn: InputFn = input, output_fn: OutputFn = print
) -> None:
    def a(label: str, default: str = "") -> str:
        return ask(label, default, input_fn=input_fn, output_fn=output_fn)

    profile.engine = a("Engine", profile.engine or "") or None
    profile.library = a("Library", profile.library or "") or None
    profile.patch = a("Patch", profile.patch or "") or None
    naming = a("Note naming (C3=60/C4=60)", profile.note_naming)
    if naming in ("C3=60", "C4=60"):
        profile.note_naming = naming
    low = a("Playable range low (MIDI, blank to keep)")
    high = a("Playable range high (MIDI, blank to keep)")
    if low.isdigit() and high.isdigit():
        profile.playable_range = PlayableRange(low=int(low), high=int(high))


def add_articulation(
    profile: InstrumentProfile, *, input_fn: InputFn = input, output_fn: OutputFn = print
) -> None:
    def a(label: str, default: str = "") -> str:
        return ask(label, default, input_fn=input_fn, output_fn=output_fn)

    def c(opts: list[tuple[str, str]], prompt: str) -> str | None:
        return choose(opts, prompt=prompt, input_fn=input_fn, output_fn=output_fn)

    art_id = a("New articulation id (blank to cancel)")
    if not art_id:
        return
    if profile.articulation_by_id(art_id):
        output_fn(f"  id {art_id!r} already exists — cancelled")
        return
    name = a("Name", art_id)
    art_type = c([(t, t) for t in ARTICULATION_TYPES], "Type") or "long"
    trig_type = c([(t, t) for t in TRIGGER_TYPES], "Trigger") or "keyswitch"

    trigger: Trigger | None = None
    if trig_type == "keyswitch":
        note = _parse_note(a("Keyswitch note (number or name e.g. C0)"), profile.note_naming)
        if note is None:
            output_fn("  no valid note — cancelled")
            return
        mode = c([(m, m) for m in KEYSWITCH_MODES], "Mode") or "latch"
        trigger = Trigger(type="keyswitch", note=note, mode=mode)
    elif trig_type == "cc":
        cc = _byte(a("CC number (0-127)"))
        if cc is None:
            output_fn("  CC number must be 0-127 — cancelled")
            return
        val_raw = a("CC value (0-127, blank for none)")
        value = _byte(val_raw) if val_raw else None
        if val_raw and value is None:
            output_fn("  CC value must be 0-127 — cancelled")
            return
        trigger = Trigger(type="cc", cc=cc, value=value)
    else:  # program_change
        program = _byte(a("Program (0-127)"))
        if program is None:
            output_fn("  program must be 0-127 — cancelled")
            return
        trigger = Trigger(type="program_change", program=program)

    profile.articulations.append(Articulation(id=art_id, name=name, type=art_type, trigger=trigger))
    output_fn(f"  added articulation {art_id!r}")


def remove_articulation(
    profile: InstrumentProfile, *, input_fn: InputFn = input, output_fn: OutputFn = print
) -> None:
    if not profile.articulations:
        output_fn("  no articulations")
        return
    art = choose(
        [(f"{a.id} ({a.name})", a) for a in profile.articulations],
        prompt="Remove which", allow_skip=True, input_fn=input_fn, output_fn=output_fn,
    )
    if art is not None:
        profile.articulations.remove(art)
        output_fn(f"  removed {art.id!r}")


def add_cc_mapping(
    profile: InstrumentProfile, *, input_fn: InputFn = input, output_fn: OutputFn = print
) -> None:
    def a(label: str, default: str = "") -> str:
        return ask(label, default, input_fn=input_fn, output_fn=output_fn)

    parameter = a("Intent parameter (e.g. intensity, blank to cancel)")
    if not parameter:
        return
    cc = a("Output CC number")
    if not cc.isdigit():
        output_fn("  CC must be a number — cancelled")
        return
    curve_options = [(c.id, c.id) for c in profile.calibration_curves]
    curve_id = (
        choose(curve_options, prompt="Calibration curve", allow_skip=True,
               input_fn=input_fn, output_fn=output_fn)
        if curve_options else None
    )
    in_cc = a("Input CC (live source, blank for none)")
    smooth_raw = a("Smoothing ms (blank for 0)")
    smoothing = 0.0
    if smooth_raw:
        try:
            smoothing = max(0.0, float(smooth_raw))
        except ValueError:
            output_fn(f"  '{smooth_raw}' is not a number — using 0")
    profile.cc_mappings.append(
        CCMapping(
            internal_parameter=parameter,
            target={"type": "cc", "cc": int(cc)},
            curve_id=curve_id,
            input_cc=int(in_cc) if in_cc.isdigit() else None,
            smoothing_ms=smoothing,
        )
    )
    output_fn(f"  added mapping {parameter} -> CC{cc}")


def remove_cc_mapping(
    profile: InstrumentProfile, *, input_fn: InputFn = input, output_fn: OutputFn = print
) -> None:
    if not profile.cc_mappings:
        output_fn("  no cc mappings")
        return
    m = choose(
        [(f"{m.internal_parameter} -> CC{m.cc_number}", m) for m in profile.cc_mappings],
        prompt="Remove which", allow_skip=True, input_fn=input_fn, output_fn=output_fn,
    )
    if m is not None:
        profile.cc_mappings.remove(m)
        output_fn(f"  removed mapping for {m.internal_parameter!r}")


def add_calibration(
    profile: InstrumentProfile, *, input_fn: InputFn = input, output_fn: OutputFn = print
) -> None:
    curve = calibration_wizard(input_fn=input_fn, output_fn=output_fn)
    profile.calibration_curves = [
        c for c in profile.calibration_curves if c.id != curve.id
    ] + [curve]
    output_fn(f"  saved calibration curve {curve.id!r}")


def remove_calibration(
    profile: InstrumentProfile, *, input_fn: InputFn = input, output_fn: OutputFn = print
) -> None:
    if not profile.calibration_curves:
        output_fn("  no calibration curves")
        return
    curve = choose(
        [(c.id, c) for c in profile.calibration_curves],
        prompt="Remove which", allow_skip=True, input_fn=input_fn, output_fn=output_fn,
    )
    if curve is not None:
        profile.calibration_curves.remove(curve)
        output_fn(f"  removed curve {curve.id!r}")


_ACTIONS = [
    ("Edit metadata", edit_metadata),
    ("Add articulation", add_articulation),
    ("Remove articulation", remove_articulation),
    ("Add CC mapping", add_cc_mapping),
    ("Remove CC mapping", remove_cc_mapping),
    ("Add/replace calibration curve", add_calibration),
    ("Remove calibration curve", remove_calibration),
]


def edit_profile_wizard(
    profile: InstrumentProfile, *, input_fn: InputFn = input, output_fn: OutputFn = print
) -> bool:
    """Run the editor loop. Returns True if the user chose Save & quit."""
    while True:
        output_fn(summary(profile))
        options: list[tuple[str, Any]] = list(_ACTIONS)
        options.append(("Validate", "validate"))
        options.append(("Save & quit", "save"))
        action = choose(
            options, prompt="Edit what", allow_skip=True, input_fn=input_fn, output_fn=output_fn
        )
        if action is None:  # skip = quit without saving
            return False
        if action == "save":
            return True
        if action == "validate":
            report = validate_profile(profile)
            for issue in report.issues:
                output_fn(str(issue))
            output_fn("  OK" if report.ok else f"  {len(report.errors)} error(s)")
            continue
        action(profile, input_fn=input_fn, output_fn=output_fn)
