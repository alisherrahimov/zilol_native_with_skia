/**
 * @zilol-native/gestures — Gesture recognition and scroll handling.
 *
 * This package provides:
 *  - Scroll physics (deceleration, rubber-band, bounce, snap, paging)
 *  - Velocity tracking
 *  - ScrollController for touch-driven scrolling
 *
 * Future modules (arena, hit, recognizers) will be added here.
 */

export {
  ScrollController,
  VelocityTracker,
  decelerationStep,
  springStep,
  rubberBandClamp,
  findSnapTarget,
  findPageTarget,
  clamp,
  resolveDecelerationRate,
  DECELERATION_RATE_NORMAL,
  DECELERATION_RATE_FAST,
  VELOCITY_THRESHOLD,
  MAX_RUBBER_BAND,
  RUBBER_BAND_COEFF,
} from "./scroll/index";

export type {
  ScrollOffset,
  DecelerationState,
  SpringState,
} from "./scroll/index";
