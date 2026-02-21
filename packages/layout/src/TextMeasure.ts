/**
 * TextMeasure.ts — Text measurement interface for Yoga.
 *
 * Yoga needs a custom measure function for leaf text nodes to determine
 * their intrinsic size. The actual measurement is platform-specific:
 * - Production: Skia Paragraph API
 * - Testing: stub / mock
 *
 * This module provides the registration mechanism and a default stub.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Yoga measure mode — how constraints are applied. */
export const enum MeasureMode {
  Undefined = 0,
  Exactly = 1,
  AtMost = 2,
}

/** Result of a text measurement. */
export interface MeasureResult {
  width: number;
  height: number;
}

/**
 * Text measure function signature.
 *
 * Called by Yoga during layout to determine the intrinsic size of a
 * text node given available constraints.
 *
 * @param text - The text content to measure
 * @param fontSize - Font size in logical pixels
 * @param fontFamily - Font family name
 * @param fontWeight - Font weight string
 * @param maxWidth - Available width constraint
 * @param widthMode - How the width constraint is applied
 * @param maxHeight - Available height constraint
 * @param heightMode - How the height constraint is applied
 * @param lineHeight - Optional line height multiplier
 * @param maxLines - Optional max lines for truncation
 */
export type TextMeasureFunc = (
  text: string,
  fontSize: number,
  fontFamily: string | undefined,
  fontWeight: string | undefined,
  maxWidth: number,
  widthMode: MeasureMode,
  maxHeight: number,
  heightMode: MeasureMode,
  lineHeight?: number,
  maxLines?: number,
) => MeasureResult;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** Default stub — returns 0×0. Use in tests or before Skia is available. */
const defaultMeasurer: TextMeasureFunc = () => ({ width: 0, height: 0 });

let _measurer: TextMeasureFunc = defaultMeasurer;

/**
 * Register a platform-specific text measurer.
 *
 * In production, this is called once during app startup with a function
 * that uses Skia's Paragraph API to measure text.
 *
 * @example
 * ```ts
 * import { setTextMeasurer } from '@zilol-native/layout';
 *
 * setTextMeasurer((text, fontSize, ...) => {
 *   const paragraph = buildParagraph(text, fontSize, ...);
 *   paragraph.layout(maxWidth);
 *   return { width: paragraph.getMaxIntrinsicWidth(), height: paragraph.getHeight() };
 * });
 * ```
 */
export function setTextMeasurer(fn: TextMeasureFunc): void {
  _measurer = fn;
}

/**
 * Get the currently registered text measurer.
 * Returns the default stub if none has been registered.
 */
export function getTextMeasurer(): TextMeasureFunc {
  return _measurer;
}

/**
 * Reset the text measurer to the default stub.
 * For testing only.
 */
export function _resetTextMeasurer(): void {
  _measurer = defaultMeasurer;
}
