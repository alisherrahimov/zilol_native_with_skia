/**
 * GestureRecognizer.h — C++ gesture recognition engine.
 *
 * Recognizers: Pan, Pinch, Rotation, Tap.
 * Each recognizer follows a state machine:
 *   Possible → Began → Changed → Ended | Cancelled | Failed
 *
 * Recognizers are updated by the TouchDispatcher with raw touch events.
 * When state transitions occur, they fire JS callbacks via JSI.
 */

#pragma once

#include <jsi/jsi.h>

#include <memory>
#include <string>
#include <cmath>
#include <chrono>
#include <unordered_map>

namespace zilol {
namespace gestures {

// ---------------------------------------------------------------------------
// Gesture state machine
// ---------------------------------------------------------------------------

enum class GestureState : uint8_t {
    Possible,   // Not yet recognized
    Began,      // Recognition started
    Changed,    // Ongoing updates
    Ended,      // Successfully completed
    Cancelled,  // Interrupted
    Failed,     // Did not meet criteria
};

// ---------------------------------------------------------------------------
// Gesture event data (passed to JS callbacks)
// ---------------------------------------------------------------------------

struct GestureEvent {
    float x = 0, y = 0;               // current touch position
    float absoluteX = 0, absoluteY = 0; // absolute screen position
    float translationX = 0, translationY = 0; // pan translation
    float velocityX = 0, velocityY = 0;       // pan velocity
    float scale = 1.0f;               // pinch scale factor
    float rotation = 0;               // rotation in radians
    float focalX = 0, focalY = 0;     // pinch/rotation focal point
    int numberOfPointers = 0;

    /// Convert to a JSI object for callback dispatch.
    facebook::jsi::Object toJSI(facebook::jsi::Runtime &rt) const {
        auto obj = facebook::jsi::Object(rt);
        obj.setProperty(rt, "x", (double)x);
        obj.setProperty(rt, "y", (double)y);
        obj.setProperty(rt, "absoluteX", (double)absoluteX);
        obj.setProperty(rt, "absoluteY", (double)absoluteY);
        obj.setProperty(rt, "translationX", (double)translationX);
        obj.setProperty(rt, "translationY", (double)translationY);
        obj.setProperty(rt, "velocityX", (double)velocityX);
        obj.setProperty(rt, "velocityY", (double)velocityY);
        obj.setProperty(rt, "scale", (double)scale);
        obj.setProperty(rt, "rotation", (double)rotation);
        obj.setProperty(rt, "focalX", (double)focalX);
        obj.setProperty(rt, "focalY", (double)focalY);
        obj.setProperty(rt, "numberOfPointers", numberOfPointers);
        return obj;
    }
};

// ---------------------------------------------------------------------------
// Touch point tracking
// ---------------------------------------------------------------------------

struct TouchPoint {
    int pointerId = 0;
    float x = 0, y = 0;
    float startX = 0, startY = 0;
    double startTimeMs = 0;
    double lastTimeMs = 0;
    bool active = false;
};

// ---------------------------------------------------------------------------
// GestureRecognizer base class
// ---------------------------------------------------------------------------

class GestureRecognizer {
public:
    int gestureId = 0;
    int nodeId = 0;
    GestureState state = GestureState::Possible;

    // JS callbacks
    std::shared_ptr<facebook::jsi::Function> onStart;
    std::shared_ptr<facebook::jsi::Function> onUpdate;
    std::shared_ptr<facebook::jsi::Function> onEnd;

    virtual ~GestureRecognizer() = default;

    /// Called for each touch event on this node.
    virtual void onTouchEvent(int phase, float x, float y, int pointerId,
                              facebook::jsi::Runtime &rt) = 0;

    /// Reset to Possible state.
    virtual void reset() {
        state = GestureState::Possible;
    }

    /// Get the gesture type string.
    virtual std::string type() const = 0;

protected:
    void fireStart(facebook::jsi::Runtime &rt, const GestureEvent &e) {
        if (onStart) {
            try { onStart->call(rt, e.toJSI(rt)); } catch (...) {}
        }
    }
    void fireUpdate(facebook::jsi::Runtime &rt, const GestureEvent &e) {
        if (onUpdate) {
            try { onUpdate->call(rt, e.toJSI(rt)); } catch (...) {}
        }
    }
    void fireEnd(facebook::jsi::Runtime &rt, const GestureEvent &e) {
        if (onEnd) {
            try { onEnd->call(rt, e.toJSI(rt)); } catch (...) {}
        }
    }

