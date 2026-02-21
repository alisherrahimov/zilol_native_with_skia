/**
 * PlatformAdapter.ts — Abstract interface for platform-specific operations.
 *
 * The native side provides concrete implementations via JSI.
 * The TypeScript layer accesses them through the adapter singleton.
 *
 * This decouples platform code from the rest of the framework, making
 * it easy to test and to support multiple platforms.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScreenDimensions {
  /** Screen width in logical points. */
  width: number;
  /** Screen height in logical points. */
  height: number;
  /** Device pixel ratio (e.g., 2.0 for Retina). */
  scale: number;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export interface PlatformAdapter {
  /** Get the current screen dimensions. */
  getScreenDimensions(): ScreenDimensions;

  /** Get safe area insets (notch, status bar, home indicator). */
  getSafeAreaInsets(): SafeAreaInsets;

  /** Get the status bar height in points. */
  getStatusBarHeight(): number;

  /**
   * Request a callback on the next display refresh (vsync).
   * @returns An ID for cancellation.
   */
  requestAnimationFrame(callback: (timestamp: number) => void): number;

  /** Cancel a previously requested animation frame. */
  cancelAnimationFrame(id: number): void;
}

// ---------------------------------------------------------------------------
// JSI adapter (default — calls native globals)
// ---------------------------------------------------------------------------

/**
 * Default adapter that calls the JSI functions registered by the native side.
 */
export class JSIPlatformAdapter implements PlatformAdapter {
  getScreenDimensions(): ScreenDimensions {
    return {
      width: __getScreenWidth(),
      height: __getScreenHeight(),
      scale: __getPixelRatio(),
    };
  }

  getSafeAreaInsets(): SafeAreaInsets {
    return __getSafeAreaInsets();
  }

  getStatusBarHeight(): number {
    return __getStatusBarHeight();
  }

  requestAnimationFrame(callback: (timestamp: number) => void): number {
    return __skiaRequestFrame(callback);
  }

  cancelAnimationFrame(id: number): void {
    __skiaCancelFrame(id);
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _adapter: PlatformAdapter | null = null;

/**
 * Set the platform adapter. Called once during app initialization.
 *
 * @param adapter - The platform adapter to use (default: JSIPlatformAdapter)
 */
export function setPlatformAdapter(adapter: PlatformAdapter): void {
  _adapter = adapter;
}

/**
 * Get the current platform adapter.
 * Throws if not yet initialized.
 */
export function getPlatformAdapter(): PlatformAdapter {
  if (!_adapter) {
    throw new Error(
      "PlatformAdapter not initialized. Call setPlatformAdapter() first.",
    );
  }
  return _adapter;
}

/**
 * Reset the adapter (for testing purposes).
 * @internal
 */
export function _resetPlatformAdapter(): void {
  _adapter = null;
}
