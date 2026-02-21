import UIKit

/// Root view controller for a Zilol Native application.
///
/// - Creates a `ZilolMetalView` as the primary view (Skia renders here)
/// - Initializes the C++ Hermes runtime
/// - Loads and evaluates the JS bundle
class ZilolViewController: UIViewController {

    private var metalView: ZilolMetalView!
    private var didInitialize = false

    override func loadView() {
        metalView = ZilolMetalView(frame: UIScreen.main.bounds)
        view = metalView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        // Set platform dimensions before JS loads
        let screen = UIScreen.main
        let scale = Float(screen.scale)
        let width = Float(screen.bounds.width)
        let height = Float(screen.bounds.height)
        zilol_set_screen_dimensions(width, height, scale)

        // Set safe area insets
        if let window = UIApplication.shared.windows.first {
            let insets = window.safeAreaInsets
            zilol_set_safe_area_insets(
                Float(insets.top), Float(insets.right),
                Float(insets.bottom), Float(insets.left))
        }

        // Set status bar height
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            zilol_set_status_bar_height(
                Float(scene.statusBarManager?.statusBarFrame.height ?? 0))
        }

        // Set bundle resource path (for image loading)
        if let resourcePath = Bundle.main.resourcePath {
            resourcePath.withCString { cPath in
                zilol_set_bundle_resource_path(cPath)
            }
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        metalView.frame = view.bounds

        // Initialize runtime once, after layout gives us a valid drawable size
        guard !didInitialize else { return }
        didInitialize = true

        let scale = Float(UIScreen.main.scale)
        let metalLayer = self.metalView.metalLayer

        DispatchQueue.global(qos: .userInitiated).async {
            // 1. Initialize Hermes + register all JSI host functions
            ZilolRuntimeBridge.initialize(metalLayer: metalLayer)

            // 2. Set point scale factor for Yoga
            ZilolRuntimeBridge.setPointScaleFactor(scale)

            // 3. Load the JS bundle
            if let bundlePath = Bundle.main.path(forResource: "index", ofType: "bundle.js") {
                ZilolRuntimeBridge.evaluateJavaScript(fromFile: bundlePath)
            } else {
                print("[ZilolNative] ERROR: index.bundle.js not found in app bundle")
            }
        }
    }

    override var prefersStatusBarHidden: Bool { false }
    override var preferredStatusBarStyle: UIStatusBarStyle { .default }
}