    static double nowMs() {
        return std::chrono::duration<double, std::milli>(
            std::chrono::steady_clock::now().time_since_epoch()).count();
    }
};

// ---------------------------------------------------------------------------
// PanRecognizer
// ---------------------------------------------------------------------------

class PanRecognizer : public GestureRecognizer {
public:
    float activationThreshold = 10.0f; // pixels before pan activates

    std::string type() const override { return "pan"; }

    void onTouchEvent(int phase, float x, float y, int pointerId,
                      facebook::jsi::Runtime &rt) override {
        double now = nowMs();

        switch (phase) {
            case 0: { // began
                touch_.pointerId = pointerId;
                touch_.x = x; touch_.y = y;
                touch_.startX = x; touch_.startY = y;
                touch_.startTimeMs = now;
                touch_.lastTimeMs = now;
                touch_.active = true;
                prevX_ = x; prevY_ = y;
                prevTimeMs_ = now;
                state = GestureState::Possible;
                break;
            }
            case 1: { // moved
                if (!touch_.active || touch_.pointerId != pointerId) return;
                touch_.x = x; touch_.y = y;

                float dx = x - touch_.startX;
                float dy = y - touch_.startY;
                float dist = std::sqrt(dx * dx + dy * dy);

                if (state == GestureState::Possible && dist >= activationThreshold) {
                    state = GestureState::Began;
                    GestureEvent e;
                    e.x = x; e.y = y;
                    e.absoluteX = x; e.absoluteY = y;
                    e.translationX = dx; e.translationY = dy;
                    e.numberOfPointers = 1;
                    fireStart(rt, e);
                    state = GestureState::Changed;
                } else if (state == GestureState::Changed) {
                    // Velocity: pixels per second
                    double dt = (now - prevTimeMs_) / 1000.0;
                    float vx = dt > 0 ? (x - prevX_) / (float)dt : 0;
                    float vy = dt > 0 ? (y - prevY_) / (float)dt : 0;

                    GestureEvent e;
                    e.x = x; e.y = y;
                    e.absoluteX = x; e.absoluteY = y;
                    e.translationX = dx; e.translationY = dy;
                    e.velocityX = vx; e.velocityY = vy;
                    e.numberOfPointers = 1;
                    fireUpdate(rt, e);
                }

                prevX_ = x; prevY_ = y;
                prevTimeMs_ = now;
                break;
            }
            case 2: // ended
            case 3: { // cancelled
                if (!touch_.active || touch_.pointerId != pointerId) return;
                touch_.active = false;

                if (state == GestureState::Changed || state == GestureState::Began) {
                    double dt = (now - prevTimeMs_) / 1000.0;
                    float vx = dt > 0 ? (x - prevX_) / (float)dt : 0;
                    float vy = dt > 0 ? (y - prevY_) / (float)dt : 0;

                    GestureEvent e;
                    e.x = x; e.y = y;
                    e.absoluteX = x; e.absoluteY = y;
                    e.translationX = x - touch_.startX;
                    e.translationY = y - touch_.startY;
                    e.velocityX = vx; e.velocityY = vy;
                    e.numberOfPointers = 0;
                    fireEnd(rt, e);
                }
                state = (phase == 2) ? GestureState::Ended : GestureState::Cancelled;
                break;
            }
        }
    }

    void reset() override {
        GestureRecognizer::reset();
        touch_ = {};
        prevX_ = 0; prevY_ = 0;
        prevTimeMs_ = 0;
    }

private:
    TouchPoint touch_;
    float prevX_ = 0, prevY_ = 0;
    double prevTimeMs_ = 0;
};

// ---------------------------------------------------------------------------
// PinchRecognizer (requires 2 touches)
// ---------------------------------------------------------------------------

class PinchRecognizer : public GestureRecognizer {
public:
    std::string type() const override { return "pinch"; }

