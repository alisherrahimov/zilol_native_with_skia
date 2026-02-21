/**
 * timing.ts — Duration-based animation driver.
 *
 * Interpolates from the signal's current value to a target value
 * over a fixed duration using an easing function.
 */

import type { EasingFunction } from "../Easing";
import { easeInOut } from "../Easing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimingConfig {
  /** Duration in milliseconds. Default: 300. */
  duration?: number;
  /** Easing function. Default: easeInOut. */
  easing?: EasingFunction;
}

export interface AnimationDriver {
  /** Initialize the driver with the starting value. */
  init(fromValue: number): void;
  /**
   * Advance one frame.
   *
   * @param elapsed Total elapsed time in ms since animation start.
   * @param dt      Delta time in ms since last frame.
   * @returns { value, finished }
   */
  step(elapsed: number, dt: number): { value: number; finished: boolean };
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/**
 * Create a timing-based animation driver.
 *
 * @param toValue Target value.
 * @param config  Optional duration and easing.
 *
 * @example
 * ```ts
 * animate(opacity, withTiming(1, { duration: 300, easing: Easing.easeOut }));
 * ```
 */
export function withTiming(
  toValue: number,
  config?: TimingConfig,
): AnimationDriver {
  const duration = config?.duration ?? 300;
  const easing = config?.easing ?? easeInOut;

  let fromValue = 0;

  return {
    init(from: number) {
      fromValue = from;
    },

    step(elapsed: number): { value: number; finished: boolean } {
      if (duration <= 0) {
        return { value: toValue, finished: true };
      }

      const t = Math.min(elapsed / duration, 1);
      const progress = easing(t);
      const value = fromValue + (toValue - fromValue) * progress;

      return {
        value: t >= 1 ? toValue : value,
        finished: t >= 1,
      };
    },
  };
}
