"""Scan installed instrument plugins to help author Instrument Profiles.

What this can and cannot do:
- **Can**: list installed plugin *names* — Audio Units via ``auval -a`` (with the
  reliable 4-char type/subtype/manufacturer codes), and VST3 bundles by folder.
- **Cannot**: read the *patch* loaded inside a sampler (e.g. a Kontakt .nki), or
  what a DAW currently has loaded. A MIDI FX has no access to the sibling
  instrument, and we deliberately don't introspect protected libraries.

So this fills the profile's ``library`` hint; the ``patch`` still belongs to you.

Note: ``auval -a`` instantiates components, so a few misbehaving plugins print
log noise that ends up glued to their name. The codes are always clean.
"""

from __future__ import annotations

import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# e.g. "aumu NiK8 -NI-  -  Native Instruments: Kontakt 8"
#       TYPE SUBT MANU  -  Manufacturer: Plugin name
_AU_LINE = re.compile(r"^(.{4}) (.{4}) (.{4})  -  ([^:]+): (.*)$")

# AU component type for instruments (kAudioUnitType_MusicDevice).
AU_INSTRUMENT_TYPE = "aumu"

DEFAULT_VST3_DIRS = (
    Path.home() / "Library/Audio/Plug-Ins/VST3",
    Path("/Library/Audio/Plug-Ins/VST3"),
)


@dataclass
class InstrumentPlugin:
    format: str  # "AU" or "VST3"
    name: str
    manufacturer: str | None = None
    au_type: str | None = None
    subtype: str | None = None
    manufacturer_code: str | None = None
    path: str | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"format": self.format, "name": self.name}
        for key, val in (
            ("manufacturer", self.manufacturer),
            ("type", self.au_type),
            ("subtype", self.subtype),
            ("manufacturerCode", self.manufacturer_code),
            ("path", self.path),
        ):
            if val is not None:
                out[key] = val
        return out


def parse_auval(text: str, instruments_only: bool = True) -> list[InstrumentPlugin]:
    """Parse ``auval -a`` output into plugin records."""
    found: list[InstrumentPlugin] = []
    for line in text.splitlines():
        m = _AU_LINE.match(line.rstrip())
        if not m:
            continue
        au_type, subtype, man_code, manufacturer, name = m.groups()
        au_type = au_type.strip()
        if instruments_only and au_type != AU_INSTRUMENT_TYPE:
            continue
        found.append(
            InstrumentPlugin(
                format="AU",
                name=name.strip(),
                manufacturer=manufacturer.strip(),
                au_type=au_type,
                subtype=subtype.strip(),
                manufacturer_code=man_code.strip(),
            )
        )
    return found


def scan_audio_units(instruments_only: bool = True) -> list[InstrumentPlugin]:
    """Run ``auval -a`` and return installed AU plugins. Empty list if unavailable."""
    if shutil.which("auval") is None:
        return []
    try:
        result = subprocess.run(
            ["auval", "-a"], capture_output=True, text=True, timeout=120, check=False
        )
    except (OSError, subprocess.SubprocessError):
        return []
    return parse_auval(result.stdout, instruments_only)


def scan_vst3(dirs: list[Path] | None = None) -> list[InstrumentPlugin]:
    """List VST3 bundles by folder. Names only (VST3 type isn't known from the name)."""
    search = dirs if dirs is not None else list(DEFAULT_VST3_DIRS)
    found: list[InstrumentPlugin] = []
    seen: set[str] = set()
    for d in search:
        d = Path(d)
        if not d.is_dir():
            continue
        for bundle in sorted(d.glob("*.vst3")):
            if bundle.name in seen:
                continue
            seen.add(bundle.name)
            found.append(InstrumentPlugin(format="VST3", name=bundle.stem, path=str(bundle)))
    return found


def scan_instruments(
    formats: tuple[str, ...] = ("au", "vst3"), instruments_only: bool = True
) -> list[InstrumentPlugin]:
    """Scan the requested plugin formats and return a combined, name-sorted list."""
    out: list[InstrumentPlugin] = []
    if "au" in formats:
        out.extend(scan_audio_units(instruments_only))
    if "vst3" in formats:
        out.extend(scan_vst3())
    return sorted(out, key=lambda p: (p.format, p.name.lower()))
