/**
 * animate.ts — Core animation function.
 *
 * Drives any Signal<number> by running a __skiaRequestFrame loop
 * that calls driver.step() each frame and sets signal.value.
 *
 * Uses callbacks instead of async/await to avoid Hermes fiber crashes.
 */

import type { Signal } from "@zilol-native/runtime";
import type { AnimationDriver } from "./drivers/timing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Handle returned by animate() for control and completion. */
export interface AnimationHandle {
  /** Cancel the running animation. */
  cancel: () => void;
  /** Called when the animation finishes. `true` = completed, `false` = cancelled. */
  onFinish: (cb: (completed: boolean) => void) => AnimationHandle;
}

// ---------------------------------------------------------------------------
// Active animation tracking
// ---------------------------------------------------------------------------

const activeAnimations = new WeakMap<object, () => void>();

// ---------------------------------------------------------------------------
// animate
// ---------------------------------------------------------------------------

/**
 * Animate a signal's value using an animation driver.
 *
 * If the signal already has a running animation, it is cancelled first.
 *
 * @param target   The signal to animate.
 * @param driver   The animation driver (withTiming, withSpring, withDecay).
 * @param onDone   Optional callback when animation completes.
 * @returns An AnimationHandle with `.cancel()` and `.onFinish()`.
 *
 * @example
 * ```ts
 * const opacity = signal(0);
 * animate(opacity, withTiming(1), () => console.log('done'));
 *
 * // Or chainable:
 * animate(opacity, withTiming(1)).onFinish(() => {
 *   animate(y, withSpring(0));
 * });
 * ```
 */
export function animate(
  target: Signal<number>,
  driver: AnimationDriver,
  onDone?: (completed: boolean) => void,
): AnimationHandle {
  // Cancel any existing animation on this signal
  const existingCancel = activeAnimations.get(target as any);
  if (existingCancel) existingCancel();

  // Initialize driver with current value
  const fromValue = target.peek();
  driver.init(fromValue);

  let frameId = 0;
  let cancelled = false;
  let startTime = 0;
  let lastTime = 0;
  const finishCallbacks: ((completed: boolean) => void)[] = [];

  if (onDone) finishCallbacks.push(onDone);

  function notifyDone(completed: boolean) {
    for (let i = 0; i < finishCallbacks.length; i++) {
      finishCallbacks[i](completed);
    }
  }

  const loop = (timestamp: number) => {
    if (cancelled) return;

    if (startTime === 0) {
      startTime = timestamp;
      lastTime = timestamp;
    }

    const elapsed = timestamp - startTime;
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    const result = driver.step(elapsed, dt);
    target.value = result.value;

    if (result.finished) {
      activeAnimations.delete(target as any);
      notifyDone(true);
      return;
    }

    frameId = (globalThis as any).__skiaRequestFrame(loop);
  };

  frameId = (globalThis as any).__skiaRequestFrame(loop);

  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    activeAnimations.delete(target as any);
    notifyDone(false);
  };

  activeAnimations.set(target as any, cancel);

  const handle: AnimationHandle = {
    cancel,
    onFinish(cb: (completed: boolean) => void): AnimationHandle {
      finishCallbacks.push(cb);
      return handle;
    },
  };

  return handle;
}
