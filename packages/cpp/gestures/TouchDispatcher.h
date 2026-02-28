/**
 * TouchDispatcher.h — C++ hit testing + touch routing.
 *
 * Walks the C++ node tree to find touch targets, manages press
 * states, and only calls JS for onPress/onLongPress callbacks.
 *
 * Replaces the TS EventDispatcher for basic hit testing.
 *
 * JSI API:
 *   __touchSetCallback(nodeId, event, callback)
 *   event: "onPressIn" | "onPressOut" | "onPress" | "onLongPress"
 *
 * The native layer calls dispatchTouch() which does hit testing
 * in C++ and fires JS callbacks only when needed.
 */

#pragma once

#include "skia/SkiaNodeTree.h"
#include "gestures/GestureRecognizer.h"

#include <jsi/jsi.h>

#include <unordered_map>
#include <memory>
#include <functional>
#include <string>
#include <vector>
#include <chrono>

namespace zilol {
namespace gestures {

// ---------------------------------------------------------------------------
// Touch callback types
// ---------------------------------------------------------------------------

struct TouchCallbacks {
    std::shared_ptr<facebook::jsi::Function> onPressIn;
    std::shared_ptr<facebook::jsi::Function> onPressOut;
    std::shared_ptr<facebook::jsi::Function> onPress;
    std::shared_ptr<facebook::jsi::Function> onLongPress;
};

// ---------------------------------------------------------------------------
// TouchDispatcher
// ---------------------------------------------------------------------------

class TouchDispatcher {
public:
    /// Set the node tree for hit testing.
    void setNodeTree(skia::SkiaNodeTree *tree) {
        tree_ = tree;
    }

    /// Register a touch callback for a node.
    void setCallback(int nodeId, const std::string &event,
                     std::shared_ptr<facebook::jsi::Function> callback) {
        callbacks_[nodeId]; // ensure entry exists
        if (event == "onPressIn") callbacks_[nodeId].onPressIn = callback;
        else if (event == "onPressOut") callbacks_[nodeId].onPressOut = callback;
        else if (event == "onPress") callbacks_[nodeId].onPress = callback;
        else if (event == "onLongPress") callbacks_[nodeId].onLongPress = callback;
    }

    /**
     * Dispatch a touch event.
     *
     * @param phase    0=began, 1=moved, 2=ended, 3=cancelled
     * @param x        Touch X in logical points
     * @param y        Touch Y in logical points
     * @param pointerId Pointer/finger identifier
     * @param rt       JSI runtime for callback invocation
     */
    void dispatchTouch(int phase, float x, float y, int pointerId,
                       facebook::jsi::Runtime &rt) {
        // Route to gesture recognizers
        if (phase == 0) {
            // On began: hit-test and track pointer → node for gestures
            auto *target = hitTest(x, y);
            if (target && nodeGestures_.count(target->id)) {
                gesturePointers_[pointerId] = target->id;
                dispatchToGestures(phase, x, y, pointerId, target->id, rt);
            }
        } else {
            // For moved/ended/cancelled: route to previously captured node
            auto gpit = gesturePointers_.find(pointerId);
            if (gpit != gesturePointers_.end()) {
                dispatchToGestures(phase, x, y, pointerId, gpit->second, rt);
                if (phase == 2 || phase == 3) {
                    gesturePointers_.erase(gpit);
                }
            }
        }

        // Route to press callbacks (unchanged)
        switch (phase) {
            case 0: handleTouchBegan(x, y, pointerId, rt); break;
            case 1: handleTouchMoved(x, y, pointerId, rt); break;
            case 2: handleTouchEnded(x, y, pointerId, rt); break;
            case 3: handleTouchCancelled(pointerId, rt); break;
        }
    }

private:
    skia::SkiaNodeTree *tree_ = nullptr;
    std::unordered_map<int, TouchCallbacks> callbacks_;

    // Gesture recognizers: gestureId → recognizer
    std::unordered_map<int, std::unique_ptr<GestureRecognizer>> recognizers_;
    // Node → list of gestureIds for hit-test routing
    std::unordered_map<int, std::vector<int>> nodeGestures_;
    // Pointer → nodeId (active gesture tracking per finger)
    std::unordered_map<int, int> gesturePointers_;
    int nextGestureId_ = 1;

public:
    /// Attach a gesture recognizer to a node. Returns gestureId.
    int attachGesture(int nodeId, const std::string &gestureType) {
        int gid = nextGestureId_++;
        std::unique_ptr<GestureRecognizer> rec;
        if (gestureType == "pan") rec = std::make_unique<PanRecognizer>();
        else if (gestureType == "pinch") rec = std::make_unique<PinchRecognizer>();
        else if (gestureType == "rotation") rec = std::make_unique<RotationRecognizer>();
        else if (gestureType == "tap") rec = std::make_unique<TapRecognizer>();
        else return -1;
        rec->gestureId = gid;
        rec->nodeId = nodeId;
        recognizers_[gid] = std::move(rec);
        nodeGestures_[nodeId].push_back(gid);
        return gid;
    }

