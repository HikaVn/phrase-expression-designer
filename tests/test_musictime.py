import pytest

from ped.core.musictime import (
    TimeSignature,
    bar_start_tick,
    parse_position,
    position_to_tick,
    tick_to_position,
)

PPQ = 480


def test_parse_position_forms():
    assert parse_position("3") == (3, 1, 0)
    assert parse_position("3:2") == (3, 2, 0)
    assert parse_position("3:2:120") == (3, 2, 120)


def test_default_44_bar_and_beat():
    assert position_to_tick("1:1", PPQ) == 0
    assert position_to_tick("1:2", PPQ) == 480           # beat 2
    assert position_to_tick("2:1", PPQ) == 4 * 480       # bar 2 downbeat
    assert position_to_tick("3:1", PPQ) == 8 * 480


def test_position_with_tick_offset():
    assert position_to_tick("2:1:120", PPQ) == 4 * 480 + 120


def test_roundtrip_default():
    for text in ("1:1", "1:3", "2:2", "5:4:240"):
        tick = position_to_tick(text, PPQ)
        bar, beat, off = tick_to_position(tick, PPQ)
        assert position_to_tick(f"{bar}:{beat}:{off}", PPQ) == tick


def test_time_signature_change_3_4():
    # 3/4 from bar 1: bar is 3 beats = 3*480.
    ts = [TimeSignature(1, 3, 4)]
    assert position_to_tick("2:1", PPQ, ts) == 3 * 480
    assert position_to_tick("3:1", PPQ, ts) == 6 * 480


def test_mixed_meter_map():
    # Bars 1-2 in 4/4, bar 3+ in 3/4.
    ts = [TimeSignature(1, 4, 4), TimeSignature(3, 3, 4)]
    assert bar_start_tick(3, PPQ, ts) == 2 * (4 * 480)         # two 4/4 bars
    assert bar_start_tick(4, PPQ, ts) == 2 * (4 * 480) + 3 * 480  # + one 3/4 bar


def test_denominator_eighth():
    # 6/8: beat = eighth = ppq/2; six beats per bar.
    ts = [TimeSignature(1, 6, 8)]
    assert position_to_tick("1:2", PPQ, ts) == PPQ // 2
    assert position_to_tick("2:1", PPQ, ts) == 6 * (PPQ // 2)


def test_bad_position_raises():
    with pytest.raises(ValueError):
        parse_position("0:1")
    with pytest.raises(ValueError):
        parse_position("1:2:3:4")
