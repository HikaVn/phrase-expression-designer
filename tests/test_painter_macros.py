import pytest

from ped.core.curve import CurvePoint, ExpressionCurve
from ped.engine.macros import build_macro, macro_names
from ped.engine.phrase_painter import DEFAULT_TARGETS, PaintTarget, paint


def source_curve():
    return ExpressionCurve("intensity_1", "intensity", [
        CurvePoint(0, 0.0, "smooth"),
        CurvePoint(1000, 1.0, "smooth"),
    ])


def test_paint_derives_all_targets():
    derived = paint(source_curve())
    params = {c.parameter for c in derived}
    assert params == {t.parameter for t in DEFAULT_TARGETS}


def test_paint_bias_and_gain_applied():
    src = source_curve()
    target = PaintTarget("volume", delay_ticks=0, gain=0.6, bias=0.4)
    out = paint(src, (target,))[0]
    # at the source's value=1.0 point -> clip01(0.4 + 0.6*1.0) = 1.0
    assert out.value_at(1000) == pytest.approx(1.0)
    # at value=0.0 -> 0.4 floor
    assert out.value_at(0) == pytest.approx(0.4)


def test_paint_delay_shifts_in_time():
    src = source_curve()
    target = PaintTarget("vibratoDepth", delay_ticks=200, gain=1.0, bias=0.0)
    out = paint(src, (target,))[0]
    # delayed curve at tick 200 equals source at tick 0 (=0.0); rises later
    assert out.value_at(200) == pytest.approx(0.0, abs=1e-6)
    assert out.points[0].tick == 200


def test_paint_values_clipped():
    src = source_curve()
    target = PaintTarget("timbre", gain=5.0, bias=2.0)
    out = paint(src, (target,))[0]
    assert all(0.0 <= p.value <= 1.0 for p in out.points)


def test_build_macro_multi_parameter():
    curves = build_macro("emotional_swell", "m", 0, 2000)
    params = {c.parameter for c in curves}
    assert "intensity" in params and "vibratoDepth" in params
    for c in curves:
        assert c.points[0].tick == 0
        assert c.points[-1].tick == 2000


def test_all_macros_build():
    for name in macro_names():
        curves = build_macro(name, "m", 0, 1000)
        assert curves
        for c in curves:
            for pt in c.points:
                assert 0.0 <= pt.value <= 1.0


def test_unknown_macro_raises():
    with pytest.raises(ValueError):
        build_macro("nope", "m", 0, 100)
