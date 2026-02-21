/**
 * @module scroll
 *
 * Scroll gesture handling for Zilol Native.
 *
 * Provides physics-based scrolling with:
 *  - Deceleration (friction-based fling)
 *  - Rubber-band (elastic overscroll)
 *  - Bounce-back (spring to boundary)
 *  - Snap-to-interval
 *  - Paging
 *  - Velocity tracking
 */

export { ScrollController } from "./ScrollController";
export type { ScrollOffset } from "./ScrollController";

export { VelocityTracker } from "./VelocityTracker";

export {
  // Physics functions
  decelerationStep,
  springStep,
  rubberBandClamp,
  findSnapTarget,
  findPageTarget,
  clamp,
  resolveDecelerationRate,

  // Constants
  DECELERATION_RATE_NORMAL,
  DECELERATION_RATE_FAST,
  VELOCITY_THRESHOLD,
  MAX_RUBBER_BAND,
  RUBBER_BAND_COEFF,
} from "./ScrollPhysics";

export type { DecelerationState, SpringState } from "./ScrollPhysics";
