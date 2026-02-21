/**
 * PlatformHostFunctions.cpp — Platform info JSI bindings.
 *
 * These functions call back into Swift via extern "C" functions
 * to get UIKit-specific information (screen size, safe area, etc.).
 */

#include "PlatformHostFunctions.h"
#include <jsi/jsi.h>

using namespace facebook;

// ---------------------------------------------------------------------------
// Swift callbacks (implemented in ZilolRuntimeBridge.swift side,
// but we need C wrappers for them)
// ---------------------------------------------------------------------------

// These are resolved at link time — Swift exposes them via @_cdecl or
// we call through the ObjC runtime. For simplicity, we store values
// that Swift sets during initialization.

namespace zilol {
namespace platform {

// Platform values — set from Swift before JS loads
static float sScreenWidth = 0;
static float sScreenHeight = 0;
static float sPixelRatio = 1;
static float sSafeTop = 0, sSafeRight = 0, sSafeBottom = 0, sSafeLeft = 0;
static float sStatusBarHeight = 0;

void registerHostFunctions(jsi::Runtime &rt) {

    // __getScreenWidth()
    rt.global().setProperty(rt, "__getScreenWidth",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__getScreenWidth"), 0,
            [](jsi::Runtime &, const jsi::Value &,
               const jsi::Value *, size_t) -> jsi::Value {
                return jsi::Value(static_cast<double>(sScreenWidth));
            }));

    // __getScreenHeight()
    rt.global().setProperty(rt, "__getScreenHeight",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__getScreenHeight"), 0,
            [](jsi::Runtime &, const jsi::Value &,
               const jsi::Value *, size_t) -> jsi::Value {
                return jsi::Value(static_cast<double>(sScreenHeight));
            }));

    // __getPixelRatio()
    rt.global().setProperty(rt, "__getPixelRatio",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__getPixelRatio"), 0,
            [](jsi::Runtime &, const jsi::Value &,
               const jsi::Value *, size_t) -> jsi::Value {
                return jsi::Value(static_cast<double>(sPixelRatio));
            }));

    // __getSafeAreaInsets()
    rt.global().setProperty(rt, "__getSafeAreaInsets",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__getSafeAreaInsets"), 0,
            [](jsi::Runtime &rt, const jsi::Value &,
               const jsi::Value *, size_t) -> jsi::Value {
                jsi::Object obj(rt);
                obj.setProperty(rt, "top",    static_cast<double>(sSafeTop));
                obj.setProperty(rt, "right",  static_cast<double>(sSafeRight));
                obj.setProperty(rt, "bottom", static_cast<double>(sSafeBottom));
                obj.setProperty(rt, "left",   static_cast<double>(sSafeLeft));
                return jsi::Value(std::move(obj));
            }));

    // __getStatusBarHeight()
    rt.global().setProperty(rt, "__getStatusBarHeight",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__getStatusBarHeight"), 0,
            [](jsi::Runtime &, const jsi::Value &,
               const jsi::Value *, size_t) -> jsi::Value {
                return jsi::Value(static_cast<double>(sStatusBarHeight));
            }));
}

} // namespace platform
} // namespace zilol

// ---------------------------------------------------------------------------
// C functions called from Swift to set platform values
// ---------------------------------------------------------------------------

extern "C" {

void zilol_set_screen_dimensions(float width, float height, float pixelRatio) {
    zilol::platform::sScreenWidth = width;
    zilol::platform::sScreenHeight = height;
    zilol::platform::sPixelRatio = pixelRatio;
}

void zilol_set_safe_area_insets(float top, float right, float bottom, float left) {
    zilol::platform::sSafeTop = top;
    zilol::platform::sSafeRight = right;
    zilol::platform::sSafeBottom = bottom;
    zilol::platform::sSafeLeft = left;
}

void zilol_set_status_bar_height(float height) {
    zilol::platform::sStatusBarHeight = height;
}

} // extern "C"
