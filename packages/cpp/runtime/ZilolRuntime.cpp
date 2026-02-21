/**
 * ZilolRuntime.cpp — Core runtime implementation (shared).
 *
 * Platform-agnostic: uses abstract SkiaRenderer, JSI, and Hermes.
 * No Metal, Vulkan, ObjC, or Java imports.
 *
 * The extern "C" bridge functions live in the platform-specific files:
 *   - iOS:     ZilolBridge_iOS.mm
 *   - Android: ZilolBridge_Android.cpp
 */

#include "ZilolRuntime.h"
#include "yoga/YogaHostFunctions.h"
#include "skia/SkiaHostFunctions.h"
#include "skia/SkiaRenderer.h"
#include "platform/PlatformHostFunctions.h"

// Hermes
#include <hermes/hermes.h>

// JSI
#include <jsi/jsi.h>

#include <fstream>
#include <sstream>
#include <memory>
#include <vector>
#include <functional>
#include <mutex>
#include <cstdio>

using namespace facebook;

namespace zilol {

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------

static std::unique_ptr<jsi::Runtime> sRuntime;
static std::unique_ptr<skia::SkiaRenderer> sRenderer;

// Frame callbacks: map of ID → JS callback
static std::mutex sFrameMutex;
static int sNextFrameId = 1;
static std::vector<std::pair<int, jsi::Function>> sFrameCallbacks;

// Touch handler: the JS callback registered via __registerTouchHandler
static std::unique_ptr<jsi::Function> sTouchHandler;

// Native FPS tracking (1-second sliding window)
static double sNativeFPS = 0;       // rendered frames per second
static double sVsyncRate = 0;       // display link ticks per second
static double sLastFPSTimestamp = 0;
static int sFPSFrameCount = 0;      // rendered frames in window
static int sVsyncTickCount = 0;     // total vsync ticks in window

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------

void initialize(std::unique_ptr<skia::SkiaRenderer> renderer) {
    sRenderer = std::move(renderer);

    // DEBUG: Test if /tmp write works from simulator
    {
        std::ofstream test("/tmp/zilol_init.log");
        if (test.is_open()) {
            test << "C++ initialize() called\n";
            test.close();
        }
    }
    // 1. Create Hermes runtime
    auto runtimeConfig = ::hermes::vm::RuntimeConfig();
    sRuntime = facebook::hermes::makeHermesRuntime(runtimeConfig);
    auto &rt = *sRuntime;

    // 2. Register all JSI host functions
    yoga::registerHostFunctions(rt);
    skia::registerHostFunctions(rt, sRenderer.get());
    platform::registerHostFunctions(rt);

    // 2b. Register console object (Hermes doesn't provide it)
    {
        auto console = jsi::Object(rt);

        auto makeLogFn = [](const char *prefix) {
            return [prefix](jsi::Runtime &rt, const jsi::Value &,
                           const jsi::Value *args, size_t count) -> jsi::Value {
                std::string msg;
                for (size_t i = 0; i < count; i++) {
                    if (i > 0) msg += " ";
                    msg += args[i].toString(rt).utf8(rt);
                }
                fprintf(stderr, "[%s] %s\n", prefix, msg.c_str());
                return jsi::Value::undefined();
            };
        };

        console.setProperty(rt, "log",
            jsi::Function::createFromHostFunction(rt,
                jsi::PropNameID::forAscii(rt, "log"), 1, makeLogFn("LOG")));
        console.setProperty(rt, "warn",
            jsi::Function::createFromHostFunction(rt,
                jsi::PropNameID::forAscii(rt, "warn"), 1, makeLogFn("WARN")));
        console.setProperty(rt, "error",
            jsi::Function::createFromHostFunction(rt,
                jsi::PropNameID::forAscii(rt, "error"), 1, makeLogFn("ERROR")));
        console.setProperty(rt, "info",
            jsi::Function::createFromHostFunction(rt,
                jsi::PropNameID::forAscii(rt, "info"), 1, makeLogFn("INFO")));

        rt.global().setProperty(rt, "console", std::move(console));
    }

    // 3. Register frame scheduling
    //    __skiaRequestFrame(callback) → returns ID
    rt.global().setProperty(rt, "__skiaRequestFrame",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__skiaRequestFrame"), 1,
            [](jsi::Runtime &rt, const jsi::Value &,
               const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 1 || !args[0].isObject() ||
                    !args[0].asObject(rt).isFunction(rt)) {
                    return jsi::Value::undefined();
                }
                auto fn = args[0].asObject(rt).asFunction(rt);
                std::lock_guard<std::mutex> lock(sFrameMutex);
                int id = sNextFrameId++;
                sFrameCallbacks.emplace_back(id, std::move(fn));
                return jsi::Value(id);
            }));

    //    __skiaCancelFrame(id)
    rt.global().setProperty(rt, "__skiaCancelFrame",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__skiaCancelFrame"), 1,
            [](jsi::Runtime &rt, const jsi::Value &,
               const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 1) return jsi::Value::undefined();
                int id = static_cast<int>(args[0].asNumber());
                std::lock_guard<std::mutex> lock(sFrameMutex);
                sFrameCallbacks.erase(
                    std::remove_if(sFrameCallbacks.begin(), sFrameCallbacks.end(),
                        [id](const auto &p) { return p.first == id; }),
                    sFrameCallbacks.end());
                return jsi::Value::undefined();
            }));

    //    __registerTouchHandler(callback)
    rt.global().setProperty(rt, "__registerTouchHandler",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__registerTouchHandler"), 1,
            [](jsi::Runtime &rt, const jsi::Value &,
               const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 1 || !args[0].isObject() ||
                    !args[0].asObject(rt).isFunction(rt)) {
                    return jsi::Value::undefined();
                }
                sTouchHandler = std::make_unique<jsi::Function>(
                    args[0].asObject(rt).asFunction(rt));
                return jsi::Value::undefined();
            }));

    // 3b. Register __getNativeFPS() — actual rendered frames/sec
    rt.global().setProperty(rt, "__getNativeFPS",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__getNativeFPS"), 0,
            [](jsi::Runtime &, const jsi::Value &,
               const jsi::Value *, size_t) -> jsi::Value {
                return jsi::Value(sNativeFPS);
            }));

    // 3c. Register __getVsyncRate() — display refresh rate (120 on ProMotion)
    rt.global().setProperty(rt, "__getVsyncRate",
        jsi::Function::createFromHostFunction(rt,
            jsi::PropNameID::forAscii(rt, "__getVsyncRate"), 0,
            [](jsi::Runtime &, const jsi::Value &,
               const jsi::Value *, size_t) -> jsi::Value {
                return jsi::Value(sVsyncRate);
            }));

    fprintf(stdout, "[ZilolRuntime] Initialized — Hermes + JSI ready\n");
}

