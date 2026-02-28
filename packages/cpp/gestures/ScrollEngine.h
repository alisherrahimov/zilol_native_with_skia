/**
 * ScrollEngine.h — C++ scroll physics engine.
 *
 * Replaces the entire TS scroll pipeline:
 *   - ScrollPhysics.ts (deceleration, rubber-band, spring, snap)
 *   - VelocityTracker.ts (rolling-window velocity estimation)
 *   - ScrollController.ts (touch lifecycle, animation loop)
 *
 * Scroll runs entirely in C++ during vsync — JS only receives
 * an onScroll/onScrollEnd callback when the offset changes.
 *
 * Controlled via JSI:
 *   __scrollCreate(nodeId)          → scrollEngineId
 *   __scrollTouch(id, phase, x, y, timestamp, pointerId)
 *   __scrollTo(id, x, y, animated)
 *   __scrollUpdateBounds(id, vpW, vpH, contentW, contentH)
 *   __scrollSetConfig(id, key, value)
 *
 * Ticked by the render loop calling ScrollEngine::tick(timestamp).
 */

#pragma once

#include "skia/SkiaNodeTree.h"

#include <jsi/jsi.h>

#include <cmath>
#include <vector>
#include <unordered_map>
#include <memory>
#include <algorithm>
#include <functional>
#include <cstdio>

namespace zilol {
namespace gestures {

// ---------------------------------------------------------------------------
// Constants (matching iOS UIScrollView behavior)
// ---------------------------------------------------------------------------

// Deceleration rate per millisecond — iOS uses 0.998 per 1ms tick
// At 60fps (16.67ms), friction = 0.998^16.67 ≈ 0.967 (3.3% drop per frame)
// At 120fps (8.33ms), friction = 0.998^8.33 ≈ 0.983 (1.7% drop per frame)
static constexpr float DECELERATION_RATE_NORMAL = 0.998f; // per ms
static constexpr float DECELERATION_RATE_FAST = 0.990f;   // per ms

// Velocity below which deceleration stops (px/sec)
static constexpr float VELOCITY_THRESHOLD = 20.0f;

// Rubber-band overscroll
static constexpr float RUBBER_BAND_COEFF = 0.55f;

// Bounce-back spring — analytical critically-damped (NEVER diverges)
static constexpr float SPRING_OMEGA = 20.0f; // natural frequency (rad/sec) — higher = snappier
static constexpr float SPRING_SETTLE_THRESHOLD = 0.5f;
static constexpr float SPRING_VELOCITY_THRESHOLD = 20.0f; // px/sec

// Velocity tracking
static constexpr float HISTORY_WINDOW_MS = 150.0f;
static constexpr int MAX_SAMPLES = 20;
static constexpr int MIN_SAMPLES = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

inline float clampf(float v, float lo, float hi) {
    return v < lo ? lo : (v > hi ? hi : v);
}

// ---------------------------------------------------------------------------
// VelocityTracker — weighted rolling window, output in px/sec
// ---------------------------------------------------------------------------

struct VelSample {
    double timestamp; // ms — must be double to preserve Date.now() precision
    float position;   // px
};

class VelocityTracker {
public:
    void addPoint(double timestamp, float position) {
        if (timestamp <= lastTs_ && !samples_.empty()) return;
        lastTs_ = timestamp;
        samples_.push_back({timestamp, position});
        if ((int)samples_.size() > MAX_SAMPLES) {
            samples_.erase(samples_.begin());
        }
    }

