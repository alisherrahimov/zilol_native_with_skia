/**
 * ActivityIndicator — Spinning loading indicator component.
 *
 * Renders a spinning arc drawn via Skia, animated with
 * `__skiaRequestFrame` for smooth 60fps rotation.
 *
 * @example
 * ```ts
 * import { ActivityIndicator } from '@zilol-native/components';
 *
 * // Default white spinner
 * ActivityIndicator();
 *
 * // Custom color and size
 * ActivityIndicator()
 *   .color('#3B82F6')
 *   .indicatorSize('large');
 *
 * // Stop spinning
 * ActivityIndicator()
 *   .animating(false)
 *   .hidesWhenStopped(true);
 * ```
 */

import { createActivityIndicatorNode } from "@zilol-native/nodes";
import { effect } from "@zilol-native/runtime";
import type { SkiaNode } from "@zilol-native/nodes";
import { ComponentBase } from "./ComponentBase";

type Val<T> = T | (() => T);

function setProp(node: SkiaNode, key: string, value: unknown): void {
  if (typeof value === "function") {
    const accessor = value as () => unknown;
    effect(() => {
      node.setProp(key as any, accessor());
    });
  } else {
    node.setProp(key as any, value);
  }
}

// ---------------------------------------------------------------------------
// ActivityIndicatorBuilder
// ---------------------------------------------------------------------------

export class ActivityIndicatorBuilder extends ComponentBase {
  readonly node: SkiaNode;
  private _frameId: number = 0;
  private _isAnimating: boolean = true;

  constructor() {
    super();
    this.node = createActivityIndicatorNode();
    this.node.props.color = "#FFFFFF";
    this.node.props._rotationAngle = 0;

    // Start the animation loop
    this._startAnimation();
  }

  /**
   * Set the spinner color.
   * Accepts any CSS color string.
   */
  color(value: Val<string>): this {
    setProp(this.node, "color", value);
    return this;
  }

  /**
   * Set the spinner size.
   * - `'small'` = 20px
   * - `'large'` = 36px
   * - number = custom px
   */
  indicatorSize(value: Val<"small" | "large" | number>): this {
    if (typeof value === "function") {
      const accessor = value as () => "small" | "large" | number;
      effect(() => {
        const v = accessor();
        const px = v === "small" ? 20 : v === "large" ? 36 : v;
        this.node.setProp("width" as any, px);
        this.node.setProp("height" as any, px);
      });
    } else {
      const px = value === "small" ? 20 : value === "large" ? 36 : value;
      this.node.setProp("width" as any, px);
      this.node.setProp("height" as any, px);
    }
    return this;
  }

  /**
   * Start or stop the animation.
   * Default: `true` (spinning).
   */
  animating(value: boolean): this {
    this._isAnimating = value;
    if (value) {
      this._startAnimation();
    } else {
      this._stopAnimation();
    }
    return this;
  }

  /**
   * Hide the indicator when not animating.
   * Default: `true`.
   */
  hidesWhenStopped(value: Val<boolean>): this {
    setProp(this.node, "hidesWhenStopped", value);
    return this;
  }

  // -----------------------------------------------------------------------
  // Animation loop
  // -----------------------------------------------------------------------

  private _startAnimation(): void {
    if (this._frameId !== 0) return; // already running

    let lastTime = 0;
    const SPEED = 360; // degrees per second

    const loop = (timestamp: number) => {
      if (!this._isAnimating) {
        this._frameId = 0;
        return;
      }

      if (lastTime > 0) {
        const dt = (timestamp - lastTime) / 1000; // seconds
        const current = (this.node.props._rotationAngle as number) ?? 0;
        this.node.setProp(
          "_rotationAngle" as any,
          (current + SPEED * dt) % 360,
        );
      }
      lastTime = timestamp;

      this._frameId = (globalThis as any).__skiaRequestFrame(loop);
    };

    this._frameId = (globalThis as any).__skiaRequestFrame(loop);
  }

  private _stopAnimation(): void {
    if (this._frameId !== 0) {
      (globalThis as any).__skiaCancelFrame?.(this._frameId);
      this._frameId = 0;
    }
    // Optionally hide
    if (this.node.props.hidesWhenStopped !== false) {
      this.node.setProp("visible" as any, false);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a spinning activity indicator.
 *
 * @example
 * ```ts
 * // Default white spinner (36px)
 * ActivityIndicator();
 *
 * // Blue spinner, large
 * ActivityIndicator().color('#3B82F6').indicatorSize('large');
 *
 * // Small muted spinner
 * ActivityIndicator().color('#64748B').indicatorSize('small');
 * ```
 */
export function ActivityIndicator(): ActivityIndicatorBuilder {
  return new ActivityIndicatorBuilder();
}
