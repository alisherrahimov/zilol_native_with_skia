/**
 * ScrollPhysics.ts — Pure math for scroll behavior.
 *
 * All functions are stateless and deterministic. They receive current
 * state and return the next state. No timers, no framework deps.
 *
 * Covers:
 *  - Deceleration (friction-based fling)
 *  - Rubber-band (elastic overscroll)
 *  - Bounce-back (critically-damped spring to boundary)
 *  - Snap (spring to nearest snap point)
 *  - Paging (snap to viewport multiples)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** iOS default deceleration rate (UIScrollView.DecelerationRate.normal). */
export const DECELERATION_RATE_NORMAL = 0.998;

/** Fast deceleration (UIScrollView.DecelerationRate.fast). */
export const DECELERATION_RATE_FAST = 0.99;

/** Velocity below this (px/ms) is considered stopped. */
export const VELOCITY_THRESHOLD = 0.05;

/** Maximum pixels of rubber-band stretch. */
export const MAX_RUBBER_BAND = 120;

/** Rubber-band damping coefficient — higher = stiffer. */
export const RUBBER_BAND_COEFF = 0.55;

/** Spring tension for bounce-back animation. */
const BOUNCE_TENSION = 250;

/** Spring friction for bounce-back (critically damped). */
const BOUNCE_FRICTION = 22;

/** Minimum spring displacement to consider settled (px). */
const SPRING_SETTLE_THRESHOLD = 0.5;

/** Minimum spring velocity to consider settled (px/ms). */
const SPRING_VELOCITY_THRESHOLD = 0.01;

// ---------------------------------------------------------------------------
// Deceleration
// ---------------------------------------------------------------------------

export interface DecelerationState {
  /** Current offset in px. */
  offset: number;
  /** Current velocity in px/ms. */
  velocity: number;
  /** Whether deceleration has settled. */
  finished: boolean;
}

/**
 * Advance deceleration by one time step.
 *
 * Uses exponential decay: v(t) = v₀ × rate^(dt).
 *
 * @param offset    Current scroll offset in px.
 * @param velocity  Current velocity in px/ms.
 * @param dt        Time delta in ms (typically 16.67 for 60fps).
 * @param rate      Deceleration rate (0…1), default NORMAL.
 * @param minOffset Minimum scroll (usually 0).
 * @param maxOffset Maximum scroll (contentSize - viewportSize).
 * @returns Next state.
 */
export function decelerationStep(
  offset: number,
  velocity: number,
  dt: number,
  rate: number,
  minOffset: number,
  maxOffset: number,
): DecelerationState {
  // Apply friction: exponential decay per millisecond
  const friction = Math.pow(rate, dt);
  const nextVelocity = velocity * friction;

  // Integrate position
  // Using average velocity over the step for better accuracy
  const avgVelocity = (velocity + nextVelocity) * 0.5;
  let nextOffset = offset + avgVelocity * dt;

  // Check if we've stopped
  if (Math.abs(nextVelocity) < VELOCITY_THRESHOLD) {
    // Clamp to bounds
    nextOffset = clamp(nextOffset, minOffset, maxOffset);
    return { offset: nextOffset, velocity: 0, finished: true };
  }

  // If we hit a boundary, transition to rubber-band
  if (nextOffset < minOffset || nextOffset > maxOffset) {
    return { offset: nextOffset, velocity: nextVelocity, finished: true };
  }

  return { offset: nextOffset, velocity: nextVelocity, finished: false };
}

// ---------------------------------------------------------------------------
// Rubber-Band (elastic overscroll)
// ---------------------------------------------------------------------------

/**
 * Apply rubber-band resistance to a scroll delta when overscrolling.
 *
 * Models iOS's rubber-band: the further past the boundary, the more
 * resistance. Uses the formula from UIScrollView:
 *
 *   dampedDelta = (1 - (1 / (distance / dim × coeff + 1))) × dim
 *
 * @param delta         Raw touch delta in px.
 * @param overscroll    Current distance past the boundary in px.
 * @param viewportSize  Viewport dimension (width or height).
 * @returns Dampened delta.
 */
export function rubberBandClamp(
  delta: number,
  overscroll: number,
  viewportSize: number,
): number {
  if (viewportSize <= 0) return 0;

  const absOverscroll = Math.abs(overscroll);
  const resistance =
    1 - 1 / ((absOverscroll / viewportSize) * RUBBER_BAND_COEFF + 1);
  const maxStretch = MAX_RUBBER_BAND;

  // Scale delta by how far we are from max stretch
  const stretchFactor = Math.max(0, 1 - absOverscroll / maxStretch);
  return delta * (1 - resistance) * stretchFactor;
}

// ---------------------------------------------------------------------------
// Bounce-Back Spring
// ---------------------------------------------------------------------------