    /// Returns velocity in px/sec (positive = increasing position)
    float getVelocity() {
        pruneOld();
        int n = (int)samples_.size();
        if (n < MIN_SAMPLES) return 0;

        auto &newest = samples_[n - 1];
        double sumW = 0, sumWV = 0;

        for (int i = 1; i < n; i++) {
            double dt = samples_[i].timestamp - samples_[i - 1].timestamp;
            if (dt <= 0.5) continue; // skip duplicate timestamps
            double vel = (samples_[i].position - samples_[i - 1].position) / dt; // px/ms
            double age = newest.timestamp - samples_[i].timestamp;
            double weight = std::max(0.0, 1.0 - age / (double)HISTORY_WINDOW_MS);
            weight *= weight; // quadratic falloff — recent samples matter more
            sumW += weight;
            sumWV += vel * weight;
        }
        // Convert px/ms → px/sec
        return sumW > 0 ? (float)((sumWV / sumW) * 1000.0) : 0;
    }

    void reset() {
        samples_.clear();
        lastTs_ = 0.0;
    }

private:
    std::vector<VelSample> samples_;
    double lastTs_ = 0.0;

    void pruneOld() {
        if (samples_.empty()) return;
        double cutoff = samples_.back().timestamp - (double)HISTORY_WINDOW_MS;
        while (!samples_.empty() && samples_[0].timestamp < cutoff) {
            samples_.erase(samples_.begin());
        }
    }
};

// ---------------------------------------------------------------------------
// ScrollPhysics — pure stateless math
// All velocities in px/sec, times in ms
// ---------------------------------------------------------------------------

struct PhysicsResult {
    float offset;
    float velocity; // px/sec
    bool finished;
};

/// Exponential deceleration matching iOS UIScrollView.
/// rate = deceleration per ms (e.g. 0.998)
inline PhysicsResult decelerationStep(
    float offset, float velocity, float dtMs,
    float rate, float minOff, float maxOff)
{
    // friction = rate^dt (per-ms exponential decay)
    float friction = std::pow(rate, dtMs);
    float nextVel = velocity * friction;

    // Displacement = integral of velocity over dt
    // v(t) = v0 * rate^t
    // x(t) = v0 * (rate^t - 1) / ln(rate)
    float lnRate = std::log(rate);
    float displacement = (lnRate != 0)
        ? velocity * (friction - 1.0f) / (lnRate * 1000.0f)
        : velocity * dtMs / 1000.0f;

    float nextOff = offset + displacement;

    if (std::abs(nextVel) < VELOCITY_THRESHOLD) {
        nextOff = clampf(nextOff, minOff, maxOff);
        return {nextOff, 0, true};
    }
    if (nextOff < minOff || nextOff > maxOff) {
        // Overshoot boundary — transition to bounce
        return {nextOff, nextVel, true};
    }
    return {nextOff, nextVel, false};
}

/// Analytical critically-damped spring for bounce-back and snap.
/// Uses exact solution: x(t) = (C1 + C2*t) * exp(-ω*t) + target
/// This NEVER diverges regardless of timestep.
inline PhysicsResult springStep(
    float offset, float velocity, float target, float dtMs,
    float omega = SPRING_OMEGA)
{
    float dtSec = dtMs / 1000.0f;

    float displacement = offset - target;     // C1
    float C2 = velocity + omega * displacement; // from v(0) = C2 - ω*C1

    float decay = std::exp(-omega * dtSec);

    float nextOff = (displacement + C2 * dtSec) * decay + target;
    float nextVel = (C2 - omega * (displacement + C2 * dtSec)) * decay;

    if (std::abs(nextOff - target) < SPRING_SETTLE_THRESHOLD &&
        std::abs(nextVel) < SPRING_VELOCITY_THRESHOLD)
    {
        return {target, 0, true};
    }
    return {nextOff, nextVel, false};
}

/// iOS-style rubber-band formula.
/// Returns the dampened delta for overscroll resistance.
inline float rubberBandClamp(float delta, float overscroll, float viewportSize) {
    if (viewportSize <= 0) return 0;
    float c = RUBBER_BAND_COEFF;
    float absOver = std::abs(overscroll);
    // iOS formula: dampened = delta * c / (1 + absOver * c / viewportSize)
    return delta * c / (1.0f + absOver * c / viewportSize);
}

inline float findSnapTarget(
    float offset, float velocity, float interval,
    float minOff, float maxOff, float rate = DECELERATION_RATE_NORMAL)
{
    if (interval <= 0) return clampf(offset, minOff, maxOff);
    // Project final resting position using deceleration
    float lnRate = std::log(rate);
    float proj = (lnRate != 0 && std::abs(velocity) > VELOCITY_THRESHOLD)
        ? offset + velocity / (-lnRate * 1000.0f)
        : offset;
    float snapped = std::round(proj / interval) * interval;
    return clampf(snapped, minOff, maxOff);
}

inline float findPageTarget(
    float offset, float velocity, float viewportSize,
    float minOff, float maxOff)
{
    if (viewportSize <= 0) return clampf(offset, minOff, maxOff);
    float currentPage = std::round(offset / viewportSize);
    float targetPage = currentPage;
    if (velocity > 300.0f) targetPage = currentPage + 1;
    else if (velocity < -300.0f) targetPage = currentPage - 1;
    float maxPage = std::ceil(maxOff / viewportSize);
    targetPage = clampf(targetPage, 0, maxPage);
    return clampf(targetPage * viewportSize, minOff, maxOff);
}

// ---------------------------------------------------------------------------
// ScrollEngine — per-node scroll controller
// ---------------------------------------------------------------------------

enum class ScrollPhase : uint8_t {
    Idle, Dragging, Decelerating, Bouncing, Snapping
};

class ScrollEngine {
public:
    int id = 0;
    skia::SkiaNode *node = nullptr;

