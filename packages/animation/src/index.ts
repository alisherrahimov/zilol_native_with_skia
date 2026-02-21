/**
 * @zilol-native/animation — Signal-driven animation system.
 *
 * Animate any Signal<number> using timing, spring, or decay drivers.
 * All animations run via __skiaRequestFrame for 60fps Metal-synced updates.
 * Uses callbacks (not Promises/async-await) for Hermes compatibility.
 *
 * @example
 * ```ts
 * import { signal } from '@zilol-native/runtime';
 * import { animate, withTiming, withSpring, Easing } from '@zilol-native/animation';
 *
 * const opacity = signal(0);
 * animate(opacity, withTiming(1, { duration: 300, easing: Easing.easeOut }));
 * ```
 */

// Core
export { animate } from "./animate";
export type { AnimationHandle } from "./animate";

// Drivers
export { withTiming } from "./drivers/timing";
export type { TimingConfig, AnimationDriver } from "./drivers/timing";
export { withSpring } from "./drivers/spring";
export type { SpringConfig } from "./drivers/spring";
export { withDecay } from "./drivers/decay";
export type { DecayConfig } from "./drivers/decay";

// Easing
export {
  Easing,
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
} from "./Easing";
export type { EasingFunction } from "./Easing";

// Combinators
export { sequence, parallel, delay, loop } from "./combinators";
