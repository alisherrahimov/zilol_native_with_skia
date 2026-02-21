/**
 * ShadowFactory.ts — Drop shadow image filter creation.
 *
 * Creates Skia image filter objects for drop shadows from ShadowProps.
 * The actual image filter creation is platform-specific so we define
 * the interface here.
 */

import type { SkImageFilter } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shadow parameters matching SkiaNodeProps.shadow. */
export interface ShadowParams {
  color: string;
  offsetX: number;
  offsetY: number;
  blurRadius: number;
}

/** Function that creates a Skia image filter from shadow params. */
export type ShadowFilterFactory = (params: ShadowParams) => SkImageFilter;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

let _factory: ShadowFilterFactory | null = null;

/**
 * Register the shadow filter factory.
 * Called once during app startup by the platform layer.
 */
export function setShadowFilterFactory(factory: ShadowFilterFactory): void {
  _factory = factory;
}

/**
 * Create a shadow image filter from params.
 * Returns null if no factory is registered (testing/pre-init).
 */
export function createShadowFilter(params: ShadowParams): SkImageFilter | null {
  if (!_factory) return null;
  return _factory(params);
}

/**
 * Reset the factory to null. For testing only.
 */
export function _resetShadowFactory(): void {
  _factory = null;
}