    // Config
    bool horizontal = false;
    bool bounces = true;
    bool scrollEnabled = true;
    bool pagingEnabled = false;
    float snapInterval = 0;
    float decelerationRate = DECELERATION_RATE_NORMAL;

    // JS callbacks (set from JS via config)
    // These are invoked via the runtime's microtask queue
    std::function<void(float, float)> onScrollCallback;
    std::function<void(float, float)> onScrollEndCallback;
    std::function<void()> onScrollBeginDragCallback;
    std::function<void()> onScrollEndDragCallback;

    // State
    ScrollPhase phase = ScrollPhase::Idle;
    float offsetX = 0, offsetY = 0;
    float velocityX = 0, velocityY = 0;
    float snapTargetX = 0, snapTargetY = 0;
    double lastTimestamp = 0;

    // Bounds
    float viewportW = 0, viewportH = 0;
    float contentW = 0, contentH = 0;

    // Touch tracking
    VelocityTracker trackerX, trackerY;
    float lastTouchX = 0, lastTouchY = 0;
    int activePointerId = -1;

    // ── Touch API ─────────────────────────────────────────────

    bool onTouchBegan(int pointerId, float x, float y, double timestamp) {
        if (!scrollEnabled) return false;
        cancelAnimation();

        phase = ScrollPhase::Dragging;
        activePointerId = pointerId;
        lastTouchX = x;
        lastTouchY = y;

        trackerX.reset();
        trackerY.reset();
        trackerX.addPoint(timestamp, x);
        trackerY.addPoint(timestamp, y);

        updateBoundsFromNode();

        if (onScrollBeginDragCallback) onScrollBeginDragCallback();
        return true;
    }

    void onTouchMoved(int pointerId, float x, float y, double timestamp) {
        if (phase != ScrollPhase::Dragging) return;
        if (pointerId != activePointerId) return;

        trackerX.addPoint(timestamp, x);
        trackerY.addPoint(timestamp, y);

        float dx = x - lastTouchX;
        float dy = y - lastTouchY;
        lastTouchX = x;
        lastTouchY = y;

        float maxX = maxScrollX(), maxY = maxScrollY();

        if (horizontal) {
            offsetX = applyDelta(offsetX, -dx, 0, maxX, viewportW);
        } else {
            offsetY = applyDelta(offsetY, -dy, 0, maxY, viewportH);
        }
        commitOffset();
    }

