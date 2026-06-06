import pytest

from ped.profiles.calibration_assistant import build_from_measurements, parse_measurements


def test_inverts_response_endpoints():
    # Quietest CC -> intent 0.0, loudest CC -> intent 1.0.
    curve = build_from_measurements("dyn", {0: -60.0, 64: -28.0, 127: -10.0})
    assert curve.map(0.0) == 0
    assert curve.map(1.0) == 127


def test_perceptually_even_midpoint():
    # Linear-in-level response: half the loudness range -> the middle CC.
    curve = build_from_measurements(
        "dyn", {0: 0.0, 32: 25.0, 64: 50.0, 96: 75.0, 127: 100.0}, interpolation="linear"
    )
    # intent 0.5 == level 50 == cc 64
    assert curve.map(0.5) == 64


def test_nonlinear_response_compensated():
    # A compressed top end: many CC produce similar loud levels. Asking for high
    # intent should push CC high.
    curve = build_from_measurements("dyn", {0: -60.0, 32: -45.0, 64: -35.0, 96: -32.0, 127: -30.0})
    assert curve.map(1.0) == 127
    assert curve.map(0.0) == 0
    # monotonic non-decreasing CC out
    prev = -1
    x = 0.0
    while x <= 1.0001:
        v = curve.map(x)
        assert v >= prev
        prev = v
        x += 0.1


def test_parse_measurements():
    assert parse_measurements("0=-60, 64=-28 ,127=-10") == {0: -60.0, 64: -28.0, 127: -10.0}


def test_errors():
    with pytest.raises(ValueError):
        build_from_measurements("x", {0: -10.0})           # too few
    with pytest.raises(ValueError):
        build_from_measurements("x", {0: -10.0, 64: -10.0})  # no range
    with pytest.raises(ValueError):
        build_from_measurements("x", {0: 0.0, 200: 1.0})   # cc out of range
