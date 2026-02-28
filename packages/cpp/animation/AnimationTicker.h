/**
 * AnimationTicker.h — C++ animation frame loop.
 *
 * Owns running animations and ticks them every vsync. Eliminates
 * the JS __skiaRequestFrame loop for property animations.
 *
 * Three built-in drivers:
 *   - Timing: duration + easing interpolation
 *   - Spring: critically-damped spring
 *   - Decay: exponential velocity decay
 *
 * JSI API:
 *   __animateNode(nodeId, prop, driverType, config) → animId
 *   __animateCancel(animId)
 *
 * Writes directly to the C++ SkiaNode props — zero bridge crossings.
 */

#pragma once

#include "skia/SkiaNodeTree.h"
#include "skia/ColorParser.h"

#include <jsi/jsi.h>

#include <cmath>
#include <vector>
#include <unordered_map>
#include <memory>
#include <functional>
#include <string>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace zilol {
namespace animation {

// ---------------------------------------------------------------------------
// Easing functions
// ---------------------------------------------------------------------------

using EasingFn = float (*)(float);

inline float easeLinear(float t) { return t; }

inline float easeInQuad(float t) { return t * t; }
inline float easeOutQuad(float t) { return t * (2 - t); }
inline float easeInOutQuad(float t) {
    return t < 0.5f ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

inline float easeInCubic(float t) { return t * t * t; }
inline float easeOutCubic(float t) { float u = t - 1; return u * u * u + 1; }
inline float easeInOutCubic(float t) {
    return t < 0.5f ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

inline float easeInOut(float t) { return easeInOutCubic(t); }

inline EasingFn easingFromString(const std::string &name) {
    if (name == "linear") return easeLinear;
    if (name == "easeIn") return easeInQuad;
    if (name == "easeOut") return easeOutQuad;
    if (name == "easeInOut" || name == "default") return easeInOut;
    if (name == "easeInCubic") return easeInCubic;
    if (name == "easeOutCubic") return easeOutCubic;
    if (name == "easeInOutCubic") return easeInOutCubic;
    return easeInOut; // default
}

// ---------------------------------------------------------------------------
// Animation driver types
// ---------------------------------------------------------------------------

enum class DriverType : uint8_t {
    Timing, Spring, Decay
};

// ---------------------------------------------------------------------------
// Animation — a single running animation
// ---------------------------------------------------------------------------

struct Animation {
    int id = 0;
    skia::SkiaNode *node = nullptr;
    std::string prop; // which prop to animate

    DriverType driverType = DriverType::Timing;

    // Common state
    float fromValue = 0;
    float toValue = 0;
    float currentValue = 0;
    float startTime = 0;
    bool started = false;
    bool finished = false;

    // Timing driver
    float duration = 300; // ms
    EasingFn easing = easeInOut;

    // Spring driver
    float springTension = 170;
    float springFriction = 26;
    float springVelocity = 0; // px/ms
    float springMass = 1;

    // Decay driver
    float decayVelocity = 0;
    float decayRate = 0.998f;

    // JS completion callback
    std::shared_ptr<facebook::jsi::Function> onFinishCallback;

    // ── Tick ──────────────────────────────────────────────────

    void tick(float timestamp) {
        if (finished) return;

        if (!started) {
            startTime = timestamp;
            started = true;
        }

        float elapsed = timestamp - startTime;
        float dt = elapsed; // total elapsed for timing, per-frame for spring/decay

        switch (driverType) {
            case DriverType::Timing:
                tickTiming(elapsed);
                break;
            case DriverType::Spring:
                tickSpring(std::min(timestamp - (startTime > 0 ? startTime : timestamp), 32.0f));
                break;
            case DriverType::Decay:
                tickDecay(elapsed);
                break;
        }

        // Write to node prop
        applyValue();
    }

private:
    float lastTickTime_ = 0;

    void tickTiming(float elapsed) {
        if (duration <= 0) {
            currentValue = toValue;
            finished = true;
            return;
        }
        float t = std::min(elapsed / duration, 1.0f);
        float progress = easing(t);
        currentValue = fromValue + (toValue - fromValue) * progress;
        if (t >= 1.0f) {
            currentValue = toValue;
            finished = true;
        }
    }

    void tickSpring(float dt) {
        // Critically damped spring
        float dtSec = dt / 1000.0f;
        float displacement = currentValue - toValue;
        float springForce = -springTension * displacement;
        float velPxSec = springVelocity * 1000.0f;
        float dampingForce = -springFriction * velPxSec;
        float accel = (springForce + dampingForce) / springMass;
        velPxSec += accel * dtSec;
        springVelocity = velPxSec / 1000.0f;
        currentValue += springVelocity * dt;

        if (std::abs(currentValue - toValue) < 0.5f &&
            std::abs(springVelocity) < 0.01f)
        {
            currentValue = toValue;
            springVelocity = 0;
            finished = true;
        }
    }

    void tickDecay(float elapsed) {
        float friction = std::pow(decayRate, elapsed);
        currentValue = fromValue + decayVelocity * (1.0f - friction) / (1.0f - decayRate);

        float currentVel = decayVelocity * friction;
        if (std::abs(currentVel) < 0.05f) {
            finished = true;
        }
    }

    void applyValue() {
        if (!node) return;

        // Map prop name to node field
        if (prop == "opacity") {
            node->opacity = currentValue;
        } else if (prop == "scrollX") {
            node->scrollX = currentValue;
        } else if (prop == "scrollY") {
            node->scrollY = currentValue;
        } else if (prop == "borderRadius") {
            node->borderRadii = {currentValue, currentValue, currentValue, currentValue};
        } else if (prop == "borderWidth") {
            node->borderWidth = currentValue;
        } else if (prop == "fontSize") {
            node->fontSize = currentValue;
        } else if (prop == "_rotationAngle") {
            node->rotationAngle = currentValue;
        }
        // Layout props updated via layout.x/y/width/height directly
        else if (prop == "x") {
            node->layout.x = currentValue;
        } else if (prop == "y") {
            node->layout.y = currentValue;
        }

        node->markDirty();
    }
};

// ---------------------------------------------------------------------------
// AnimationTicker — owns all animations, ticked per vsync
// ---------------------------------------------------------------------------

class AnimationTicker {
public:
    /// Create and start a new animation. Returns animation ID.
    int start(Animation anim) {
        anim.id = nextId_++;
        animations_[anim.id] = std::make_unique<Animation>(std::move(anim));
        return anim.id;
    }

    /// Cancel an animation.
    void cancel(int id) {
        auto it = animations_.find(id);
        if (it != animations_.end()) {
            it->second->finished = true;
        }
    }

    /// Tick all active animations. Called from render loop.
    void tickAll(float timestamp, facebook::jsi::Runtime *rt) {
        std::vector<int> finished;

        for (auto &[id, anim] : animations_) {
            if (anim->finished) {
                finished.push_back(id);
                continue;
            }
            anim->tick(timestamp);
            if (anim->finished) {
                finished.push_back(id);
            }
        }

        // Fire completion callbacks and remove finished animations
        for (int id : finished) {
            auto it = animations_.find(id);
            if (it != animations_.end()) {
                auto &anim = it->second;
                if (anim->onFinishCallback && rt) {
                    try {
                        anim->onFinishCallback->call(*rt, facebook::jsi::Value(true));
                    } catch (...) {}
                }
                animations_.erase(it);
            }
        }
    }

    bool hasActive() const {
        return !animations_.empty();
    }

private:
    int nextId_ = 1;
    std::unordered_map<int, std::unique_ptr<Animation>> animations_;
};

// ---------------------------------------------------------------------------
// JSI Registration
// ---------------------------------------------------------------------------

inline void registerAnimationHostFunctions(
    facebook::jsi::Runtime &rt,
    AnimationTicker *ticker,
    skia::SkiaNodeTree *tree)
{
    using namespace facebook;

    // __animateNode(nodeId, prop, driverType, config) → animId
    // driverType: "timing" | "spring" | "decay"
    // config: { toValue, duration?, easing?, tension?, friction?, velocity?, rate? }
    rt.global().setProperty(rt, "__animateNode",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__animateNode"), 4,
            [ticker, tree](jsi::Runtime &rt, const jsi::Value &,
                           const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 4) return jsi::Value(-1);

                int nodeId = static_cast<int>(args[0].asNumber());
                auto prop = args[1].asString(rt).utf8(rt);
                auto driverStr = args[2].asString(rt).utf8(rt);
                auto config = args[3].asObject(rt);

                auto *node = tree->getNode(nodeId);
                if (!node) return jsi::Value(-1);

                Animation anim;
                anim.node = node;
                anim.prop = prop;

                // Read current value as fromValue
                if (prop == "opacity") anim.fromValue = node->opacity;
                else if (prop == "scrollX") anim.fromValue = node->scrollX;
                else if (prop == "scrollY") anim.fromValue = node->scrollY;
                else if (prop == "borderRadius") anim.fromValue = node->borderRadii.topLeft;
                else if (prop == "borderWidth") anim.fromValue = node->borderWidth;
                else if (prop == "fontSize") anim.fromValue = node->fontSize;
                else if (prop == "_rotationAngle") anim.fromValue = node->rotationAngle;
                else if (prop == "x") anim.fromValue = node->layout.x;
                else if (prop == "y") anim.fromValue = node->layout.y;

                anim.currentValue = anim.fromValue;

                // toValue
                if (config.hasProperty(rt, "toValue")) {
                    anim.toValue = static_cast<float>(
                        config.getProperty(rt, "toValue").asNumber());
                }

                // Driver config
                if (driverStr == "timing") {
                    anim.driverType = DriverType::Timing;
                    if (config.hasProperty(rt, "duration")) {
                        anim.duration = static_cast<float>(
                            config.getProperty(rt, "duration").asNumber());
                    }
                    if (config.hasProperty(rt, "easing")) {
                        auto easingName = config.getProperty(rt, "easing")
                                              .asString(rt).utf8(rt);
                        anim.easing = easingFromString(easingName);
                    }
                } else if (driverStr == "spring") {
                    anim.driverType = DriverType::Spring;
                    if (config.hasProperty(rt, "tension")) {
                        anim.springTension = static_cast<float>(
                            config.getProperty(rt, "tension").asNumber());
                    }
                    if (config.hasProperty(rt, "friction")) {
                        anim.springFriction = static_cast<float>(
                            config.getProperty(rt, "friction").asNumber());
                    }
                    if (config.hasProperty(rt, "velocity")) {
                        anim.springVelocity = static_cast<float>(
                            config.getProperty(rt, "velocity").asNumber());
                    }
                    if (config.hasProperty(rt, "mass")) {
                        anim.springMass = static_cast<float>(
                            config.getProperty(rt, "mass").asNumber());
                    }
                } else if (driverStr == "decay") {
                    anim.driverType = DriverType::Decay;
                    if (config.hasProperty(rt, "velocity")) {
                        anim.decayVelocity = static_cast<float>(
                            config.getProperty(rt, "velocity").asNumber());
                    }
                    if (config.hasProperty(rt, "rate")) {
                        anim.decayRate = static_cast<float>(
                            config.getProperty(rt, "rate").asNumber());
                    }
                }

                // onFinish callback
                if (config.hasProperty(rt, "onFinish")) {
                    auto cbVal = config.getProperty(rt, "onFinish");
                    if (cbVal.isObject() && cbVal.asObject(rt).isFunction(rt)) {
                        anim.onFinishCallback = std::make_shared<jsi::Function>(
                            cbVal.asObject(rt).asFunction(rt));
                    }
                }

                int animId = ticker->start(std::move(anim));
                return jsi::Value(animId);
            }));

    // __animateCancel(animId)
    rt.global().setProperty(rt, "__animateCancel",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__animateCancel"), 1,
            [ticker](jsi::Runtime &, const jsi::Value &,
                     const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 1) return jsi::Value::undefined();
                int id = static_cast<int>(args[0].asNumber());
                ticker->cancel(id);
                return jsi::Value::undefined();
            }));
}

} // namespace animation
} // namespace zilol
