//
//  ZilolNative-Bridging-Header.h
//
//  Exposes C functions from the C++ runtime to Swift.
//  These functions are implemented in ZilolRuntime.cpp.
//

#ifndef ZilolNative_Bridging_Header_h
#define ZilolNative_Bridging_Header_h

#ifdef __cplusplus
extern "C" {
#endif

/// Initialize the Hermes runtime with a Metal layer for Skia rendering.
/// @param metalLayerPtr Pointer to the CAMetalLayer (passed as void*).
void zilol_runtime_initialize(void *metalLayerPtr);

/// Set the Yoga point scale factor (screen DPI scale).
void zilol_set_point_scale_factor(float scale);

/// Load and evaluate a JavaScript file.
/// @param filePath Null-terminated path to the JS file.
void zilol_evaluate_js_file(const char *filePath);

/// Called on every vsync from CADisplayLink.
/// @param timestampMs Timestamp in milliseconds.
void zilol_on_vsync(double timestampMs);

/// Forward a native touch event to the JS runtime.
/// @param phase 0=began, 1=moved, 2=ended, 3=cancelled
/// @param x X coordinate in points
/// @param y Y coordinate in points
/// @param pointerId Unique touch identifier
void zilol_on_touch(int phase, float x, float y, int pointerId);

/// Set screen dimensions (called from Swift before JS loads).
void zilol_set_screen_dimensions(float width, float height, float pixelRatio);

/// Set safe area insets (called from Swift before JS loads).
void zilol_set_safe_area_insets(float top, float right, float bottom, float left);

/// Set status bar height (called from Swift before JS loads).
void zilol_set_status_bar_height(float height);

#ifdef __cplusplus
}
#endif

#endif /* ZilolNative_Bridging_Header_h */
