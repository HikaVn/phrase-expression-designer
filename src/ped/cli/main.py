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
import json
import sys
from pathlib import Path

from ..core.musictime import position_to_tick
from ..core.project import Project
from ..engine.expression_mapper import map_track_to_cc
from ..engine.macros import build_macro, macro_names
from ..engine.performance import apply_legato_overlap, apply_velocity_rules, detect_phrases
from ..engine.phrase_painter import paint
from ..engine.rule_engine import generate_articulation_events
from ..engine.templates import build_curve, template_names
from ..exporters.cubase import export_cubase_expression_map
from ..exporters.logic import export_logic_articulation_set
from ..instrument_scan import scan_instruments
from ..midi.reader import read_midi
from ..midi.writer import write_midi
from ..profiles.calibration_assistant import (
    build_from_dynamics,
    build_from_measurements,
    parse_levels,
    parse_measurements,
)
from ..profiles.instrument_profile import InstrumentProfile
from ..profiles.validation import validate_profile
from ..project_checks import validate_project_dict


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


def _cmd_list_instruments(args: argparse.Namespace) -> int:
    formats = ("au", "vst3") if args.format == "all" else (args.format,)
    plugins = scan_instruments(formats=formats, instruments_only=not args.all_types)
    if args.json:
        print(json.dumps([p.to_dict() for p in plugins], indent=2, ensure_ascii=False))
        return 0
    if not plugins:
        print("No instrument plugins found (auval/VST3 folders empty or unavailable).")
        return 0
    name_w = max(len(p.name) for p in plugins)
    man_w = max((len(p.manufacturer or "") for p in plugins), default=0)
    for p in plugins:
        codes = (
            f"{p.au_type} {p.subtype} {p.manufacturer_code}"
            if p.format == "AU"
            else ""
        )
        print(f"{p.format:<4}  {p.name:<{name_w}}  {(p.manufacturer or ''):<{man_w}}  {codes}")
    print(f"\n{len(plugins)} plugin(s). Use a name for a profile's \"library\" field.")
    return 0


def _cmd_validate_project(args: argparse.Namespace) -> int:
    data = json.loads(Path(args.project).read_text(encoding="utf-8"))
    profile = InstrumentProfile.load(args.profile) if args.profile else None
    report = validate_project_dict(data, profile)
    for issue in report.issues:
        print(issue)
    if report.ok:
        print(f"OK: project valid ({len(report.warnings)} warning(s)).")
        return 0
    print(f"FAILED: {len(report.errors)} error(s), {len(report.warnings)} warning(s).")
    return 1


def _emit_calibration(curve, profile_path: str | None, output: str | None) -> int:
    if profile_path:
        profile = InstrumentProfile.load(profile_path)
        profile.calibration_curves = [
            c for c in profile.calibration_curves if c.id != curve.id
        ] + [curve]
        profile.save(profile_path)
        print(f"Added calibration curve {curve.id!r} to {profile_path}.")
    else:
        text = json.dumps(curve.to_dict(), indent=2, ensure_ascii=False)
        if output:
            Path(output).write_text(text + "\n", encoding="utf-8")
            print(f"Wrote calibration curve to {output}.")
        else:
            print(text)
    return 0


def _cmd_calibrate(args: argparse.Namespace) -> int:
    curve = build_from_dynamics(args.id, parse_levels(args.levels), interpolation=args.interp)
    return _emit_calibration(curve, args.profile, args.output)


def _cmd_calibrate_auto(args: argparse.Namespace) -> int:
    curve = build_from_measurements(
        args.id, parse_measurements(args.measure), interpolation=args.interp
    )
    return _emit_calibration(curve, args.profile, args.output)


def _cmd_export_articulations(args: argparse.Namespace) -> int:
    profile = InstrumentProfile.load(args.profile)
    if args.format == "logic":
        export_logic_articulation_set(profile, args.output)
        kind = "Logic Articulation Set"
    else:
        export_cubase_expression_map(profile, args.output)
        kind = "Cubase Expression Map"
    print(
        f"Wrote {kind} for {profile.id!r} ({len(profile.articulations)} articulations) "
        f"to {args.output}."
    )
    return 0