    /// Set a callback on a gesture recognizer.
    void setGestureCallback(int gestureId, const std::string &event,
                            std::shared_ptr<facebook::jsi::Function> cb) {
        auto it = recognizers_.find(gestureId);
        if (it == recognizers_.end()) return;
        auto *rec = it->second.get();
        if (event == "onStart") rec->onStart = cb;
        else if (event == "onUpdate") rec->onUpdate = cb;
        else if (event == "onEnd") rec->onEnd = cb;
    }

    /// Set a config value on a gesture recognizer.
    void setGestureConfig(int gestureId, const std::string &key, double value) {
        auto it = recognizers_.find(gestureId);
        if (it == recognizers_.end()) return;
        auto *rec = it->second.get();
        if (key == "numberOfTaps") {
            if (auto *tap = dynamic_cast<TapRecognizer*>(rec)) {
                tap->requiredTaps = (int)value;
            }
        } else if (key == "activationThreshold") {
            if (auto *pan = dynamic_cast<PanRecognizer*>(rec)) {
                pan->activationThreshold = (float)value;
            }
        } else if (key == "maxDistance") {
            if (auto *tap = dynamic_cast<TapRecognizer*>(rec)) {
                tap->maxDistance = (float)value;
            }
        }
    }

private:
    /// Route a touch to all gesture recognizers attached to the hit node.
    void dispatchToGestures(int phase, float x, float y, int pointerId,
                            int hitNodeId, facebook::jsi::Runtime &rt) {
        auto nit = nodeGestures_.find(hitNodeId);
        if (nit == nodeGestures_.end()) return;
        for (int gid : nit->second) {
            auto it = recognizers_.find(gid);
            if (it != recognizers_.end()) {
                it->second->onTouchEvent(phase, x, y, pointerId, rt);
            }
        }
    }

    // Active touch state
    struct ActiveTouch {
        int nodeId = 0;    // node that captured this touch
        float startX = 0;
        float startY = 0;
        double startTimeMs = 0; // timestamp for long-press detection
    };
    std::unordered_map<int, ActiveTouch> activeTouches_;

    // ── Hit testing ───────────────────────────────────────────

    /**
     * Find the deepest touchable node at (x, y).
     * Walks children in reverse order (front-to-back).
     */
    skia::SkiaNode *hitTest(float x, float y) {
        if (!tree_) return nullptr;
        auto *root = tree_->getRoot();
        if (!root) return nullptr;
        return hitTestNode(root, x, y);
    }

    skia::SkiaNode *hitTestNode(skia::SkiaNode *node, float x, float y) {
        if (!node->visible) return nullptr;
        if (node->display == "none") return nullptr;

        auto &l = node->layout;

        // Check if point is within bounds
        if (x < l.absoluteX || x > l.absoluteX + l.width ||
            y < l.absoluteY || y > l.absoluteY + l.height) {
            return nullptr;
        }

        // Transform touch coordinates for scroll containers:
        // Children are laid out in content space, but rendered offset by scroll.
        // Touch comes in viewport space, so we add scroll offset to convert
        // from viewport → content space for children hit testing.
        float childX = x;
        float childY = y;
        if (node->type == skia::NodeType::Scroll) {
            childX += node->scrollX;
            childY += node->scrollY;
        }

        // Check children in reverse order (front-most first)
        for (int i = (int)node->children.size() - 1; i >= 0; i--) {
            auto *hit = hitTestNode(node->children[i], childX, childY);
            if (hit) return hit;
        }

        // If this node is touchable, it's the target
        if (node->touchable || callbacks_.count(node->id)) {
            return node;
        }

        return nullptr;
    }

    // ── Touch handlers ────────────────────────────────────────

    void handleTouchBegan(float x, float y, int pointerId,
                          facebook::jsi::Runtime &rt) {
        auto *target = hitTest(x, y);
        if (!target) return;

        ActiveTouch touch;
        touch.nodeId = target->id;
        touch.startX = x;
        touch.startY = y;
        touch.startTimeMs = std::chrono::duration<double, std::milli>(
            std::chrono::steady_clock::now().time_since_epoch()).count();
        activeTouches_[pointerId] = touch;

        // Fire onPressIn
        auto it = callbacks_.find(target->id);
        if (it != callbacks_.end() && it->second.onPressIn) {
            try {
                it->second.onPressIn->call(rt);
            } catch (...) {}
        }
    }

    void handleTouchMoved(float x, float y, int pointerId,
                          facebook::jsi::Runtime &rt) {
        auto tit = activeTouches_.find(pointerId);
        if (tit == activeTouches_.end()) return;

        auto &touch = tit->second;

        // Check if moved too far (cancel threshold: 10px)
        float dx = x - touch.startX;
        float dy = y - touch.startY;
        if (dx * dx + dy * dy > 100.0f) { // 10px squared
            // Moved too far — cancel press
            auto it = callbacks_.find(touch.nodeId);
            if (it != callbacks_.end() && it->second.onPressOut) {
                try {
                    it->second.onPressOut->call(rt);
                } catch (...) {}
            }
            activeTouches_.erase(pointerId);
        }
    }

