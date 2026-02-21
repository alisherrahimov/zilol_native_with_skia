import UIKit
import MetalKit

/// Custom UIView backed by a CAMetalLayer for Skia GPU rendering.
///
/// Responsibilities:
/// 1. **Rendering**: Provides the CAMetalLayer that Skia uses for its SkSurface
/// 2. **Vsync**: Uses CADisplayLink to drive frame callbacks
/// 3. **Touch**: Forwards all touch events to the JS touch handler via JSI
class ZilolMetalView: UIView {

    // MARK: - Metal Layer

    override class var layerClass: AnyClass { CAMetalLayer.self }

    var metalLayer: CAMetalLayer {
        return layer as! CAMetalLayer
    }

    // MARK: - Display Link (vsync)

    private var displayLink: CADisplayLink?

    // MARK: - Native FPS tracking
    private var frameCount: Int = 0
    private var lastFPSTimestamp: CFTimeInterval = 0
    private(set) var currentFPS: Double = 0

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        // Configure Metal layer
        guard let device = MTLCreateSystemDefaultDevice() else {
            fatalError("[ZilolNative] Metal is not supported on this device")
        }
        metalLayer.device = device
        metalLayer.pixelFormat = .bgra8Unorm
        metalLayer.framebufferOnly = true
        metalLayer.contentsScale = UIScreen.main.scale
        metalLayer.presentsWithTransaction = false

        // Enable multitouch
        isMultipleTouchEnabled = true
        isUserInteractionEnabled = true

        // Start display link with ProMotion 120Hz support
        displayLink = CADisplayLink(target: self, selector: #selector(onVsync(_:)))
        if #available(iOS 15.0, *) {
            displayLink?.preferredFrameRateRange = CAFrameRateRange(
                minimum: 60, maximum: 120, preferred: 120)
        }
        displayLink?.add(to: .main, forMode: .common)
    }

    deinit {
        displayLink?.invalidate()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        // Update Metal layer drawable size when view resizes
        let scale = UIScreen.main.scale
        metalLayer.drawableSize = CGSize(
            width: bounds.width * scale,
            height: bounds.height * scale
        )
    }

    // MARK: - Vsync

    @objc private func onVsync(_ link: CADisplayLink) {
        // Native FPS measurement (1-second sliding window)
        frameCount += 1
        let now = link.timestamp
        if lastFPSTimestamp == 0 {
            lastFPSTimestamp = now
        }
        let elapsed = now - lastFPSTimestamp
        if elapsed >= 1.0 {
            currentFPS = Double(frameCount) / elapsed
            frameCount = 0
            lastFPSTimestamp = now
        }

        let timestamp = link.timestamp * 1000.0 // convert to ms
        ZilolRuntimeBridge.onVsync(timestamp)
    }

    // MARK: - Touch Events

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        forwardTouches(touches, phase: 0) // Began
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        forwardTouches(touches, phase: 1) // Moved
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        forwardTouches(touches, phase: 2) // Ended
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        forwardTouches(touches, phase: 3) // Cancelled
    }

    private func forwardTouches(_ touches: Set<UITouch>, phase: Int32) {
        for touch in touches {
            let location = touch.location(in: self)
            let pointerId = Int32(touch.hash & 0x7FFFFFFF) // stable per-touch ID
            ZilolRuntimeBridge.onTouch(
                phase: phase,
                x: Float(location.x),
                y: Float(location.y),
                pointerId: pointerId
            )
        }
    }
}
