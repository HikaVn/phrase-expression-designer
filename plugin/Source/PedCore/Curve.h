// PedCore: ExpressionCurve evaluation — a JUCE-free, std-only C++ port of
// ped.core.curve (Python). Kept dependency-free so it can be unit-tested in
// isolation and shared by the AU/VST3 plugin.
//
// Parity target: src/ped/core/curve.py
#pragma once

#include <algorithm>
#include <string>
#include <vector>

namespace ped
{

inline double clip01 (double v) noexcept
{
    if (v < 0.0) return 0.0;
    if (v > 1.0) return 1.0;
    return v;
}

enum class Shape { Linear, Smooth, Hold };

inline Shape shapeFromString (const std::string& s)
{
    if (s == "linear") return Shape::Linear;
    if (s == "hold")   return Shape::Hold;
    return Shape::Smooth; // default, matches Python
}

struct CurvePoint
{
    long   tick  = 0;
    double value = 0.0;
    Shape  shape = Shape::Smooth;
};

inline double smoothstep (double t) noexcept
{
    return t * t * (3.0 - 2.0 * t);
}

// A normalized (0..1) performance-intent curve over ticks. Interpolation between
// two points uses the *left* point's shape; outside the range it holds the end
// values. Output is always clipped to [0,1].
class ExpressionCurve
{
public:
    std::string id;
    std::string parameter;
    std::vector<CurvePoint> points; // assumed sorted by tick (sortPoints() helps)

    void sortPoints()
    {
        std::sort (points.begin(), points.end(),
                   [] (const CurvePoint& a, const CurvePoint& b) { return a.tick < b.tick; });
    }

    double valueAt (long tick) const
    {
        if (points.empty()) return 0.0;
        if (tick <= points.front().tick) return clip01 (points.front().value);
        if (tick >= points.back().tick)  return clip01 (points.back().value);

        for (size_t i = 0; i + 1 < points.size(); ++i)
        {
            const auto& left  = points[i];
            const auto& right = points[i + 1];
            if (left.tick <= tick && tick <= right.tick)
            {
                if (left.shape == Shape::Hold || right.tick == left.tick)
                    return clip01 (left.value);

                double t = double (tick - left.tick) / double (right.tick - left.tick);
                if (left.shape == Shape::Smooth)
                    t = smoothstep (t);
                return clip01 (left.value + (right.value - left.value) * t);
            }
        }
        return clip01 (points.back().value);
    }
};

} // namespace ped