    void onTouchEnded(int pointerId, double /*timestamp*/) {
        if (phase != ScrollPhase::Dragging) return;
        if (pointerId != activePointerId) return;
        activePointerId = -1;

        if (onScrollEndDragCallback) onScrollEndDragCallback();

        velocityX = -trackerX.getVelocity();
        velocityY = -trackerY.getVelocity();

        float maxX = maxScrollX(), maxY = maxScrollY();

        if (horizontal && isOverscrolled(offsetX, 0, maxX)) {
            startBounce(); return;
        }
        if (!horizontal && isOverscrolled(offsetY, 0, maxY)) {
            startBounce(); return;
        }
        if (pagingEnabled) { startSnap(true); return; }
        if (snapInterval > 0) { startSnap(false); return; }
        startDeceleration();
    }

    void onTouchCancelled(int pointerId) {
        if (pointerId != activePointerId) return;
        activePointerId = -1;
        float maxX = maxScrollX(), maxY = maxScrollY();
        if ((horizontal && isOverscrolled(offsetX, 0, maxX)) ||
            (!horizontal && isOverscrolled(offsetY, 0, maxY))) {
            startBounce();
        } else {
            phase = ScrollPhase::Idle;
        }
    }

    // ── Programmatic scroll ───────────────────────────────────

    void scrollTo(float x, float y, bool animated) {
        cancelAnimation();
        updateBoundsFromNode();
        float tx = clampf(x, 0, maxScrollX());
        float ty = clampf(y, 0, maxScrollY());

        if (!animated) {
            offsetX = tx; offsetY = ty;
            commitOffset();
            fireScrollEnd();
            return;
        }
        snapTargetX = tx; snapTargetY = ty;
        velocityX = 0; velocityY = 0;
        phase = ScrollPhase::Snapping;
        lastTimestamp = 0;
    }

    // ── Frame tick (called from render loop) ──────────────────

    bool needsTick() const {
        return phase != ScrollPhase::Idle && phase != ScrollPhase::Dragging;
    }

    void tick(double timestamp) {
        if (!needsTick()) return;

        float dt = lastTimestamp > 0
            ? (float)std::min(timestamp - lastTimestamp, 32.0)
            : 16.67f;
        lastTimestamp = timestamp;

        float maxX = maxScrollX(), maxY = maxScrollY();
        bool finished = false;

        switch (phase) {
            case ScrollPhase::Decelerating:
                finished = stepDeceleration(dt, maxX, maxY);
                break;
            case ScrollPhase::Bouncing:
                finished = stepBounce(dt, maxX, maxY);
                break;
            case ScrollPhase::Snapping:
                finished = stepSnap(dt);
                break;
            default:
                return;
        }

        commitOffset();

        if (finished) {
            phase = ScrollPhase::Idle;
            lastTimestamp = 0;
            fireScrollEnd();
        }
    }

    void cancelAnimation() {
        phase = ScrollPhase::Idle;
        lastTimestamp = 0;
    }

    void updateBounds(float vpW, float vpH, float cW, float cH) {
        viewportW = vpW; viewportH = vpH;
        contentW = cW; contentH = cH;
    }

private:
    // ── Physics steps ─────────────────────────────────────────

    void startDeceleration() {
        float vel = horizontal ? velocityX : velocityY;
        if (std::abs(vel) < VELOCITY_THRESHOLD) {
            phase = ScrollPhase::Idle;
            fireScrollEnd();
            return;
        }
        phase = ScrollPhase::Decelerating;
        lastTimestamp = 0;
    }

