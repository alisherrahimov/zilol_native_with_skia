/**
 * style.ts — Style normalization utilities.
 *
 * Handles shorthand expansion (padding → paddingTop/Right/Bottom/Left)
 * and style merging.
 */

import type { SkiaNodeProps } from "../core/types";

// ---------------------------------------------------------------------------
// Shorthand expansion
// ---------------------------------------------------------------------------

/** Style props that can be set by the developer. */
export type StyleProps = Partial<SkiaNodeProps>;

/**
 * Normalize a style object by expanding shorthands.
 *
 * Expansion rules:
 * - `padding` → `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`
 * - `paddingHorizontal` → `paddingLeft`, `paddingRight`
 * - `paddingVertical` → `paddingTop`, `paddingBottom`
 * - Same for `margin` / `marginHorizontal` / `marginVertical`
 *
 * More-specific values override less-specific ones:
 * `{ padding: 10, paddingTop: 20 }` → paddingTop=20, rest=10
 */
export function normalizeStyle(style: StyleProps): StyleProps {
  const result: StyleProps = { ...style };

  // --- Padding shorthands ---
  if (result.padding !== undefined) {
    const v = result.padding as number;
    result.paddingTop = result.paddingTop ?? v;
    result.paddingRight = result.paddingRight ?? v;
    result.paddingBottom = result.paddingBottom ?? v;
    result.paddingLeft = result.paddingLeft ?? v;
    delete result.padding;
  }

  if (result.paddingHorizontal !== undefined) {
    const v = result.paddingHorizontal as number;
    result.paddingLeft = result.paddingLeft ?? v;
    result.paddingRight = result.paddingRight ?? v;
    delete result.paddingHorizontal;
  }

  if (result.paddingVertical !== undefined) {
    const v = result.paddingVertical as number;
    result.paddingTop = result.paddingTop ?? v;
    result.paddingBottom = result.paddingBottom ?? v;
    delete result.paddingVertical;
  }

  // --- Margin shorthands ---
  if (result.margin !== undefined) {
    const v = result.margin as number;
    result.marginTop = result.marginTop ?? v;
    result.marginRight = result.marginRight ?? v;
    result.marginBottom = result.marginBottom ?? v;
    result.marginLeft = result.marginLeft ?? v;
    delete result.margin;
  }

  if (result.marginHorizontal !== undefined) {
    const v = result.marginHorizontal as number;
    result.marginLeft = result.marginLeft ?? v;
    result.marginRight = result.marginRight ?? v;
    delete result.marginHorizontal;
  }

  if (result.marginVertical !== undefined) {
    const v = result.marginVertical as number;
    result.marginTop = result.marginTop ?? v;
    result.marginBottom = result.marginBottom ?? v;
    delete result.marginVertical;
  }

  return result;
}

/**
 * Merge multiple style objects. Later values override earlier ones.
 *
 * @example
 * ```ts
 * const base = { padding: 10, backgroundColor: '#FFF' };
 * const override = { backgroundColor: '#000' };
 * const merged = mergeStyles(base, override);
 * // → { padding: 10, backgroundColor: '#000' }
 * ```
 */
export function mergeStyles(
  ...styles: Array<StyleProps | undefined>
): StyleProps {
  const result: StyleProps = {};
  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    if (style === undefined) continue;
    Object.assign(result, style);
  }
  return result;
}
