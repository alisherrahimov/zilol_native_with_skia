#pragma once

/**
 * ZilolRuntime.h — Core runtime initialization (shared).
 *
 * Creates Hermes, registers all JSI host functions, loads JS bundles.
 * Platform-agnostic: takes an abstract SkiaRenderer*.
 *
 * The platform layer (iOS, Android) is responsible for:
 *   1. Creating the concrete SkiaRenderer (Metal, Vulkan, GL)
 *   2. Calling initialize() with it
 *   3. Providing extern "C" bridge functions for the host language
 */

#include <string>
#include <memory>
#include <functional>

namespace facebook { namespace jsi { class Runtime; } }

namespace zilol {

namespace skia { class SkiaRenderer; }

/// Initialize the runtime with a platform-specific SkiaRenderer.
/// Takes ownership of the renderer.
void initialize(std::unique_ptr<skia::SkiaRenderer> renderer);

/// Set Yoga point scale factor.
void setPointScaleFactor(float scale);

/// Load and evaluate a JS file.
void evaluateJSFile(const std::string &path);

/// Called on vsync from the platform display link.
void onVsync(double timestampMs);

/// Called on touch event from the platform view.
void onTouch(int phase, float x, float y, int pointerId);

/// Queue a microtask to run on the JS thread at next vsync.
void queueMicrotask(std::function<void(facebook::jsi::Runtime&)> task);

} // namespace zilol
