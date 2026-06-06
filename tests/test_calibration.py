import pytest

from ped.profiles.calibration import CalibrationCurve, CalibrationPoint


def make_curve():
    return CalibrationCurve(
        id="dyn",
        points=[
            CalibrationPoint(0.0, 8),
            CalibrationPoint(0.25, 35),
            CalibrationPoint(0.5, 68),
            CalibrationPoint(0.75, 96),
            CalibrationPoint(1.0, 120),
        ],
    )


def test_endpoints():
    c = make_curve()
    assert c.map(0.0) == 8
    assert c.map(1.0) == 120


def test_interior_node_exact():
    assert make_curve().map(0.5) == 68


def test_interpolates_between_nodes():
    c = make_curve()
    # halfway between 0.0(8) and 0.25(35) -> ~21.5 -> 22 (input 0.125)
    assert c.map(0.125) == pytest.approx(22, abs=1)


def test_output_clamped_0_127():
    c = CalibrationCurve(id="x", points=[CalibrationPoint(0.0, 0), CalibrationPoint(1.0, 127)])
    assert 0 <= c.map(-5.0) <= 127
    assert 0 <= c.map(5.0) <= 127


def test_monotonic_nondecreasing():
    c = make_curve()
    prev = -1
    x = 0.0
    while x <= 1.0001:
        v = c.map(x)
        assert v >= prev
        prev = v
        x += 0.05


def test_empty_points_fallback_within_output_range():
    c = CalibrationCurve(id="x", points=[], output_range=(0, 127))
    assert c.map(0.0) == 0
    assert c.map(1.0) == 127


def test_roundtrip_dict():
    c = make_curve()
    again = CalibrationCurve.from_dict(c.to_dict())
    assert again.map(0.5) == 68
    assert again.interpolation == "monotonic"


def test_invalid_interpolation_rejected():
    with pytest.raises(ValueError):
        CalibrationCurve(id="x", interpolation="bezier")