def _cmd_apply_template(args: argparse.Namespace) -> int:
    project = Project.load(args.project)
    track = project.track_by_name(args.track)
    if track is None:
        print(f"error: no track named {args.track!r} in {args.project}", file=sys.stderr)
        return 2

    start, end = _resolve_range(args, project, track)
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


def _resolve_range(args: argparse.Namespace, project: Project, track) -> tuple[int, int]:
    ts_map = project.time_signature_map
    start_pos = getattr(args, "start_pos", None)
    end_pos = getattr(args, "end_pos", None)
    start = position_to_tick(start_pos, project.ppq, ts_map) if start_pos else args.start
    if end_pos:
        end = position_to_tick(end_pos, project.ppq, ts_map)
    elif args.end is not None:
        end = args.end
    else:
        _s, end = track.tick_span()
    return start, end


def _add_range_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--start", type=int, default=0, help="start tick (default 0)")
    p.add_argument("--end", type=int, default=None, help="end tick (default: track end)")
    p.add_argument("--start-pos", help="start as bar:beat[:tick] (overrides --start)")
    p.add_argument("--end-pos", help="end as bar:beat[:tick] (overrides --end)")


def _cmd_apply_macro(args: argparse.Namespace) -> int:
    project = Project.load(args.project)
    track = project.track_by_name(args.track)
    if track is None:
        print(f"error: no track named {args.track!r} in {args.project}", file=sys.stderr)
        return 2
    start, end = _resolve_range(args, project, track)
    curves = build_macro(args.macro, f"macro_{args.macro}_{start}", start, end)
    track.expression_curves.extend(curves)
    out = Path(args.output) if args.output else Path(args.project)
    project.save(out)
    params = ", ".join(c.parameter for c in curves)
    print(
        f"Applied macro {args.macro!r} ({len(curves)} curves: {params}) to track "
        f"{track.name!r} over ticks {start}-{end}. Wrote {out}."
    )
    return 0


def _cmd_paint_phrase(args: argparse.Namespace) -> int:
    project = Project.load(args.project)
    track = project.track_by_name(args.track)
    if track is None:
        print(f"error: no track named {args.track!r} in {args.project}", file=sys.stderr)
        return 2
    source = track.curve_for(args.source)
    if source is None:
        print(
            f"error: track {args.track!r} has no {args.source!r} curve to paint from",
            file=sys.stderr,
        )
        return 2
    derived = paint(source)
    derived_params = {c.parameter for c in derived}
    # Replace any existing curves for the derived parameters.
    track.expression_curves = [
        c for c in track.expression_curves if c.parameter not in derived_params
    ] + derived
    out = Path(args.output) if args.output else Path(args.project)
    project.save(out)
    params = ", ".join(c.parameter for c in derived)
    print(
        f"Painted {len(derived)} curves from {args.source!r} ({params}) on track "
        f"{track.name!r}. Wrote {out}."
    )
    return 0


