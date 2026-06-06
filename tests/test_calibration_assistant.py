import pytest

from ped.profiles.calibration_assistant import (
    DYNAMIC_LEVELS,
    build_from_dynamics,
    dynamic_position,
    parse_levels,
)


def test_dynamic_positions_span_0_1():
    assert dynamic_position("ppp") == 0.0
    assert dynamic_position("fff") == 1.0
    assert 0.0 < dynamic_position("mf") < 1.0


def test_build_curve_from_full_table():
    table = {lvl: int(8 + i * 16) for i, lvl in enumerate(DYNAMIC_LEVELS)}
    curve = build_from_dynamics("dyn", table)
    assert curve.map(0.0) == table["ppp"]
    assert curve.map(1.0) == table["fff"]
    # monotonic non-decreasing across the range
    prev = -1
    x = 0.0
    while x <= 1.0001:
        v = curve.map(x)
        assert v >= prev
        prev = v
        x += 0.05


def test_partial_table_places_levels():
    curve = build_from_dynamics("dyn", {"p": 30, "mf": 70, "ff": 110})
    assert curve.map(dynamic_position("mf")) == 70


def test_parse_levels():
    assert parse_levels("ppp=8, p=35 ,mf=68") == {"ppp": 8, "p": 35, "mf": 68}


def test_rejects_out_of_range_and_empty():
    with pytest.raises(ValueError):
        build_from_dynamics("x", {"p": 200})
    with pytest.raises(ValueError):
        build_from_dynamics("x", {})
    with pytest.raises(ValueError):
        dynamic_position("xyz")
