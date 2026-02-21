/**
 * decay.ts — Momentum-based deceleration driver.
 *
 * No target value — the animation decelerates from the current velocity
 * until it stops. Useful for fling gestures.
 *
 * Uses exponential decay: v(t) = v₀ × rate^t
 */

import type { AnimationDriver } from "./timing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DecayConfig {
  /** Initial velocity in units/sec. Default: 0. */
  velocity?: number;
  /** Deceleration rate (0–1). Higher = slower deceleration. Default: 0.998. */
  deceleration?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VELOCITY_THRESHOLD = 0.1; // units/sec

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/**
 * Create a decay (momentum) animation driver.
 *
 * @param config Velocity and deceleration rate.
 *
 * @example
 * ```ts
 * // After a fling gesture:
 * animate(scrollX, withDecay({ velocity: gestureVelocity }));
 * ```
 */
export function withDecay(config?: DecayConfig): AnimationDriver {
  const deceleration = config?.deceleration ?? 0.998;
  const initialVelocity = config?.velocity ?? 0;

  let position = 0;
  let velocity = initialVelocity;

  return {
    init(from: number) {
      position = from;
      velocity = initialVelocity;
    },

    step(_elapsed: number, dt: number): { value: number; finished: boolean } {
      const dtSec = dt / 1000;
      if (dtSec <= 0) return { value: position, finished: false };

      // Exponential decay per frame
      const friction = Math.pow(deceleration, dt);
      velocity *= friction;

      // Integrate position
      position += velocity * dtSec;

      // Check if stopped
      if (Math.abs(velocity) < VELOCITY_THRESHOLD) {
        return { value: position, finished: true };
      }

      return { value: position, finished: false };
    },
  };
}
