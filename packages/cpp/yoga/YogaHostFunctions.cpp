/**
 * YogaHostFunctions.cpp — Yoga C++ JSI bindings.
 *
 * Registers all __yoga* global functions matching YogaJSI.d.ts.
 * Uses an unordered_map<int, YGNodeRef> to manage opaque handles.
 *
 * Yoga C++ API reference: https://github.com/nicolo-ribaudo/AliSkia/
 */

#include "YogaHostFunctions.h"

#include <yoga/Yoga.h>
#include <jsi/jsi.h>

#include <unordered_map>
#include <functional>

using namespace facebook;

namespace zilol {
namespace yoga {

// ---------------------------------------------------------------------------
// Handle map
// ---------------------------------------------------------------------------

static int sNextHandle = 1;
static std::unordered_map<int, YGNodeRef> sNodeMap;
static YGConfigRef sConfig = YGConfigNew();

static inline YGNodeRef getNode(int handle) {
    auto it = sNodeMap.find(handle);
    return (it != sNodeMap.end()) ? it->second : nullptr;
}

// ---------------------------------------------------------------------------
// Helper: register a JSI function on global
// ---------------------------------------------------------------------------

using HostFn = std::function<jsi::Value(
    jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t)>;

static void reg(jsi::Runtime &rt, const char *name, int paramCount, HostFn fn) {
    rt.global().setProperty(rt, name,
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, name),
            paramCount,
            [fn = std::move(fn)](jsi::Runtime &rt, const jsi::Value &thisVal,
                                  const jsi::Value *args, size_t count) -> jsi::Value {
                return fn(rt, thisVal, args, count);
            }));
}

// Helper to get int arg
static inline int intArg(const jsi::Value *args, size_t i) {
    return static_cast<int>(args[i].asNumber());
}

