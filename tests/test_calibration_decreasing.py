from ped.profiles.calibration import CalibrationCurve, CalibrationPoint


def decreasing():
    return CalibrationCurve(
        id="d",
        points=[
            CalibrationPoint(0.0, 120),
            CalibrationPoint(0.5, 60),
            CalibrationPoint(1.0, 5),
        ],
        interpolation="monotonic",
    )


def test_decreasing_is_nonincreasing_and_in_range():
    c = decreasing()
    prev = 128
    x = 0.0
    while x <= 1.0001:
        v = c.map(x)
        assert v <= prev
        assert 0 <= v <= 127
        prev = v
        x += 0.05


def test_decreasing_hits_nodes():
    c = decreasing()
    assert c.map(0.0) == 120
    assert c.map(0.5) == 60
    assert c.map(1.0) == 5