    bool stepDeceleration(float dt, float maxX, float maxY) {
        if (horizontal) {
            auto s = decelerationStep(offsetX, velocityX, dt, decelerationRate, 0, maxX);
            offsetX = s.offset; velocityX = s.velocity;
            if (s.finished) {
                if (isOverscrolled(offsetX, 0, maxX)) { startBounce(); return false; }
                if (snapInterval > 0) { startSnap(false); return false; }
                return true;
            }
        } else {
            auto s = decelerationStep(offsetY, velocityY, dt, decelerationRate, 0, maxY);
            offsetY = s.offset; velocityY = s.velocity;
            if (s.finished) {
                if (isOverscrolled(offsetY, 0, maxY)) { startBounce(); return false; }
                if (snapInterval > 0) { startSnap(false); return false; }
                return true;
            }
        }
        return false;
    }

    void startBounce() {
        phase = ScrollPhase::Bouncing;
        lastTimestamp = 0;
    }

    bool stepBounce(float dt, float maxX, float maxY) {
        if (horizontal) {
            float target = clampf(offsetX, 0, maxX);
            auto s = springStep(offsetX, velocityX, target, dt);
            offsetX = s.offset; velocityX = s.velocity;
            return s.finished;
        } else {
            float target = clampf(offsetY, 0, maxY);
            auto s = springStep(offsetY, velocityY, target, dt);
            offsetY = s.offset; velocityY = s.velocity;
            return s.finished;
        }
    }

    void startSnap(bool isPaging) {
        float maxX = maxScrollX(), maxY = maxScrollY();
        if (horizontal) {
            snapTargetX = isPaging
                ? findPageTarget(offsetX, velocityX, viewportW, 0, maxX)
                : findSnapTarget(offsetX, velocityX, snapInterval, 0, maxX, decelerationRate);
            snapTargetY = offsetY;
        } else {
            snapTargetY = isPaging
                ? findPageTarget(offsetY, velocityY, viewportH, 0, maxY)
                : findSnapTarget(offsetY, velocityY, snapInterval, 0, maxY, decelerationRate);
            snapTargetX = offsetX;
        }
        phase = ScrollPhase::Snapping;
        lastTimestamp = 0;
    }

    bool stepSnap(float dt) {
        auto sx = springStep(offsetX, velocityX, snapTargetX, dt);
        auto sy = springStep(offsetY, velocityY, snapTargetY, dt);
        offsetX = sx.offset; velocityX = sx.velocity;
        offsetY = sy.offset; velocityY = sy.velocity;
        return sx.finished && sy.finished;
    }

    // ── Helpers ───────────────────────────────────────────────

    float applyDelta(float offset, float delta, float minOff, float maxOff, float vpSize) {
        if (!bounces) return clampf(offset + delta, minOff, maxOff);

        if (offset >= minOff && offset <= maxOff) {
            float next = offset + delta;
            if (next < minOff) {
                float inBounds = minOff - offset;
                return minOff + rubberBandClamp(delta - inBounds, 0, vpSize);
            }
            if (next > maxOff) {
                float inBounds = maxOff - offset;
                return maxOff + rubberBandClamp(delta - inBounds, 0, vpSize);
            }
            return next;
        }
        float over = offset < minOff ? minOff - offset : offset - maxOff;
        return offset + rubberBandClamp(delta, over, vpSize);
    }

    void commitOffset() {
        if (node) {
            node->scrollX = offsetX;
            node->scrollY = offsetY;
            node->markDirty();
        }
        if (onScrollCallback) onScrollCallback(offsetX, offsetY);
    }

    void fireScrollEnd() {
        if (onScrollEndCallback) onScrollEndCallback(offsetX, offsetY);
    }

    bool isOverscrolled(float offset, float min, float max) {
        return offset < min || offset > max;
    }

    float maxScrollX() { return std::max(0.0f, contentW - viewportW); }
    float maxScrollY() { return std::max(0.0f, contentH - viewportH); }