    void handleTouchEnded(float x, float y, int pointerId,
                          facebook::jsi::Runtime &rt) {
        auto tit = activeTouches_.find(pointerId);
        if (tit == activeTouches_.end()) return;

        auto &touch = tit->second;
        int nodeId = touch.nodeId;
        double startTimeMs = touch.startTimeMs;
        activeTouches_.erase(pointerId);

        auto it = callbacks_.find(nodeId);
        if (it == callbacks_.end()) return;

        // Fire onPressOut
        if (it->second.onPressOut) {
            try {
                it->second.onPressOut->call(rt);
            } catch (...) {}
        }

        // Fire onPress or onLongPress if still within bounds
        auto *node = tree_->getNode(nodeId);
        if (node) {
            auto &l = node->layout;
            if (x >= l.absoluteX && x <= l.absoluteX + l.width &&
                y >= l.absoluteY && y <= l.absoluteY + l.height) {
                // Check if held long enough for long press (500ms)
                double nowMs = std::chrono::duration<double, std::milli>(
                    std::chrono::steady_clock::now().time_since_epoch()).count();
                double heldMs = nowMs - startTimeMs;

                if (heldMs >= 500.0 && it->second.onLongPress) {
                    try {
                        it->second.onLongPress->call(rt);
                    } catch (...) {}
                } else if (it->second.onPress) {
                    try {
                        it->second.onPress->call(rt);
                    } catch (...) {}
                }
            }
        }
    }

    void handleTouchCancelled(int pointerId,
                              facebook::jsi::Runtime &rt) {
        auto tit = activeTouches_.find(pointerId);
        if (tit == activeTouches_.end()) return;

        auto &touch = tit->second;
        int nodeId = touch.nodeId;
        activeTouches_.erase(pointerId);

        auto it = callbacks_.find(nodeId);
        if (it != callbacks_.end() && it->second.onPressOut) {
            try {
                it->second.onPressOut->call(rt);
            } catch (...) {}
        }
    }
};

// ---------------------------------------------------------------------------
// JSI Registration
// ---------------------------------------------------------------------------

inline void registerTouchDispatcherHostFunctions(
    facebook::jsi::Runtime &rt,
    TouchDispatcher *dispatcher)
{
    using namespace facebook;

    // __touchSetCallback(nodeId, event, callback)
    rt.global().setProperty(rt, "__touchSetCallback",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__touchSetCallback"), 3,
            [dispatcher](jsi::Runtime &rt, const jsi::Value &,
                         const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 3) return jsi::Value::undefined();

                int nodeId = static_cast<int>(args[0].asNumber());
                auto event = args[1].asString(rt).utf8(rt);

                if (args[2].isObject() && args[2].asObject(rt).isFunction(rt)) {
                    auto cb = std::make_shared<jsi::Function>(
                        args[2].asObject(rt).asFunction(rt));
                    dispatcher->setCallback(nodeId, event, cb);
                }

                return jsi::Value::undefined();
            }));

    // __gestureAttach(nodeId, gestureType) → gestureId
    rt.global().setProperty(rt, "__gestureAttach",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__gestureAttach"), 2,
            [dispatcher](jsi::Runtime &rt, const jsi::Value &,
                         const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 2) return jsi::Value::undefined();
                int nodeId = static_cast<int>(args[0].asNumber());
                auto type = args[1].asString(rt).utf8(rt);
                int gid = dispatcher->attachGesture(nodeId, type);
                return jsi::Value(gid);
            }));

    // __gestureSetCallback(gestureId, event, callback)
    rt.global().setProperty(rt, "__gestureSetCallback",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__gestureSetCallback"), 3,
            [dispatcher](jsi::Runtime &rt, const jsi::Value &,
                         const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 3) return jsi::Value::undefined();
                int gestureId = static_cast<int>(args[0].asNumber());
                auto event = args[1].asString(rt).utf8(rt);
                if (args[2].isObject() && args[2].asObject(rt).isFunction(rt)) {
                    auto cb = std::make_shared<jsi::Function>(
                        args[2].asObject(rt).asFunction(rt));
                    dispatcher->setGestureCallback(gestureId, event, cb);
                }
                return jsi::Value::undefined();
            }));

    // __gestureSetConfig(gestureId, key, value)
    rt.global().setProperty(rt, "__gestureSetConfig",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__gestureSetConfig"), 3,
            [dispatcher](jsi::Runtime &rt, const jsi::Value &,
                         const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 3) return jsi::Value::undefined();
                int gestureId = static_cast<int>(args[0].asNumber());
                auto key = args[1].asString(rt).utf8(rt);
                double value = args[2].asNumber();
                dispatcher->setGestureConfig(gestureId, key, value);
                return jsi::Value::undefined();
            }));
}

} // namespace gestures
} // namespace zilol
