"""Tiny interactive-prompt helpers for the CLI wizards.

``input_fn`` / ``output_fn`` are injectable so the wizards can be unit-tested
without a real terminal.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import TypeVar

InputFn = Callable[[str], str]
OutputFn = Callable[[str], None]

T = TypeVar("T")


def ask(
    label: str,
    default: str | None = None,
    *,
    input_fn: InputFn = input,
    output_fn: OutputFn = print,
) -> str:
    """Prompt for free text. Empty input returns ``default`` (or "")."""
    suffix = f" [{default}]" if default else ""
    raw = input_fn(f"{label}{suffix}: ").strip()
    return raw if raw else (default or "")


def choose(
    options: list[tuple[str, T]],
    *,
    prompt: str = "Select",
    allow_skip: bool = False,
    input_fn: InputFn = input,
    output_fn: OutputFn = print,
) -> T | None:
    """Show a numbered menu and return the chosen value (or None if skipped)."""
    if not options:
        return None
    for i, (label, _) in enumerate(options, 1):
        output_fn(f"  {i}) {label}")
    if allow_skip:
        output_fn("  0) (skip)")
    hint = f"[1-{len(options)}{'/0' if allow_skip else ''}]"
    while True:
        raw = input_fn(f"{prompt} {hint}: ").strip()
        if allow_skip and raw == "0":
            return None
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return options[int(raw) - 1][1]
        output_fn("  invalid choice, try again")