    void updateBoundsFromNode() {
        if (!node) return;
        viewportW = node->layout.width;
        viewportH = node->layout.height;

        float maxR = 0, maxB = 0;
        for (auto *child : node->children) {
            float r = child->layout.x + child->layout.width;
            float b = child->layout.y + child->layout.height;
            if (r > maxR) maxR = r;
            if (b > maxB) maxB = b;
        }
        contentW = maxR;
        contentH = maxB;
    }
};

// ---------------------------------------------------------------------------
// ScrollEngineManager — owns all engines, provides JSI API
// ---------------------------------------------------------------------------

class ScrollEngineManager {
public:

    ScrollEngine *create(skia::SkiaNode *node) {
        int id = nextId_++;
        auto engine = std::make_unique<ScrollEngine>();
        engine->id = id;
        engine->node = node;
        engine->horizontal = node->horizontal;
        engine->bounces = true;
        engine->scrollEnabled = node->scrollEnabled;
        auto *ptr = engine.get();
        engines_[id] = std::move(engine);
        return ptr;
    }

    ScrollEngine *get(int id) {
        auto it = engines_.find(id);
        return it != engines_.end() ? it->second.get() : nullptr;
    }

    void remove(int id) {
        engines_.erase(id);
    }

    /// Tick all active engines. Called from the render loop.
    void tickAll(double timestamp) {
        for (auto &[id, engine] : engines_) {
            if (engine->needsTick()) {
                engine->tick(timestamp);
            }
        }
    }

    bool hasActiveEngines() const {
        for (auto &[id, engine] : engines_) {
            if (engine->needsTick() || engine->phase == ScrollPhase::Dragging) return true;
        }
        return false;
    }

    /// Find engine by its bound node pointer.
    ScrollEngine *findByNode(skia::SkiaNode *node) {
        for (auto &[id, engine] : engines_) {
            if (engine->node == node) return engine.get();
        }
        return nullptr;
    }

private:
    int nextId_ = 1;
    std::unordered_map<int, std::unique_ptr<ScrollEngine>> engines_;
};

// ---------------------------------------------------------------------------
// JSI Registration
// ---------------------------------------------------------------------------

inline void registerScrollEngineHostFunctions(
    facebook::jsi::Runtime &rt,
    ScrollEngineManager *mgr,
    skia::SkiaNodeTree *tree)
{
    using namespace facebook;

    // __scrollCreate(nodeId) → scrollEngineId
    rt.global().setProperty(rt, "__scrollCreate",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__scrollCreate"), 1,
            [mgr, tree](jsi::Runtime &, const jsi::Value &,
                        const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 1) return jsi::Value::undefined();
                int nodeId = static_cast<int>(args[0].asNumber());
                auto *node = tree->getNode(nodeId);
                if (!node) return jsi::Value::undefined();
                auto *engine = mgr->create(node);
                return jsi::Value(engine->id);
            }));

