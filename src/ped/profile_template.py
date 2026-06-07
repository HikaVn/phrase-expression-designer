"""Scaffold a starter InstrumentProfile so users don't write JSON from scratch.

The template is a sensible, *valid* strings-style profile (legato/sustain/
staccato keyswitches; intensity/volume/vibrato CC mappings; three calibration
curves). The user then edits `library`/`patch`, keyswitch notes, and calibration
to match their actual instrument.
"""

from __future__ import annotations

import re

from .core.pitch import note_name_to_number
from .profiles.articulation import Articulation, CCMapping, Trigger
from .profiles.calibration import CalibrationCurve, CalibrationPoint
from .profiles.instrument_profile import InstrumentProfile, PlayableRange

# Known sampler hosts -> a tidy `engine` value, matched as a substring of the name.
_ENGINE_HINTS = {
    "kontakt": "Kontakt",
    "opus": "Opus",
    "play": "Play",
    "sine": "SINE",
    "spitfire": "Spitfire Player",
    "sforzando": "sforzando",
    "halion": "HALion",
}


def slugify(*parts: str | None) -> str:
    """Make a profile id from name parts: 'Kontakt 8', 'Vln1' -> 'kontakt_8_vln1'."""
    joined = "_".join(p for p in parts if p)
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", joined).strip("_").lower()
    return slug or "new_profile"


def infer_engine(instrument_name: str | None) -> str | None:
    """Guess a tidy engine name from an installed plugin name, or None."""
    if not instrument_name:
        return None
    low = instrument_name.lower()
    for needle, engine in _ENGINE_HINTS.items():
        if needle in low:
            return engine
    return None


def build_starter_profile(
    profile_id: str,
    engine: str | None = None,
    library: str | None = None,
    patch: str | None = None,
    note_naming: str = "C3=60",
) -> InstrumentProfile:
    """Build a valid starter profile. Keyswitch notes follow ``note_naming``."""

    def ks(name: str) -> int:
        return note_name_to_number(name, note_naming)

    articulations = [
        Articulation(
            id="legato", name="Legato", type="long",
            trigger=Trigger(type="keyswitch", note=ks("C0"), note_name="C0", mode="latch"),
            default_macro="natural_swell",
            expression_behavior={"velocityRole": "secondary", "ccRole": "primary"},
        ),
        Articulation(
            id="sustain", name="Sustain", type="long",
            trigger=Trigger(type="keyswitch", note=ks("C#0"), note_name="C#0", mode="latch"),
            expression_behavior={"velocityRole": "secondary", "ccRole": "primary"},
        ),
        Articulation(
            id="staccato", name="Staccato", type="short",
            trigger=Trigger(type="keyswitch", note=ks("D0"), note_name="D0", mode="latch"),
            expression_behavior={"velocityRole": "primary", "ccRole": "secondary"},
        ),
    ]

    cc_mappings = [
        CCMapping("intensity", {"type": "cc", "cc": 1}, curve_id="dyn_default",
                  smoothing_ms=40, input_cc=1),
        CCMapping("volume", {"type": "cc", "cc": 11}, curve_id="expr_default", smoothing_ms=40),
        CCMapping("vibratoDepth", {"type": "cc", "cc": 21}, curve_id="linear_full"),
    ]

    calibration_curves = [
        CalibrationCurve("dyn_default", interpolation="monotonic", points=[
            CalibrationPoint(0.0, 8), CalibrationPoint(0.25, 35), CalibrationPoint(0.5, 68),
            CalibrationPoint(0.75, 96), CalibrationPoint(1.0, 120),
        ]),
        CalibrationCurve("expr_default", interpolation="monotonic", points=[
            CalibrationPoint(0.0, 20), CalibrationPoint(0.5, 90), CalibrationPoint(1.0, 127),
        ]),
        CalibrationCurve("linear_full", interpolation="linear", points=[
            CalibrationPoint(0.0, 0), CalibrationPoint(1.0, 127),
        ]),
    ]

    return InstrumentProfile(
        id=profile_id,
        engine=engine,
        library=library,
        patch=patch,
        note_naming=note_naming,
        playable_range=PlayableRange(low=36, high=96),  # placeholder; set to your range
        articulations=articulations,
        cc_mappings=cc_mappings,
        calibration_curves=calibration_curves,
    )
