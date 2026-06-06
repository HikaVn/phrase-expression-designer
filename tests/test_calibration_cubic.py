
from ped.profiles.calibration import CalibrationCurve, CalibrationPoint


def steep():
    # A non-linear shape where cubic and linear differ.
    return [
        CalibrationPoint(0.0, 0),
        CalibrationPoint(0.5, 100),
        CalibrationPoint(1.0, 110),
    ]


def test_monotonic_is_nondecreasing_and_no_overshoot():
    c = CalibrationCurve(id="m", points=steep(), interpolation="monotonic")
    prev = -1
    x = 0.0
    while x <= 1.0001:
        v = c.map(x)
        assert v >= prev, f"decreasing at {x}"
        assert 0 <= v <= 110, f"overshoot {v} at {x}"  # never exceeds node max
        prev = v
        x += 0.02


def test_monotonic_hits_nodes_exactly():
    c = CalibrationCurve(id="m", points=steep(), interpolation="monotonic")
    assert c.map(0.0) == 0
    assert c.map(0.5) == 100
    assert c.map(1.0) == 110


def test_cubic_differs_from_linear_between_nodes():
    pts = steep()
    cubic = CalibrationCurve(id="c", points=pts, interpolation="monotonic")
    linear = CalibrationCurve(id="l", points=pts, interpolation="linear")
    # Somewhere off-node the two interpolations should disagree.
    assert any(cubic.map(x) != linear.map(x) for x in (0.1, 0.25, 0.4, 0.6, 0.8))


def test_linear_unchanged():
    c = CalibrationCurve(
        id="l",
        points=[CalibrationPoint(0.0, 0), CalibrationPoint(1.0, 100)],
        interpolation="linear",
    )
    assert c.map(0.5) == 50


def test_clamped_0_127():
    c = CalibrationCurve(
        id="m",
        points=[CalibrationPoint(0.0, 0), CalibrationPoint(1.0, 127)],
        interpolation="monotonic",
    )
    assert 0 <= c.map(0.999) <= 127