    // __scrollTouch(engineId, phase, x, y, timestamp, pointerId)
    // phase: 0=began, 1=moved, 2=ended, 3=cancelled
    rt.global().setProperty(rt, "__scrollTouch",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__scrollTouch"), 6,
            [mgr](jsi::Runtime &, const jsi::Value &,
                  const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 6) return jsi::Value::undefined();
                int engineId = static_cast<int>(args[0].asNumber());
                int touchPhase = static_cast<int>(args[1].asNumber());
                float x = static_cast<float>(args[2].asNumber());
                float y = static_cast<float>(args[3].asNumber());
                double ts = args[4].asNumber();
                int pid = static_cast<int>(args[5].asNumber());

                auto *engine = mgr->get(engineId);
                if (!engine) return jsi::Value(false);

                switch (touchPhase) {
                    case 0: return jsi::Value(engine->onTouchBegan(pid, x, y, ts));
                    case 1: engine->onTouchMoved(pid, x, y, ts); break;
                    case 2: engine->onTouchEnded(pid, ts); break;
                    case 3: engine->onTouchCancelled(pid); break;
                }
                return jsi::Value::undefined();
            }));

    // __scrollTo(engineId, x, y, animated)
    rt.global().setProperty(rt, "__scrollTo",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__scrollTo"), 4,
            [mgr](jsi::Runtime &, const jsi::Value &,
                  const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 4) return jsi::Value::undefined();
                int id = static_cast<int>(args[0].asNumber());
                float x = static_cast<float>(args[1].asNumber());
                float y = static_cast<float>(args[2].asNumber());
                bool animated = args[3].getBool();
                auto *engine = mgr->get(id);
                if (engine) engine->scrollTo(x, y, animated);
                return jsi::Value::undefined();
            }));

    // __scrollUpdateBounds(engineId, vpW, vpH, contentW, contentH)
    rt.global().setProperty(rt, "__scrollUpdateBounds",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__scrollUpdateBounds"), 5,
            [mgr](jsi::Runtime &, const jsi::Value &,
                  const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 5) return jsi::Value::undefined();
                int id = static_cast<int>(args[0].asNumber());
                float vpW = static_cast<float>(args[1].asNumber());
                float vpH = static_cast<float>(args[2].asNumber());
                float cW = static_cast<float>(args[3].asNumber());
                float cH = static_cast<float>(args[4].asNumber());
                auto *engine = mgr->get(id);
                if (engine) engine->updateBounds(vpW, vpH, cW, cH);
                return jsi::Value::undefined();
            }));

    // __scrollSetConfig(engineId, key, value)
    rt.global().setProperty(rt, "__scrollSetConfig",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__scrollSetConfig"), 3,
            [mgr](jsi::Runtime &rt, const jsi::Value &,
                  const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 3) return jsi::Value::undefined();
                int id = static_cast<int>(args[0].asNumber());
                auto key = args[1].asString(rt).utf8(rt);
                auto *engine = mgr->get(id);
                if (!engine) return jsi::Value::undefined();

                if (key == "horizontal") engine->horizontal = args[2].getBool();
                else if (key == "bounces") engine->bounces = args[2].getBool();
                else if (key == "scrollEnabled") engine->scrollEnabled = args[2].getBool();
                else if (key == "pagingEnabled") engine->pagingEnabled = args[2].getBool();
                else if (key == "snapToInterval") engine->snapInterval = static_cast<float>(args[2].asNumber());
                else if (key == "decelerationRate") {
                    if (args[2].isString()) {
                        auto val = args[2].asString(rt).utf8(rt);
                        engine->decelerationRate = val == "fast"
                            ? DECELERATION_RATE_FAST
                            : DECELERATION_RATE_NORMAL;
                    } else {
                        engine->decelerationRate = static_cast<float>(args[2].asNumber());
                    }
                }

                return jsi::Value::undefined();
            }));

    // __scrollSetCallbacks(engineId, onScroll, onScrollEnd)
    rt.global().setProperty(rt, "__scrollSetCallbacks",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__scrollSetCallbacks"), 3,
            [mgr](jsi::Runtime &rt, const jsi::Value &,
                  const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 3) return jsi::Value::undefined();
                int id = static_cast<int>(args[0].asNumber());
                auto *engine = mgr->get(id);
                if (!engine) return jsi::Value::undefined();

                if (args[1].isObject() && args[1].asObject(rt).isFunction(rt)) {
                    auto cb = std::make_shared<jsi::Function>(
                        args[1].asObject(rt).asFunction(rt));
                    engine->onScrollCallback = [cb, &rt](float x, float y) {
                        cb->call(rt, jsi::Value((double)x), jsi::Value((double)y));
                    };
                }

                if (args[2].isObject() && args[2].asObject(rt).isFunction(rt)) {
                    auto cb = std::make_shared<jsi::Function>(
                        args[2].asObject(rt).asFunction(rt));
                    engine->onScrollEndCallback = [cb, &rt](float x, float y) {
                        cb->call(rt, jsi::Value((double)x), jsi::Value((double)y));
                    };
                }

                return jsi::Value::undefined();
            }));
}

} // namespace gestures
} // namespace zilol
