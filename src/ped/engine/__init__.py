"""Expression mapping, templates, rules, and smoothing (DAW-independent)."""

from .expression_mapper import map_track_to_cc
from .macros import build_macro, macro_names
from .performance import (
    LegatoRules,
    VelocityRules,
    apply_legato_overlap,
    apply_velocity_rules,
    detect_phrases,
)
from .phrase_painter import DEFAULT_TARGETS, PaintTarget, paint
from .rule_engine import (
    ArticulationEvents,
    generate_articulation_events,
    generate_keyswitches,
)
from .smoothing import one_pole
from .templates import build_curve, template_names

__all__ = [
    "map_track_to_cc",
    "generate_keyswitches",
    "generate_articulation_events",
    "ArticulationEvents",
    "detect_phrases",
    "apply_velocity_rules",
    "apply_legato_overlap",
    "VelocityRules",
    "LegatoRules",
    "paint",
    "PaintTarget",
    "DEFAULT_TARGETS",
    "build_macro",
    "macro_names",
    "one_pole",
    "build_curve",
    "template_names",
]