// Helper to get float arg
static inline float floatArg(const jsi::Value *args, size_t i) {
    return static_cast<float>(args[i].asNumber());
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

void registerHostFunctions(jsi::Runtime &rt) {

    // ── Node lifecycle ─────────────────────────────────────────────────

    reg(rt, "__yogaCreateNode", 0,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) {
            YGNodeRef node = YGNodeNewWithConfig(sConfig);
            int handle = sNextHandle++;
            sNodeMap[handle] = node;
            return jsi::Value(handle);
        });

    reg(rt, "__yogaFreeNode", 1,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            int h = intArg(args, 0);
            auto it = sNodeMap.find(h);
            if (it != sNodeMap.end()) {
                YGNodeFree(it->second);
                sNodeMap.erase(it);
            }
            return jsi::Value::undefined();
        });

    // ── Tree operations ────────────────────────────────────────────────

    reg(rt, "__yogaInsertChild", 3,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto parent = getNode(intArg(args, 0));
            auto child = getNode(intArg(args, 1));
            int index = intArg(args, 2);
            if (parent && child) {
                YGNodeInsertChild(parent, child, index);
            }
            return jsi::Value::undefined();
        });

    reg(rt, "__yogaRemoveChild", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto parent = getNode(intArg(args, 0));
            auto child = getNode(intArg(args, 1));
            if (parent && child) {
                YGNodeRemoveChild(parent, child);
            }
            return jsi::Value::undefined();
        });

    reg(rt, "__yogaGetChildCount", 1,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto node = getNode(intArg(args, 0));
            return node ? jsi::Value(static_cast<int>(YGNodeGetChildCount(node)))
                        : jsi::Value(0);
        });

    // ── Layout calculation ─────────────────────────────────────────────

    reg(rt, "__yogaCalculateLayout", 4,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto node = getNode(intArg(args, 0));
            if (!node) return jsi::Value::undefined();
            float w = floatArg(args, 1);
            float h = floatArg(args, 2);
            int dir = intArg(args, 3);
            YGNodeCalculateLayout(node, w, h, static_cast<YGDirection>(dir));
            return jsi::Value::undefined();
        });

    reg(rt, "__yogaGetComputedLayout", 1,
        [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t) {
            auto node = getNode(intArg(args, 0));
            if (!node) return jsi::Value::undefined();
            jsi::Object obj(rt);
            obj.setProperty(rt, "left",   static_cast<double>(YGNodeLayoutGetLeft(node)));
            obj.setProperty(rt, "top",    static_cast<double>(YGNodeLayoutGetTop(node)));
            obj.setProperty(rt, "width",  static_cast<double>(YGNodeLayoutGetWidth(node)));
            obj.setProperty(rt, "height", static_cast<double>(YGNodeLayoutGetHeight(node)));
            return jsi::Value(std::move(obj));
        });

    reg(rt, "__yogaMarkDirty", 1,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto node = getNode(intArg(args, 0));
            if (node) YGNodeMarkDirty(node);
            return jsi::Value::undefined();
        });

    // ── Dimensions ─────────────────────────────────────────────────────

    // Width
    reg(rt, "__yogaSetWidth", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetWidth(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetWidthPercent", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetWidthPercent(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetWidthAuto", 1,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetWidthAuto(n);
            return jsi::Value::undefined();
        });

    // Height
    reg(rt, "__yogaSetHeight", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetHeight(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetHeightPercent", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetHeightPercent(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetHeightAuto", 1,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetHeightAuto(n);
            return jsi::Value::undefined();
        });

    // Min/Max Width
    reg(rt, "__yogaSetMinWidth", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetMinWidth(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetMinWidthPercent", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetMinWidthPercent(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetMaxWidth", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetMaxWidth(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetMaxWidthPercent", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetMaxWidthPercent(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });

    // Min/Max Height
    reg(rt, "__yogaSetMinHeight", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetMinHeight(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetMinHeightPercent", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetMinHeightPercent(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetMaxHeight", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetMaxHeight(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetMaxHeightPercent", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetMaxHeightPercent(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });

    // ── Flex ────────────────────────────────────────────────────────────

    reg(rt, "__yogaSetFlex", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetFlex(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetFlexGrow", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetFlexGrow(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetFlexShrink", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetFlexShrink(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetFlexDirection", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetFlexDirection(n, static_cast<YGFlexDirection>(intArg(args, 1)));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetFlexWrap", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetFlexWrap(n, static_cast<YGWrap>(intArg(args, 1)));
            return jsi::Value::undefined();
        });

    // ── Alignment ──────────────────────────────────────────────────────

    reg(rt, "__yogaSetJustifyContent", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetJustifyContent(n, static_cast<YGJustify>(intArg(args, 1)));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetAlignItems", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetAlignItems(n, static_cast<YGAlign>(intArg(args, 1)));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetAlignSelf", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetAlignSelf(n, static_cast<YGAlign>(intArg(args, 1)));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetAlignContent", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetAlignContent(n, static_cast<YGAlign>(intArg(args, 1)));
            return jsi::Value::undefined();
        });

    // ── Position ───────────────────────────────────────────────────────

    reg(rt, "__yogaSetPositionType", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetPositionType(n, static_cast<YGPositionType>(intArg(args, 1)));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetPosition", 3,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetPosition(n, static_cast<YGEdge>(intArg(args, 1)), floatArg(args, 2));
            return jsi::Value::undefined();
        });

    // ── Padding & Margin ───────────────────────────────────────────────

    reg(rt, "__yogaSetPadding", 3,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetPadding(n, static_cast<YGEdge>(intArg(args, 1)), floatArg(args, 2));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetMargin", 3,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetMargin(n, static_cast<YGEdge>(intArg(args, 1)), floatArg(args, 2));
            return jsi::Value::undefined();
        });

    // ── Gap ────────────────────────────────────────────────────────────

    reg(rt, "__yogaSetGap", 3,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetGap(n, static_cast<YGGutter>(intArg(args, 1)), floatArg(args, 2));
            return jsi::Value::undefined();
        });

    // ── Other properties ───────────────────────────────────────────────

    reg(rt, "__yogaSetOverflow", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetOverflow(n, static_cast<YGOverflow>(intArg(args, 1)));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetDisplay", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetDisplay(n, static_cast<YGDisplay>(intArg(args, 1)));
            return jsi::Value::undefined();
        });
    reg(rt, "__yogaSetAspectRatio", 2,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            auto n = getNode(intArg(args, 0));
            if (n) YGNodeStyleSetAspectRatio(n, floatArg(args, 1));
            return jsi::Value::undefined();
        });

    // ── Measure function ───────────────────────────────────────────────

    reg(rt, "__yogaSetMeasureFunc", 2,
        [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t) {
            auto node = getNode(intArg(args, 0));
            if (!node) return jsi::Value::undefined();

            if (!args[1].isObject() || !args[1].asObject(rt).isFunction(rt)) {
                return jsi::Value::undefined();
            }

            // Store the JS function as shared_ptr so it can be captured by the
            // Yoga measure callback (which is a plain C function pointer — we
            // use the node's context pointer to pass the callback through).
            auto jsFn = std::make_shared<jsi::Function>(
                args[1].asObject(rt).asFunction(rt));

            // Store a pointer to (runtime, jsFunction) in node context
            struct MeasureCtx {
                jsi::Runtime *rt;
                std::shared_ptr<jsi::Function> fn;
            };
            auto *ctx = new MeasureCtx{&rt, jsFn};
            YGNodeSetContext(node, ctx);

            YGNodeSetMeasureFunc(node,
                [](YGNodeConstRef node, float width, YGMeasureMode widthMode,
                   float height, YGMeasureMode heightMode) -> YGSize {
                    auto *ctx = static_cast<MeasureCtx *>(
                        YGNodeGetContext(const_cast<YGNodeRef>(node)));
                    if (!ctx || !ctx->fn) {
                        return {0, 0};
                    }
                    auto result = ctx->fn->call(*ctx->rt,
                        jsi::Value(static_cast<double>(width)),
                        jsi::Value(static_cast<int>(widthMode)),
                        jsi::Value(static_cast<double>(height)),
                        jsi::Value(static_cast<int>(heightMode)));

                    if (!result.isObject()) return {0, 0};

                    auto obj = result.asObject(*ctx->rt);
                    float w = static_cast<float>(
                        obj.getProperty(*ctx->rt, "width").asNumber());
                    float h = static_cast<float>(
                        obj.getProperty(*ctx->rt, "height").asNumber());
                    return {w, h};
                });

            return jsi::Value::undefined();
        });

    // ── Config ─────────────────────────────────────────────────────────

    reg(rt, "__yogaSetPointScaleFactor", 1,
        [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
            float factor = floatArg(args, 0);
            YGConfigSetPointScaleFactor(sConfig, factor);
            return jsi::Value::undefined();
        });
}

// ---------------------------------------------------------------------------
// Direct call for setPointScaleFactor (from Swift before JS loads)
// ---------------------------------------------------------------------------

void setPointScaleFactor(jsi::Runtime &rt, float scale) {
    YGConfigSetPointScaleFactor(sConfig, scale);
}

} // namespace yoga
} // namespace zilol