    void onTouchEvent(int phase, float x, float y, int pointerId,
                      facebook::jsi::Runtime &rt) override {
        switch (phase) {
            case 0: { // began
                if (numActive_ < 2) {
                    auto &t = (numActive_ == 0) ? touch1_ : touch2_;
                    t.pointerId = pointerId;
                    t.x = x; t.y = y;
                    t.startX = x; t.startY = y;
                    t.active = true;
                    numActive_++;
                }
                if (numActive_ == 2) {
                    initialDist_ = distance(touch1_, touch2_);
                    if (initialDist_ < 1.0f) initialDist_ = 1.0f;
                    state = GestureState::Began;

                    GestureEvent e;
                    e.scale = 1.0f;
                    e.focalX = (touch1_.x + touch2_.x) * 0.5f;
                    e.focalY = (touch1_.y + touch2_.y) * 0.5f;
                    e.numberOfPointers = 2;
                    fireStart(rt, e);
                    state = GestureState::Changed;
                }
                break;
            }
            case 1: { // moved
                updateTouch(pointerId, x, y);
                if (state == GestureState::Changed && numActive_ == 2) {
                    float dist = distance(touch1_, touch2_);
                    GestureEvent e;
                    e.scale = dist / initialDist_;
                    e.focalX = (touch1_.x + touch2_.x) * 0.5f;
                    e.focalY = (touch1_.y + touch2_.y) * 0.5f;
                    e.numberOfPointers = 2;
                    fireUpdate(rt, e);
                }
                break;
            }
            case 2: // ended
            case 3: { // cancelled
                if (state == GestureState::Changed && numActive_ == 2) {
                    float dist = distance(touch1_, touch2_);
                    GestureEvent e;
                    e.scale = dist / initialDist_;
                    e.focalX = (touch1_.x + touch2_.x) * 0.5f;
                    e.focalY = (touch1_.y + touch2_.y) * 0.5f;
                    e.numberOfPointers = numActive_ - 1;
                    fireEnd(rt, e);
                    state = GestureState::Ended;
                }
                removeTouch(pointerId);
                break;
            }
        }
    }

    void reset() override {
        GestureRecognizer::reset();
        touch1_ = {}; touch2_ = {};
        numActive_ = 0;
        initialDist_ = 1.0f;
    }

private:
    TouchPoint touch1_, touch2_;
    int numActive_ = 0;
    float initialDist_ = 1.0f;

    void updateTouch(int pid, float x, float y) {
        if (touch1_.active && touch1_.pointerId == pid) { touch1_.x = x; touch1_.y = y; }
        if (touch2_.active && touch2_.pointerId == pid) { touch2_.x = x; touch2_.y = y; }
    }

    void removeTouch(int pid) {
        if (touch1_.active && touch1_.pointerId == pid) { touch1_.active = false; numActive_--; }
        else if (touch2_.active && touch2_.pointerId == pid) { touch2_.active = false; numActive_--; }
    }

    static float distance(const TouchPoint &a, const TouchPoint &b) {
        float dx = a.x - b.x, dy = a.y - b.y;
        return std::sqrt(dx * dx + dy * dy);
    }
};

// ---------------------------------------------------------------------------
// RotationRecognizer (requires 2 touches)
// ---------------------------------------------------------------------------

class RotationRecognizer : public GestureRecognizer {
public:
    std::string type() const override { return "rotation"; }

    void onTouchEvent(int phase, float x, float y, int pointerId,
                      facebook::jsi::Runtime &rt) override {
        switch (phase) {
            case 0: { // began
                if (numActive_ < 2) {
                    auto &t = (numActive_ == 0) ? touch1_ : touch2_;
                    t.pointerId = pointerId;
                    t.x = x; t.y = y;
                    t.active = true;
                    numActive_++;
                }
                if (numActive_ == 2) {
                    initialAngle_ = angle(touch1_, touch2_);
                    state = GestureState::Began;

                    GestureEvent e;
                    e.rotation = 0;
                    e.focalX = (touch1_.x + touch2_.x) * 0.5f;
                    e.focalY = (touch1_.y + touch2_.y) * 0.5f;
                    e.numberOfPointers = 2;
                    fireStart(rt, e);
                    state = GestureState::Changed;
                }
                break;
            }
            case 1: { // moved
                updateTouch(pointerId, x, y);
                if (state == GestureState::Changed && numActive_ == 2) {
                    float currentAngle = angle(touch1_, touch2_);
                    GestureEvent e;
                    e.rotation = currentAngle - initialAngle_;
                    e.focalX = (touch1_.x + touch2_.x) * 0.5f;
                    e.focalY = (touch1_.y + touch2_.y) * 0.5f;
                    e.numberOfPointers = 2;
                    fireUpdate(rt, e);
                }
                break;
            }
            case 2: // ended
            case 3: { // cancelled
                if (state == GestureState::Changed && numActive_ == 2) {
                    float currentAngle = angle(touch1_, touch2_);
                    GestureEvent e;
                    e.rotation = currentAngle - initialAngle_;
                    e.focalX = (touch1_.x + touch2_.x) * 0.5f;
                    e.focalY = (touch1_.y + touch2_.y) * 0.5f;
                    e.numberOfPointers = numActive_ - 1;
                    fireEnd(rt, e);
                    state = GestureState::Ended;
                }
                removeTouch(pointerId);
                break;
            }
        }
    }

