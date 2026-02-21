/**
 * PaintCache.ts — Reusable paint object cache.
 *
 * Avoids creating new SkPaint objects every frame by caching
 * them by color + style key.
 */

import type { SkPaint, PaintStyle } from "../types";

// ---------------------------------------------------------------------------
// Paint Factory
// ---------------------------------------------------------------------------

/** Function that creates a new SkPaint instance. Platform-provided. */
export type PaintFactory = () => SkPaint;

let _factory: PaintFactory | null = null;

/**
 * Register the SkPaint factory.
 * Called once during app startup by the platform layer.
 */
export function setPaintFactory(factory: PaintFactory): void {
  _factory = factory;
}

// ---------------------------------------------------------------------------
// PaintCache
// ---------------------------------------------------------------------------

export class PaintCache {
  private readonly _cache: Map<string, SkPaint> = new Map();

  /**
   * Get or create a paint for the given color and style.
   *
   * @param color - CSS color string
   * @param style - "fill" or "stroke"
   * @param strokeWidth - stroke width (only if style is "stroke")
   * @returns Cached SkPaint instance
   */
  get(
    color: string,
    style: PaintStyle = "fill",
    strokeWidth: number = 0,
  ): SkPaint | null {
    if (!_factory) return null;

    const key = `${color}:${style}:${strokeWidth}`;
    let paint = this._cache.get(key);

    if (!paint) {
      paint = _factory();
      paint.setColor(color);
      paint.setStyle(style);
      if (style === "stroke" && strokeWidth > 0) {
        paint.setStrokeWidth(strokeWidth);
      }
      this._cache.set(key, paint);
    }

    return paint;
  }

  /** Clear the cache. Call on memory pressure or scene change. */
  clear(): void {
    this._cache.clear();
  }

  /** Number of cached paints. */
  get size(): number {
    return this._cache.size;
  }
}

/** Singleton paint cache. */
export const paintCache = new PaintCache();