export interface SpringState {
  /** Current offset in px. */
  offset: number;
  /** Current velocity in px/ms. */
  velocity: number;
  /** Whether the spring has settled. */
  finished: boolean;
}

/**
 * Advance a critically-damped spring by one time step.
 *
 * Used for bounce-back to boundary and snap-to-point.
 *
 * @param offset   Current position in px.
 * @param velocity Current velocity in px/ms.
 * @param target   Target position (the boundary or snap point).
 * @param dt       Time delta in ms.
 * @param tension  Spring tension (stiffness).
 * @param friction Spring friction (damping).
 * @returns Next state.
 */
export function springStep(
  offset: number,
  velocity: number,
  target: number,
  dt: number,
  tension: number = BOUNCE_TENSION,
  friction: number = BOUNCE_FRICTION,
): SpringState {
  // Convert dt to seconds for physics calculation
  const dtSec = dt / 1000;

  // Displacement from target
  const displacement = offset - target;

  // Spring force: F = -k × displacement
  const springForce = -tension * displacement;

  // Damping force: F = -c × velocity (velocity in px/s)
  const velocityPxPerSec = velocity * 1000;
  const dampingForce = -friction * velocityPxPerSec;

  // Acceleration = F / mass (mass = 1)
  const acceleration = springForce + dampingForce;

  // Integrate velocity (convert back to px/ms)
  const nextVelocityPxPerSec = velocityPxPerSec + acceleration * dtSec;
  const nextVelocity = nextVelocityPxPerSec / 1000;

  // Integrate position
  const nextOffset = offset + nextVelocity * dt;

  // Check if settled
  const settled =
    Math.abs(nextOffset - target) < SPRING_SETTLE_THRESHOLD &&
    Math.abs(nextVelocity) < SPRING_VELOCITY_THRESHOLD;

  if (settled) {
    return { offset: target, velocity: 0, finished: true };
  }

  return { offset: nextOffset, velocity: nextVelocity, finished: false };
}

// ---------------------------------------------------------------------------
// Snap
// ---------------------------------------------------------------------------

/**
 * Find the nearest snap point given a projected final offset.
 *
 * Projection estimates where deceleration would stop using:
 *   finalOffset ≈ offset + velocity / (1 - rate) × frameTime
 *
 * @param offset    Current offset.
 * @param velocity  Current velocity in px/ms.
 * @param interval  Snap interval in px.
 * @param minOffset Minimum scroll.
 * @param maxOffset Maximum scroll.
 * @param rate      Deceleration rate.
 * @returns Target snap offset.
 */
export function findSnapTarget(
  offset: number,
  velocity: number,
  interval: number,
  minOffset: number,
  maxOffset: number,
  rate: number = DECELERATION_RATE_NORMAL,
): number {
  if (interval <= 0) return clamp(offset, minOffset, maxOffset);

  // Project where we'd end up with deceleration
  // Using the closed-form: finalOffset = offset + velocity / ln(rate)
  // (since velocity decays as v₀ × rate^t, integral is v₀ / ln(rate))
  const lnRate = Math.log(rate);
  const projectedOffset =
    lnRate !== 0 ? offset + (velocity * 1000) / (-lnRate * 1000) : offset;

  // Snap to nearest interval
  const snapped = Math.round(projectedOffset / interval) * interval;

  return clamp(snapped, minOffset, maxOffset);
}

/**
 * Find the nearest page boundary for paging mode.
 *
 * @param offset       Current offset.
 * @param velocity     Current velocity in px/ms.
 * @param viewportSize Viewport dimension.
 * @param minOffset    Minimum scroll.
 * @param maxOffset    Maximum scroll.
 * @returns Target page offset.
 */
export function findPageTarget(
  offset: number,
  velocity: number,
  viewportSize: number,
  minOffset: number,
  maxOffset: number,
): number {
  if (viewportSize <= 0) return clamp(offset, minOffset, maxOffset);

  const currentPage = Math.round(offset / viewportSize);

  // If velocity is significant, go to next/previous page
  const velocityThreshold = 0.3; // px/ms
  let targetPage = currentPage;

  if (velocity > velocityThreshold) {
    targetPage = currentPage + 1;
  } else if (velocity < -velocityThreshold) {
    targetPage = currentPage - 1;
  }

  // Clamp to valid page range
  const maxPage = Math.ceil(maxOffset / viewportSize);
  targetPage = clamp(targetPage, 0, maxPage);

  return clamp(targetPage * viewportSize, minOffset, maxOffset);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Resolve a deceleration rate from prop value.
 */
export function resolveDecelerationRate(
  value: "normal" | "fast" | number | undefined,
): number {
  if (value === "fast") return DECELERATION_RATE_FAST;
  if (typeof value === "number") return value;
  return DECELERATION_RATE_NORMAL;
}
