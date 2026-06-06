// PedCore: CalibrationCurve — JUCE-free std C++ port of ped.profiles.calibration.
// Maps a normalized intent value (0..1) to a MIDI CC value (0..127), via linear
// or Fritsch-Carlson monotone-cubic interpolation.
//
// Parity target: src/ped/profiles/calibration.py
#pragma once

#include <algorithm>
#include <cmath>
#include <string>
#include <vector>

namespace ped
{

enum class Interp { Linear, Monotonic };

inline Interp interpFromString (const std::string& s)
{
    return s == "linear" ? Interp::Linear : Interp::Monotonic;
}

struct CalibrationPoint
{
    double input  = 0.0;
    int    output = 0;
};

class CalibrationCurve
{
public:
    std::string id;
    std::vector<CalibrationPoint> points; // sorted by input (sortPoints())
    int    outMin = 0;
    int    outMax = 127;
    Interp interpolation = Interp::Monotonic;

    void sortPoints()
    {
        std::sort (points.begin(), points.end(),
                   [] (const CalibrationPoint& a, const CalibrationPoint& b) { return a.input < b.input; });
    }

    int map (double value) const
    {
        const int loClamp = std::min (outMin, outMax);
        const int hiClamp = std::max (outMin, outMax);
        double mapped;

        if (points.empty())
        {
            mapped = outMin + (outMax - outMin) * value;
        }
        else if (value <= points.front().input)
        {
            mapped = points.front().output;
        }
        else if (value >= points.back().input)
        {
            mapped = points.back().output;
        }
        else
        {
            std::vector<double> xs, ys;
            xs.reserve (points.size());
            ys.reserve (points.size());
            for (const auto& p : points) { xs.push_back (p.input); ys.push_back (double (p.output)); }

            std::vector<double> tangents;
            if (interpolation == Interp::Monotonic)
                tangents = fritschCarlson (xs, ys);

            mapped = ys.back();
            for (size_t i = 0; i + 1 < xs.size(); ++i)
            {
                if (xs[i] <= value && value <= xs[i + 1])
                {
                    if (! tangents.empty())
                        mapped = hermite (value, xs[i], xs[i + 1], ys[i], ys[i + 1], tangents[i], tangents[i + 1]);
                    else
                    {
                        double span = xs[i + 1] - xs[i];
                        double t = span == 0.0 ? 0.0 : (value - xs[i]) / span;
                        mapped = ys[i] + (ys[i + 1] - ys[i]) * t;
                    }
                    break;
                }
            }
        }

        int result = (int) std::lround (mapped);
        result = std::max (loClamp, std::min (hiClamp, result));
        return std::max (0, std::min (127, result));
    }

private:
    static std::vector<double> fritschCarlson (const std::vector<double>& xs, const std::vector<double>& ys)
    {
        const size_t n = xs.size();
        std::vector<double> m (n, 0.0);
        if (n < 2) return m;

        std::vector<double> d (n - 1);
        for (size_t i = 0; i + 1 < n; ++i)
            d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);

        m[0] = d[0];
        m[n - 1] = d[n - 2];
        for (size_t i = 1; i + 1 < n; ++i)
            m[i] = (d[i - 1] * d[i] <= 0.0) ? 0.0 : (d[i - 1] + d[i]) / 2.0;

        for (size_t i = 0; i + 1 < n; ++i)
        {
            if (d[i] == 0.0) { m[i] = 0.0; m[i + 1] = 0.0; continue; }
            double a = m[i] / d[i];
            double b = m[i + 1] / d[i];
            double s = a * a + b * b;
            if (s > 9.0)
            {
                double tau = 3.0 / std::sqrt (s);
                m[i] = tau * a * d[i];
                m[i + 1] = tau * b * d[i];
            }
        }
        return m;
    }

    static double hermite (double x, double x0, double x1, double y0, double y1, double m0, double m1)
    {
        double h = x1 - x0;
        if (h == 0.0) return y0;
        double t = (x - x0) / h;
        double t2 = t * t, t3 = t2 * t;
        double h00 = 2 * t3 - 3 * t2 + 1;
        double h10 = t3 - 2 * t2 + t;
        double h01 = -2 * t3 + 3 * t2;
        double h11 = t3 - t2;
        return h00 * y0 + h10 * h * m0 + h01 * y1 + h11 * h * m1;
    }
};

} // namespace ped
