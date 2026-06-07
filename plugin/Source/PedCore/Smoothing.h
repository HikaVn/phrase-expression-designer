// PedCore: one-pole low-pass smoother — JUCE-free std C++.
//
// Real-time companion to ped.engine.smoothing.one_pole (Python). Same time-
// constant coefficient: alpha = 1 - exp(-dt/tau). Where the Python helper
// filters a whole sampled array offline, this is a stateful step you call once
// per audio block to smooth a live control value toward its target.
#pragma once

#include <cmath>

namespace ped
{

class OnePole
{
public:
    void reset (double initial = 0.0) noexcept { value_ = initial; }
    double value() const noexcept { return value_; }

    // Advance one step toward target. dtMs is the time since the last call;
    // smoothingMs is the filter time constant (<= 0 means no smoothing -> jump).
    double process (double target, double dtMs, double smoothingMs) noexcept
    {
        if (smoothingMs <= 0.0 || dtMs <= 0.0)
        {
            value_ = target;
            return value_;
        }
        const double alpha = 1.0 - std::exp (-dtMs / smoothingMs);
        value_ += alpha * (target - value_);
        return value_;
    }

private:
    double value_ = 0.0;
};

} // namespace ped
