import pytest

from ped.core.curve import CurvePoint, ExpressionCurve, clip01


def test_clip01_bounds():
    assert clip01(-0.5) == 0.0
    assert clip01(1.5) == 1.0
    assert clip01(0.3) == 0.3


def test_linear_interpolation_midpoint():
    c = ExpressionCurve("c", "intensity", [
        CurvePoint(0, 0.0, "linear"),
        CurvePoint(100, 1.0, "linear"),
    ])
    assert c.value_at(50) == pytest.approx(0.5)
    assert c.value_at(25) == pytest.approx(0.25)


def test_smooth_is_eased_at_midpoint_and_symmetric():
    c = ExpressionCurve("c", "intensity", [
        CurvePoint(0, 0.0, "smooth"),
        CurvePoint(100, 1.0, "smooth"),
    ])
    # smoothstep(0.5) == 0.5, but slope differs from linear away from center.
    assert c.value_at(50) == pytest.approx(0.5)
    assert c.value_at(25) == pytest.approx(0.15625)  # 3t^2-2t^3 at t=0.25


def test_hold_shape_steps():
    c = ExpressionCurve("c", "intensity", [
        CurvePoint(0, 0.2, "hold"),
        CurvePoint(100, 0.8, "linear"),
    ])
    assert c.value_at(99) == pytest.approx(0.2)
    assert c.value_at(100) == pytest.approx(0.8)


def test_clamps_outside_point_range():
    c = ExpressionCurve("c", "intensity", [
        CurvePoint(10, 0.3, "linear"),
        CurvePoint(20, 0.7, "linear"),
    ])
    assert c.value_at(0) == pytest.approx(0.3)
    assert c.value_at(999) == pytest.approx(0.7)


def test_empty_curve_is_zero():
    assert ExpressionCurve("c", "intensity").value_at(5) == 0.0


def test_value_always_clipped():
    c = ExpressionCurve("c", "intensity", [
        CurvePoint(0, 1.0, "linear"),
        CurvePoint(100, 1.0, "linear"),
    ])
    for _tick, value in c.sample(0, 100, 10):
        assert 0.0 <= value <= 1.0


def test_sample_includes_endpoint():
    c = ExpressionCurve("c", "intensity", [CurvePoint(0, 0.0, "linear"), CurvePoint(100, 1.0, "linear")])
    samples = c.sample(0, 100, 30)
    assert samples[0][0] == 0
    assert samples[-1][0] == 100


def test_invalid_shape_rejected():
    with pytest.raises(ValueError):
        CurvePoint(0, 0.5, "wobble")


def test_roundtrip_dict():
    c = ExpressionCurve("c", "timbre", [CurvePoint(0, 0.1, "smooth"), CurvePoint(50, 0.9, "linear")])
    again = ExpressionCurve.from_dict(c.to_dict())
    assert again.parameter == "timbre"
    assert [p.tick for p in again.points] == [0, 50]
