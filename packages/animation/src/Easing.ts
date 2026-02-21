/**
 * Easing.ts — Standard easing functions for animations.
 *
 * Each function maps a normalized time `t` (0→1) to a progress value.
 * All functions satisfy: f(0) = 0, f(1) = 1.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A function that maps normalized time [0,1] → progress [0,1]. */
export type EasingFunction = (t: number) => number;

// ---------------------------------------------------------------------------
// Standard Easings
// ---------------------------------------------------------------------------

/** No easing — constant velocity. */
export const linear: EasingFunction = (t) => t;

/** Accelerate from zero velocity. */
export const easeIn: EasingFunction = (t) => t * t;

/** Decelerate to zero velocity. */
export const easeOut: EasingFunction = (t) => t * (2 - t);

/** Accelerate then decelerate. */
export const easeInOut: EasingFunction = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// ---------------------------------------------------------------------------
// Cubic Easings (iOS-style)
// ---------------------------------------------------------------------------

/** Cubic ease in. */
export const easeInCubic: EasingFunction = (t) => t * t * t;

/** Cubic ease out. */
export const easeOutCubic: EasingFunction = (t) => {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
};

/** Cubic ease in-out. */
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// ---------------------------------------------------------------------------
// Cubic Bezier
// ---------------------------------------------------------------------------

/**
 * Create a cubic bezier easing (CSS transition-timing-function style).
 *
 * @param x1 Control point 1 X
 * @param y1 Control point 1 Y
 * @param x2 Control point 2 X
 * @param y2 Control point 2 Y
 *
 * @example
 * ```ts
 * const iosDefault = bezier(0.25, 0.1, 0.25, 1.0);
 * animate(opacity, withTiming(1, { easing: iosDefault }));
 * ```
 */
export function bezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): EasingFunction {
  // Newton-Raphson iteration to solve for t given x
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Binary search with Newton refinement
    let lo = 0;
    let hi = 1;
    let t = x;

    for (let i = 0; i < 20; i++) {
      const bx = cubicBezierSample(t, x1, x2);
      const diff = bx - x;

      if (Math.abs(diff) < 1e-6) break;

      if (diff > 0) {
        hi = t;
      } else {
        lo = t;
      }

      // Newton step on the derivative
      const dx = cubicBezierDerivative(t, x1, x2);
      if (Math.abs(dx) > 1e-6) {
        t = t - diff / dx;
        t = Math.max(lo, Math.min(hi, t));
      } else {
        t = (lo + hi) * 0.5;
      }
    }

    return cubicBezierSample(t, y1, y2);
  };
}

function cubicBezierSample(t: number, p1: number, p2: number): number {
  // B(t) = 3(1-t)²t·p1 + 3(1-t)t²·p2 + t³
  return 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
}

function cubicBezierDerivative(t: number, p1: number, p2: number): number {
  return (
    3 * (1 - t) * (1 - t) * p1 +
    6 * (1 - t) * t * (p2 - p1) +
    3 * t * t * (1 - p2)
  );
}

// ---------------------------------------------------------------------------
// Expressive Easings
// ---------------------------------------------------------------------------

/** Overshoot then settle — like pulling a rubber band. */
export function back(overshoot: number = 1.70158): EasingFunction {
  return (t) => t * t * ((overshoot + 1) * t - overshoot);
}

/** Elastic spring-like bounce at the end. */
export function elastic(bounciness: number = 1): EasingFunction {
  const p = 0.3 / bounciness;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return (
      Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1
    );
  };
}

/** Bouncing ball effect. */
export const bounce: EasingFunction = (t) => {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    const t2 = t - 1.5 / 2.75;
    return 7.5625 * t2 * t2 + 0.75;
  } else if (t < 2.5 / 2.75) {
    const t2 = t - 2.25 / 2.75;
    return 7.5625 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / 2.75;
    return 7.5625 * t2 * t2 + 0.984375;
  }
};

// ---------------------------------------------------------------------------
// Re-export as namespace-like object for convenience
// ---------------------------------------------------------------------------

export const Easing = {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  bezier,
  back,
  elastic,
  bounce,
} as const;