def _cmd_export_midi(args: argparse.Namespace) -> int:
    project = Project.load(args.project)
    profile = InstrumentProfile.load(args.profile)
    bpm = project.tempo_map[0].bpm if project.tempo_map else 120.0

    cc_by_track: dict[int, list] = {}
    ks_by_track: dict[int, list] = {}
    pc_by_track: dict[int, list] = {}
    total_cc = total_ks = total_pc = 0
    for index, track in enumerate(project.tracks):
        if args.perform:
            detect_phrases(track, project.ppq)
            apply_velocity_rules(track, profile, project.ppq, project.time_signature_map)
            apply_legato_overlap(track, profile)

        cc = map_track_to_cc(track, profile, ppq=project.ppq, bpm=bpm)
        arts = generate_articulation_events(track, profile)
        # Articulation CC switches and expression CC share the stream.
        merged_cc = sorted(cc + arts.cc_events)
        if merged_cc:
            cc_by_track[index] = merged_cc
            total_cc += len(merged_cc)
        if arts.keyswitches:
            ks_by_track[index] = arts.keyswitches
            total_ks += len(arts.keyswitches)
        if arts.program_changes:
            pc_by_track[index] = arts.program_changes
            total_pc += len(arts.program_changes)

    write_midi(
        project,
        args.output,
        cc_events=cc_by_track,
        keyswitches=ks_by_track,
        program_changes=pc_by_track,
        input_path=args.project,
    )
    print(
        f"Wrote {args.output}: {total_cc} CC event(s), {total_ks} keyswitch(es), "
        f"{total_pc} program change(s)."
    )
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

    p = sub.add_parser(
        "list-instruments",
        help="list installed instrument plugins (AU via auval, VST3 by folder)",
    )
    p.add_argument("--format", choices=["au", "vst3", "all"], default="all")
    p.add_argument(
        "--all-types",
        action="store_true",
        help="AU: include all component types, not just instruments (aumu)",
    )
    p.add_argument("--json", action="store_true", help="output JSON")
    p.set_defaults(func=_cmd_list_instruments)

    p = sub.add_parser("validate-project", help="validate a project JSON (structure + refs)")
    p.add_argument("project")
    p.add_argument("--profile", help="optional profile JSON to cross-check against")
    p.set_defaults(func=_cmd_validate_project)

    p = sub.add_parser(
        "export-articulations",
        help="export a profile's articulations as a Logic or Cubase map",
    )
    p.add_argument("--profile", required=True, help="instrument profile JSON path")
    p.add_argument("--format", required=True, choices=["logic", "cubase"])
    p.add_argument("-o", "--output", required=True, help="output map path")
    p.set_defaults(func=_cmd_export_articulations)

    p = sub.add_parser("calibrate", help="build a calibration curve from dynamic levels")
    p.add_argument("--id", required=True, help="calibration curve id")
    p.add_argument(
        "--levels",
        required=True,
        help="dynamic table, e.g. 'ppp=8,p=35,mf=68,ff=110,fff=120'",
    )
    p.add_argument("--interp", default="monotonic", choices=["linear", "monotonic"])
    p.add_argument("--profile", help="profile JSON to add/replace the curve in")
    p.add_argument("-o", "--output", help="write the curve JSON here (else stdout)")
    p.set_defaults(func=_cmd_calibrate)

    p = sub.add_parser(
        "calibrate-auto",
        help="invert a measured CC->loudness response into a calibration curve",
    )
    p.add_argument("--id", required=True, help="calibration curve id")
    p.add_argument(
        "--measure",
        required=True,
        help="measured response, e.g. '0=-60,32=-40,64=-28,96=-18,127=-10' (cc=level)",
    )
    p.add_argument("--interp", default="monotonic", choices=["linear", "monotonic"])
    p.add_argument("--profile", help="profile JSON to add/replace the curve in")
    p.add_argument("-o", "--output", help="write the curve JSON here (else stdout)")
    p.set_defaults(func=_cmd_calibrate_auto)

    p = sub.add_parser("apply-template", help="add a template expression curve to a track")
    p.add_argument("template", choices=template_names())
    p.add_argument("--project", required=True, help="project JSON path")
    p.add_argument("--track", required=True, help="track name")
    _add_range_args(p)
    p.add_argument("--curve-id", help="explicit curve id")
    p.add_argument("-o", "--output", help="output project JSON (default: in place)")
    p.set_defaults(func=_cmd_apply_template)

    p = sub.add_parser("apply-macro", help="apply a multi-parameter expression macro")
    p.add_argument("macro", choices=macro_names())
    p.add_argument("--project", required=True, help="project JSON path")
    p.add_argument("--track", required=True, help="track name")
    _add_range_args(p)
    p.add_argument("-o", "--output", help="output project JSON (default: in place)")
    p.set_defaults(func=_cmd_apply_macro)

    p = sub.add_parser(
        "paint-phrase",
        help="derive related curves (volume/vibrato/timbre) from one intent line",
    )
    p.add_argument("--project", required=True, help="project JSON path")
    p.add_argument("--track", required=True, help="track name")
    p.add_argument("--source", default="intensity", help="source parameter (default intensity)")
    p.add_argument("-o", "--output", help="output project JSON (default: in place)")
    p.set_defaults(func=_cmd_paint_phrase)

    p = sub.add_parser("export-midi", help="project JSON + profile -> MIDI with CC/keyswitches")
    p.add_argument("--project", required=True, help="project JSON path")
    p.add_argument("--profile", required=True, help="instrument profile JSON path")
    p.add_argument("-o", "--output", required=True, help="output MIDI path")
    p.add_argument(
        "--perform",
        action="store_true",
        help="apply performance rules (phrase detection + velocity shaping)",
    )
    p.set_defaults(func=_cmd_export_midi)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
