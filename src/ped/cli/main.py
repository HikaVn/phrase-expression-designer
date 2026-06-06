"""``ped`` command-line interface.

Commands (MVP):
    inspect-midi      summarize a MIDI file
    import-midi       MIDI -> project JSON
    validate-profile  check an instrument profile
    apply-template    add a template expression curve to a project track
    export-midi       project JSON + profile -> MIDI with CC and keyswitches

Ranges are given in ticks for the MVP. Bar:beat ranges need tempo/meter
interpretation and are tracked in TODO.md.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ..core.project import Project
from ..engine.expression_mapper import map_track_to_cc
from ..engine.rule_engine import generate_keyswitches
from ..engine.templates import build_curve, template_names
from ..midi.reader import read_midi
from ..midi.writer import write_midi
from ..profiles.instrument_profile import InstrumentProfile
from ..profiles.validation import validate_profile


def _cmd_inspect_midi(args: argparse.Namespace) -> int:
    project = read_midi(args.file)
    print(f"File: {args.file}")
    print(f"PPQ (ticks/quarter): {project.ppq}")
    print(f"Tracks with notes: {len(project.tracks)}")
    for track in project.tracks:
        start, end = track.tick_span()
        print(f"  - {track.name!r}: {len(track.notes)} notes, ticks {start}-{end}")
    if project.tempo_map:
        tempos = ", ".join(f"{t.bpm:g}@{t.tick}" for t in project.tempo_map)
        print(f"Tempo events: {tempos}")
    return 0


def _cmd_import_midi(args: argparse.Namespace) -> int:
    project = read_midi(args.file)
    if args.profile:
        for track in project.tracks:
            track.instrument_profile_id = args.profile
    out = Path(args.output) if args.output else Path(args.file).with_suffix(".project.json")
    project.save(out)
    print(f"Wrote project: {out} ({len(project.tracks)} tracks)")
    return 0


def _cmd_validate_profile(args: argparse.Namespace) -> int:
    profile = InstrumentProfile.load(args.file)
    report = validate_profile(profile)
    for issue in report.issues:
        print(issue)
    if report.ok:
        print(f"OK: profile {profile.id!r} valid ({len(report.warnings)} warning(s)).")
        return 0
    print(f"FAILED: {len(report.errors)} error(s), {len(report.warnings)} warning(s).")
    return 1


def _cmd_apply_template(args: argparse.Namespace) -> int:
    project = Project.load(args.project)
    track = project.track_by_name(args.track)
    if track is None:
        print(f"error: no track named {args.track!r} in {args.project}", file=sys.stderr)
        return 2
    start, end = args.start, args.end
    if end is None:
        _s, end = track.tick_span()
    curve_id = args.curve_id or f"curve_{args.template}_{start}_{end}"
    curve = build_curve(args.template, curve_id, start, end)
    track.expression_curves.append(curve)
    out = Path(args.output) if args.output else Path(args.project)
    project.save(out)
    print(
        f"Added {args.template!r} curve (param={curve.parameter}) to track "
        f"{track.name!r} over ticks {start}-{end}. Wrote {out}."
    )
    return 0


def _cmd_export_midi(args: argparse.Namespace) -> int:
    project = Project.load(args.project)
    profile = InstrumentProfile.load(args.profile)
    bpm = project.tempo_map[0].bpm if project.tempo_map else 120.0

    cc_by_track: dict[int, list] = {}
    ks_by_track: dict[int, list] = {}
    total_cc = total_ks = 0
    for index, track in enumerate(project.tracks):
        cc = map_track_to_cc(track, profile, ppq=project.ppq, bpm=bpm)
        ks = generate_keyswitches(track, profile)
        if cc:
            cc_by_track[index] = cc
            total_cc += len(cc)
        if ks:
            ks_by_track[index] = ks
            total_ks += len(ks)

    write_midi(
        project,
        args.output,
        cc_events=cc_by_track,
        keyswitches=ks_by_track,
        input_path=args.project,
    )
    print(f"Wrote {args.output}: {total_cc} CC event(s), {total_ks} keyswitch(es).")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="ped", description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("inspect-midi", help="summarize a MIDI file")
    p.add_argument("file")
    p.set_defaults(func=_cmd_inspect_midi)

    p = sub.add_parser("import-midi", help="MIDI -> project JSON")
    p.add_argument("file")
    p.add_argument("--profile", help="instrument profile id to attach to tracks")
    p.add_argument("-o", "--output", help="output project JSON path")
    p.set_defaults(func=_cmd_import_midi)

    p = sub.add_parser("validate-profile", help="validate an instrument profile")
    p.add_argument("file")
    p.set_defaults(func=_cmd_validate_profile)

    p = sub.add_parser("apply-template", help="add a template expression curve to a track")
    p.add_argument("template", choices=template_names())
    p.add_argument("--project", required=True, help="project JSON path")
    p.add_argument("--track", required=True, help="track name")
    p.add_argument("--start", type=int, default=0, help="start tick (default 0)")
    p.add_argument("--end", type=int, default=None, help="end tick (default: track end)")
    p.add_argument("--curve-id", help="explicit curve id")
    p.add_argument("-o", "--output", help="output project JSON (default: in place)")
    p.set_defaults(func=_cmd_apply_template)

    p = sub.add_parser("export-midi", help="project JSON + profile -> MIDI with CC/keyswitches")
    p.add_argument("--project", required=True, help="project JSON path")
    p.add_argument("--profile", required=True, help="instrument profile JSON path")
    p.add_argument("-o", "--output", required=True, help="output MIDI path")
    p.set_defaults(func=_cmd_export_midi)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