    void reset() override {
        GestureRecognizer::reset();
        touch1_ = {}; touch2_ = {};
        numActive_ = 0;
        initialAngle_ = 0;
    }

private:
    TouchPoint touch1_, touch2_;
    int numActive_ = 0;
    float initialAngle_ = 0;

    void updateTouch(int pid, float x, float y) {
        if (touch1_.active && touch1_.pointerId == pid) { touch1_.x = x; touch1_.y = y; }
        if (touch2_.active && touch2_.pointerId == pid) { touch2_.x = x; touch2_.y = y; }
    }

    void removeTouch(int pid) {
        if (touch1_.active && touch1_.pointerId == pid) { touch1_.active = false; numActive_--; }
        else if (touch2_.active && touch2_.pointerId == pid) { touch2_.active = false; numActive_--; }
    }

    static float angle(const TouchPoint &a, const TouchPoint &b) {
        return std::atan2(b.y - a.y, b.x - a.x);
    }
};

// ---------------------------------------------------------------------------
// TapRecognizer
// ---------------------------------------------------------------------------

class TapRecognizer : public GestureRecognizer {
public:
    int requiredTaps = 1;
    float maxDistance = 15.0f;   // max movement allowed during tap
    double maxDurationMs = 300;  // max hold duration per tap
    double maxDelayMs = 300;     // max delay between consecutive taps

    std::string type() const override { return "tap"; }

    void onTouchEvent(int phase, float x, float y, int pointerId,
                      facebook::jsi::Runtime &rt) override {
        double now = nowMs();

        switch (phase) {
            case 0: { // began
                touch_.pointerId = pointerId;
                touch_.x = x; touch_.y = y;
                touch_.startX = x; touch_.startY = y;
                touch_.startTimeMs = now;
                touch_.active = true;

                // Check if too long since last tap — reset count
                if (tapCount_ > 0 && (now - lastTapTimeMs_ > maxDelayMs)) {
                    tapCount_ = 0;
                }
                break;
            }
            case 1: { // moved
                if (!touch_.active || touch_.pointerId != pointerId) return;
                float dx = x - touch_.startX;
                float dy = y - touch_.startY;
                if (std::sqrt(dx * dx + dy * dy) > maxDistance) {
                    // Moved too far — fail
                    touch_.active = false;
                    tapCount_ = 0;
                    state = GestureState::Failed;
                }
                break;
            }
            case 2: { // ended
                if (!touch_.active || touch_.pointerId != pointerId) return;
                touch_.active = false;

                double holdMs = now - touch_.startTimeMs;
                if (holdMs > maxDurationMs) {
                    // Held too long — not a tap
                    tapCount_ = 0;
                    state = GestureState::Failed;
                    return;
                }

                tapCount_++;
                lastTapTimeMs_ = now;

                if (tapCount_ >= requiredTaps) {
                    state = GestureState::Ended;
                    GestureEvent e;
                    e.x = x; e.y = y;
                    e.absoluteX = x; e.absoluteY = y;
                    e.numberOfPointers = 0;
                    fireEnd(rt, e);
                    tapCount_ = 0;
                }
                break;
            }
            case 3: { // cancelled
                touch_.active = false;
                tapCount_ = 0;
                state = GestureState::Cancelled;
                break;
            }
        }
    }

    void reset() override {
        GestureRecognizer::reset();
        touch_ = {};
        tapCount_ = 0;
        lastTapTimeMs_ = 0;
    }

private:
    TouchPoint touch_;
    int tapCount_ = 0;
    double lastTapTimeMs_ = 0;
};

} // namespace gestures
} // namespace zilol
