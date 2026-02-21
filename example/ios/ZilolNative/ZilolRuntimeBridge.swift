import UIKit
import QuartzCore

/// Swift bridge to the C++ ZilolRuntime.
///
/// These functions are implemented in C++ (ZilolRuntime.cpp) and exposed
/// via the bridging header. They provide the Swift ↔ C++ boundary.
@objc class ZilolRuntimeBridge: NSObject {

    /// Initialize the Hermes runtime and register all JSI host functions.
    /// Must be called before any JS evaluation.
    ///
    /// - Parameter metalLayer: The CAMetalLayer from ZilolMetalView
    @objc static func initialize(metalLayer: CAMetalLayer) {
        zilol_runtime_initialize(Unmanaged.passUnretained(metalLayer).toOpaque())
    }

    /// Set the Yoga point scale factor (screen scale).
    @objc static func setPointScaleFactor(_ scale: Float) {
        zilol_set_point_scale_factor(scale)
    }

    /// Evaluate a JavaScript file.
    @objc static func evaluateJavaScript(fromFile path: String) {
        path.withCString { cPath in
            zilol_evaluate_js_file(cPath)
        }
    }

    /// Called on every vsync by the CADisplayLink.
    @objc static func onVsync(_ timestamp: Double) {
        zilol_on_vsync(timestamp)
    }

    /// Forward a touch event to the JS runtime.
    @objc static func onTouch(phase: Int32, x: Float, y: Float, pointerId: Int32) {
        zilol_on_touch(phase, x, y, pointerId)
    }

    /// Get screen width in points.
    @objc static func screenWidth() -> Float {
        return Float(UIScreen.main.bounds.width)
    }

    /// Get screen height in points.
    @objc static func screenHeight() -> Float {
        return Float(UIScreen.main.bounds.height)
    }

    /// Get device pixel ratio.
    @objc static func pixelRatio() -> Float {
        return Float(UIScreen.main.scale)
    }

    /// Get safe area insets.
    @objc static func safeAreaInsets() -> UIEdgeInsets {
        guard let window = UIApplication.shared.windows.first else {
            return .zero
        }
        return window.safeAreaInsets
    }

    /// Get status bar height.
    @objc static func statusBarHeight() -> Float {
        let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
        return Float(scene?.statusBarManager?.statusBarFrame.height ?? 0)
    }
}
