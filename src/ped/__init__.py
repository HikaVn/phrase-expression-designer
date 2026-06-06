"""Phrase Expression Designer.

DAW-independent core for turning normalized *performance intent*
(intensity, timbre, vibrato, ...) into MIDI CC, velocity, and keyswitch
output through instrument-specific profiles.

Layering (see docs/ARCHITECTURE.md):
    core       -- DAW-independent musical data (Note, Track, Project, curves)
    profiles   -- instrument-specific mappings (profiles, articulations, calibration)
    midi       -- MIDI parsing/writing (mido)
    engine     -- expression mapping, templates, rules, smoothing
    cli        -- command line entry points
"""

__version__ = "0.1.0"
SCHEMA_VERSION = "0.1.0"
