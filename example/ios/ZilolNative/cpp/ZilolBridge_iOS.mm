/**
 * ZilolBridge_iOS.mm — iOS-specific C bridge functions.
 *
 * This is the glue between Swift and the shared C++ runtime.
 * Creates the Metal-specific SkiaRendererMetal and passes it to
 * the shared ZilolRuntime::initialize().
 *
 * .mm for ObjC++ (Metal APIs).
 */

#include "runtime/ZilolRuntime.h"
#include "SkiaRendererMetal.h"

#include <memory>
#include <string>

extern "C" {

void zilol_runtime_initialize(void *metalLayerPtr) {
    // Create the iOS-specific Metal renderer
    auto renderer = std::make_unique<zilol::skia::SkiaRendererMetal>();

    if (!renderer->initialize(metalLayerPtr)) {
        NSLog(@"[ZilolBridge] ERROR: Failed to initialize Metal renderer");
        return;
    }

    // Pass ownership to the shared runtime
    zilol::initialize(std::move(renderer));
}

void zilol_set_point_scale_factor(float scale) {
    zilol::setPointScaleFactor(scale);
}

void zilol_evaluate_js_file(const char *filePath) {
    zilol::evaluateJSFile(std::string(filePath));
}

void zilol_on_vsync(double timestampMs) {
    zilol::onVsync(timestampMs);
}

void zilol_on_touch(int phase, float x, float y, int pointerId) {
    zilol::onTouch(phase, x, y, pointerId);
}

} // extern "C"
