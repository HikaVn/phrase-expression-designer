"""Interactive wizards: build a starter profile or a calibration curve by prompts.

Kept separate from the CLI so they can be unit-tested with injected
``input_fn`` / ``output_fn`` and a fake instrument scanner.
"""

from __future__ import annotations

from collections.abc import Callable

from .instrument_scan import InstrumentPlugin, scan_instruments
from .interactive import InputFn, OutputFn, ask, choose
from .profile_template import build_starter_profile, infer_engine, slugify
from .profiles.calibration import CalibrationCurve
from .profiles.calibration_assistant import DYNAMIC_LEVELS, build_from_dynamics
from .profiles.instrument_profile import InstrumentProfile


def new_profile_wizard(
    *,
    scan: Callable[[], list[InstrumentPlugin]] = scan_instruments,
    input_fn: InputFn = input,
    output_fn: OutputFn = print,
) -> InstrumentProfile:
    """Pick an installed instrument, then prompt for the profile's fields."""
    output_fn("Scanning installed instruments… (this can take a moment)")
    plugins = scan()
    options = [
        (
            f"{p.format}  {p.name}" + (f"  ({p.manufacturer})" if p.manufacturer else ""),
            p,
        )
        for p in plugins
    ]
    chosen = choose(
        options, prompt="Pick an instrument", allow_skip=True,
        input_fn=input_fn, output_fn=output_fn,
    )
    name = chosen.name if chosen else (
        ask("Instrument name (optional)", input_fn=input_fn, output_fn=output_fn) or None
    )

    engine = ask(
        "Engine", infer_engine(name) or name or "", input_fn=input_fn, output_fn=output_fn
    ) or None
    library = ask("Library", name or "", input_fn=input_fn, output_fn=output_fn) or None
    patch = ask("Patch", input_fn=input_fn, output_fn=output_fn) or None
    naming = ask("Note naming (C3=60/C4=60)", "C3=60", input_fn=input_fn, output_fn=output_fn)
    if naming not in ("C3=60", "C4=60"):
        naming = "C3=60"
    default_id = slugify(name or library or engine, patch)
    profile_id = ask("Profile id", default_id, input_fn=input_fn, output_fn=output_fn)

    return build_starter_profile(
        profile_id, engine=engine, library=library, patch=patch, note_naming=naming
    )


def calibration_wizard(
    curve_id_default: str = "dyn_default",
    *,
    input_fn: InputFn = input,
    output_fn: OutputFn = print,
) -> CalibrationCurve:
    """Prompt for a CC value per dynamic (ppp..fff) and build a calibration curve."""
    output_fn("Enter the CC value (0-127) for each dynamic; leave blank to skip.")
    levels: dict[str, int] = {}
    for level in DYNAMIC_LEVELS:
        raw = ask(f"  {level}", input_fn=input_fn, output_fn=output_fn)
        if not raw:
            continue
        try:
            value = int(raw)
        except ValueError:
            output_fn(f"  '{raw}' is not a number — skipped")
            continue
        if not 0 <= value <= 127:
            output_fn(f"  {value} out of 0-127 — skipped")
            continue
        levels[level] = value
    curve_id = ask("Curve id", curve_id_default, input_fn=input_fn, output_fn=output_fn)
    return build_from_dynamics(curve_id, levels)
