"""Expression mapping, templates, rules, and smoothing (DAW-independent)."""

from .expression_mapper import map_track_to_cc
from .rule_engine import generate_keyswitches
from .smoothing import one_pole
from .templates import build_curve, template_names

__all__ = [
    "map_track_to_cc",
    "generate_keyswitches",
    "one_pole",
    "build_curve",
    "template_names",
]
