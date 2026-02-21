/**
 * spring.ts — Physics-based spring animation driver.
 *
 * Models a critically/under-damped spring. The mass-spring-damper system:
 *   F = -stiffness × displacement - damping × velocity
 *
 * Settles when both displacement and velocity are below threshold.
 */

import type { AnimationDriver } from "./timing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpringConfig {
  /** Damping coefficient (friction). Higher = less bouncy. Default: 15. */
  damping?: number;
  /** Spring stiffness (tension). Higher = faster. Default: 120. */
  stiffness?: number;
  /** Mass of the object. Higher = slower. Default: 1. */
  mass?: number;
  /** Initial velocity in units/sec. Default: 0. */
  velocity?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SETTLE_DISPLACEMENT = 0.01;
const SETTLE_VELOCITY = 0.01;
const MAX_DURATION_MS = 10_000; // safety cap

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/**
 * Create a spring-based animation driver.
 *
 * @param toValue Target value.
 * @param config  Spring parameters.
 *
 * @example
 * ```ts
 * animate(scale, withSpring(1, { damping: 10, stiffness: 100 }));
 * ```
 */
export function withSpring(
  toValue: number,
  config?: SpringConfig,
): AnimationDriver {
  const damping = config?.damping ?? 15;
  const stiffness = config?.stiffness ?? 120;
  const mass = config?.mass ?? 1;
  const initialVelocity = config?.velocity ?? 0;

  let position = 0;
  let velocity = initialVelocity;
  let lastElapsed = 0;

  return {
    init(from: number) {
      position = from;
      velocity = initialVelocity;
      lastElapsed = 0;
    },

    step(elapsed: number, dt: number): { value: number; finished: boolean } {
      // Safety: cap duration
      if (elapsed > MAX_DURATION_MS) {
        return { value: toValue, finished: true };
      }

      // Convert dt to seconds for physics
      const dtSec = dt / 1000;
      if (dtSec <= 0) return { value: position, finished: false };

      // Displacement from target
      const displacement = position - toValue;

      // Spring force: F = -k × x
      const springForce = -stiffness * displacement;

      // Damping force: F = -c × v
      const dampingForce = -damping * velocity;

      // Acceleration = F / m
      const acceleration = (springForce + dampingForce) / mass;

      // Semi-implicit Euler integration
      velocity += acceleration * dtSec;
      position += velocity * dtSec;

      // Check if settled
      const settled =
        Math.abs(position - toValue) < SETTLE_DISPLACEMENT &&
        Math.abs(velocity) < SETTLE_VELOCITY;

      if (settled) {
        return { value: toValue, finished: true };
      }

      lastElapsed = elapsed;
      return { value: position, finished: false };
    },
  };
}
