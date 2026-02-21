/**
 * SkiaJSI.d.ts — Global type declarations for Skia functions exposed via JSI.
 *
 * The native C++ layer registers these functions on `globalThis` during
 * app startup. TypeScript code calls them directly — no bridge, no async.
 *
 * Surface and Paint are represented by opaque numeric handles, while
 * the Canvas object is a JSI-backed proxy that forwards calls to C++ Skia.
 */

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/**
 * Get the main Skia surface.
 * The native side creates this during app init (Metal on iOS, Vulkan/GL on Android).
 * Returns a surface proxy object.
 */
declare function __skiaGetSurface(): SkiaSurfaceProxy;

/** Flush the surface to push all pending draw commands to the GPU. */
declare function __skiaFlushSurface(): void;

/** Get the surface dimensions. */
declare function __skiaGetSurfaceWidth(): number;
declare function __skiaGetSurfaceHeight(): number;

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------

/** Load an image from a bundle file path. Returns undefined if not found. */
declare function __skiaLoadImage(path: string): SkiaImageProxy | undefined;

/** Returned by __skiaLoadImage — wraps a native SkImage. */
interface SkiaImageProxy {
  width(): number;
  height(): number;
  isValid(): boolean;
}

// ---------------------------------------------------------------------------
// Text measurement
// ---------------------------------------------------------------------------

/**
 * Measure text size for Yoga layout.
 * @param text The text string
 * @param fontSize Font size in points
 * @param maxWidth Maximum width for wrapping (0 = unlimited)
 */
declare function __skiaMeasureText(
  text: string,
  fontSize: number,
  maxWidth: number,
): { width: number; height: number };

/** Register a custom font file for use with drawText. */
declare function __skiaRegisterFont(familyName: string, filePath: string): void;

// ---------------------------------------------------------------------------
// Canvas (proxy object from JSI)
// ---------------------------------------------------------------------------

/**
 * The canvas proxy is a JSI HostObject. It implements the SkCanvas
 * interface defined in @zilol-native/renderer/types.ts.
 */
interface SkiaSurfaceProxy {
  getCanvas(): SkiaCanvasProxy;
  width(): number;
  height(): number;
  flush(): void;
}

interface SkiaCanvasProxy {
  // ── Canvas state ─────────────────────────────────────────
  save(): void;
  restore(): void;
  translate(dx: number, dy: number): void;
  scale(sx: number, sy: number): void;
  rotate(degrees: number): void;
  concat(matrix: number[]): void;

  // ── Clip ─────────────────────────────────────────────────
  clipRect(x: number, y: number, width: number, height: number): void;
  clipRRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
  ): void;

  // ── Draw: rectangles ─────────────────────────────────────
  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ): void;
  drawRRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
    color: string,
  ): void;
  drawRRectStroke(
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
    color: string,
    strokeWidth: number,
  ): void;

  /** Per-corner border radii (top-left, top-right, bottom-right, bottom-left). */
  drawRRect4(
    x: number,
    y: number,
    width: number,
    height: number,
    tlx: number,
    tly: number,
    trx: number,
    try_: number,
    brx: number,
    bry: number,
    blx: number,
    bly: number,
    color: string,
  ): void;

  // ── Draw: text ───────────────────────────────────────────
  drawText(
    text: string,
    x: number,
    y: number,
    color: string,
    fontSize: number,
  ): void;

  /** Measure text before drawing — for Yoga layout measure fns. */
  measureText(
    text: string,
    fontSize: number,
    maxWidth: number,
  ): { width: number; height: number };

  // ── Draw: images ─────────────────────────────────────────
  drawImage(
    image: SkiaImageProxy,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;

  // ── Draw: shadows ────────────────────────────────────────
  drawShadow(
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
    color: string,
    offsetX: number,
    offsetY: number,
    blurRadius: number,
  ): void;

  // ── Draw: gradients ──────────────────────────────────────
  /**
   * Draw a rectangle filled with a gradient.
   * @param type "linear" | "radial"
   * @param colors Array of CSS color strings
   * @param positions Array of normalized positions [0..1]
   */
  drawRectGradient(
    x: number,
    y: number,
    width: number,
    height: number,
    type: "linear" | "radial",
    colors: string[],
    positions: number[],
  ): void;

  // ── Draw: blur ───────────────────────────────────────────
  /** Draw a blurred rectangle (for backdrop effects). */
  drawBlurRect(
    x: number,
    y: number,
    width: number,
    height: number,
    blurRadius: number,
    color: string,
  ): void;

  // ── Compositing ──────────────────────────────────────────
  /** Save layer with alpha for opacity compositing. */
  saveLayerAlpha(
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number,
  ): void;

  clear(color: string): void;
}

// ---------------------------------------------------------------------------
// Frame scheduling
// ---------------------------------------------------------------------------

/**
 * Request a callback on the next vsync.
 * The native side drives this via CADisplayLink (iOS) / Choreographer (Android).
 *
 * @returns An ID that can be passed to __skiaCancelFrame().
 */
declare function __skiaRequestFrame(
  callback: (timestamp: number) => void,
): number;

/** Cancel a previously requested frame callback. */
declare function __skiaCancelFrame(id: number): void;

// ---------------------------------------------------------------------------
// Touch events
// ---------------------------------------------------------------------------

/**
 * Register a callback for touch events from the native side.
 *
 * @param handler - Called with (phase, x, y, pointerId) for each touch event.
 *   phase: 0=began, 1=moved, 2=ended, 3=cancelled
 */
declare function __registerTouchHandler(
  handler: (phase: number, x: number, y: number, pointerId: number) => void,
): void;

// ---------------------------------------------------------------------------
// Platform info
// ---------------------------------------------------------------------------

/** Get screen dimensions in points. */
declare function __getScreenWidth(): number;
declare function __getScreenHeight(): number;

/** Get device pixel ratio (e.g. 2.0 for Retina, 3.0 for 3x). */
declare function __getPixelRatio(): number;

/** Get safe area insets (iOS notch, Android status bar). */
declare function __getSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Get status bar height. */
declare function __getStatusBarHeight(): number;