// ---------------------------------------------------------------------------
// Point scale factor
// ---------------------------------------------------------------------------

void setPointScaleFactor(float scale) {
    if (!sRuntime) return;
    yoga::setPointScaleFactor(*sRuntime, scale);
}

// ---------------------------------------------------------------------------
// JS evaluation
// ---------------------------------------------------------------------------

void evaluateJSFile(const std::string &path) {
    if (!sRuntime) return;

    std::ifstream file(path);
    if (!file.is_open()) {
        fprintf(stderr, "[ZilolRuntime] ERROR: Could not open %s\n", path.c_str());
        return;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string source = buffer.str();

    auto jsBuffer = std::make_shared<jsi::StringBuffer>(std::move(source));
    try {
        sRuntime->evaluateJavaScript(jsBuffer, path);
    } catch (const jsi::JSError &e) {
        fprintf(stderr, "[ZilolRuntime] JS ERROR: %s\n", e.what());
        // Write error to tmp file for easy debugging
        std::string errPath = std::string(path).substr(0, path.rfind('/')) + "/js_error.log";
        std::ofstream errFile(errPath);
        if (errFile.is_open()) {
            errFile << e.what();
            errFile.close();
        }
    } catch (const std::exception &e) {
        fprintf(stderr, "[ZilolRuntime] ERROR: %s\n", e.what());
    }
}

// ---------------------------------------------------------------------------
// Vsync — the heart of the render loop
// ---------------------------------------------------------------------------

void onVsync(double timestampMs) {
    if (!sRuntime) return;

    // Track vsync ticks (always counted, even when not rendering)
    sVsyncTickCount++;
    double nowSec = timestampMs / 1000.0;
    if (sLastFPSTimestamp == 0) sLastFPSTimestamp = nowSec;
    double elapsed = nowSec - sLastFPSTimestamp;
    if (elapsed >= 1.0) {
        sNativeFPS = sFPSFrameCount / elapsed;
        sVsyncRate = sVsyncTickCount / elapsed;
        sFPSFrameCount = 0;
        sVsyncTickCount = 0;
        sLastFPSTimestamp = nowSec;
    }

    // Drain frame callbacks — each is called once, then removed
    std::vector<std::pair<int, jsi::Function>> callbacks;
    {
        std::lock_guard<std::mutex> lock(sFrameMutex);
        std::swap(callbacks, sFrameCallbacks);
    }

    // DIRTY-FLAG: skip rendering when no JS requested a frame
    if (callbacks.empty()) return;

    // Get the renderer
    auto *renderer = sRenderer.get();
    if (!renderer || !renderer->isReady()) return;

    // ── BEGIN FRAME ──────────────────────────────────────────
    if (!renderer->beginFrame()) return;

    // Count this as a rendered frame
    sFPSFrameCount++;

    // ── JS DRAW PHASE ────────────────────────────────────────
    for (auto &[id, fn] : callbacks) {
        try {
            fn.call(*sRuntime, jsi::Value(timestampMs));
        } catch (const jsi::JSError &e) {
            fprintf(stderr, "[ZilolRuntime] VSYNC JS ERROR: %s\n", e.what());
            std::ofstream errFile("/tmp/zilol_vsync_error.log");
            if (errFile.is_open()) {
                errFile << e.what();
                errFile.close();
            }
        } catch (const std::exception &e) {
            fprintf(stderr, "[ZilolRuntime] VSYNC ERROR: %s\n", e.what());
            std::ofstream errFile("/tmp/zilol_vsync_error.log");
            if (errFile.is_open()) {
                errFile << e.what();
                errFile.close();
            }
        }
    }

    // ── END FRAME ────────────────────────────────────────────
    renderer->endFrame();
}

// ---------------------------------------------------------------------------
// Touch
// ---------------------------------------------------------------------------

void onTouch(int phase, float x, float y, int pointerId) {
    if (!sRuntime || !sTouchHandler) return;

    sTouchHandler->call(*sRuntime,
        jsi::Value(phase),
        jsi::Value(static_cast<double>(x)),
        jsi::Value(static_cast<double>(y)),
        jsi::Value(pointerId));
}

} // namespace zilol
