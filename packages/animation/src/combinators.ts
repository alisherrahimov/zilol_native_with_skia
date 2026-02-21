/**
 * combinators.ts — Compose animations using callbacks (no async/await).
 *
 * All combinators use the AnimationHandle.onFinish() callback pattern
 * to avoid Hermes fiber/Promise crashes.
 */

import type { AnimationHandle } from "./animate";

// ---------------------------------------------------------------------------
// sequence
// ---------------------------------------------------------------------------

/**
 * Run animation functions one after another.
 *
 * @example
 * ```ts
 * sequence([
 *   () => animate(opacity, withTiming(1)),
 *   () => delay(200),
 *   () => animate(y, withSpring(0)),
 * ]);
 * ```
 */
export function sequence(fns: (() => AnimationHandle)[]): AnimationHandle {
  let currentHandle: AnimationHandle | null = null;
  let index = 0;
  let cancelled = false;
  const finishCallbacks: ((completed: boolean) => void)[] = [];

  function runNext() {
    if (cancelled) return;
    if (index >= fns.length) {
      // All done
      for (const cb of finishCallbacks) cb(true);
      return;
    }

    currentHandle = fns[index++]();
    currentHandle.onFinish((completed) => {
      if (!completed || cancelled) {
        for (const cb of finishCallbacks) cb(false);
        return;
      }
      runNext();
    });
  }

  runNext();

  const handle: AnimationHandle = {
    cancel() {
      if (cancelled) return;
      cancelled = true;
      currentHandle?.cancel();
      for (const cb of finishCallbacks) cb(false);
    },
    onFinish(cb) {
      finishCallbacks.push(cb);
      return handle;
    },
  };

  return handle;
}

// ---------------------------------------------------------------------------
// parallel
// ---------------------------------------------------------------------------

/**
 * Run animation functions simultaneously.
 * Completes when ALL animations finish.
 *
 * @example
 * ```ts
 * parallel([
 *   () => animate(opacity, withTiming(1)),
 *   () => animate(y, withSpring(0)),
 * ]);
 * ```
 */
export function parallel(fns: (() => AnimationHandle)[]): AnimationHandle {
  let cancelled = false;
  let completedCount = 0;
  let allSucceeded = true;
  const handles: AnimationHandle[] = [];
  const finishCallbacks: ((completed: boolean) => void)[] = [];

  for (const fn of fns) {
    const h = fn();
    handles.push(h);
    h.onFinish((completed) => {
      if (!completed) allSucceeded = false;
      completedCount++;
      if (completedCount >= fns.length) {
        for (const cb of finishCallbacks) cb(allSucceeded && !cancelled);
      }
    });
  }

  const handle: AnimationHandle = {
    cancel() {
      if (cancelled) return;
      cancelled = true;
      for (const h of handles) h.cancel();
    },
    onFinish(cb) {
      finishCallbacks.push(cb);
      // If already done (e.g. empty array)
      if (completedCount >= fns.length) cb(allSucceeded);
      return handle;
    },
  };

  return handle;
}

// ---------------------------------------------------------------------------
// delay
// ---------------------------------------------------------------------------

/**
 * Wait for a specified duration. Returns an AnimationHandle.
 *
 * @param ms Duration in milliseconds.
 */
export function delay(ms: number): AnimationHandle {
  let cancelled = false;
  let startTime = 0;
  const finishCallbacks: ((completed: boolean) => void)[] = [];

  const loop = (timestamp: number) => {
    if (cancelled) return;
    if (startTime === 0) startTime = timestamp;

    if (timestamp - startTime >= ms) {
      for (const cb of finishCallbacks) cb(true);
      return;
    }

    (globalThis as any).__skiaRequestFrame(loop);
  };

  (globalThis as any).__skiaRequestFrame(loop);

  const handle: AnimationHandle = {
    cancel() {
      if (cancelled) return;
      cancelled = true;
      for (const cb of finishCallbacks) cb(false);
    },
    onFinish(cb) {
      finishCallbacks.push(cb);
      return handle;
    },
  };

  return handle;
}

// ---------------------------------------------------------------------------
// loop
// ---------------------------------------------------------------------------

/**
 * Repeat an animation a specified number of times (or infinitely).
 *
 * @param fn    Function that starts the animation.
 * @param count Number of repetitions. -1 = infinite. Default: -1.
 */
export function loop(
  fn: () => AnimationHandle,
  count: number = -1,
): AnimationHandle {
  let cancelled = false;
  let currentHandle: AnimationHandle | null = null;
  let iteration = 0;
  const finishCallbacks: ((completed: boolean) => void)[] = [];

  function runIteration() {
    if (cancelled) return;
    if (count !== -1 && iteration >= count) {
      for (const cb of finishCallbacks) cb(true);
      return;
    }

    iteration++;
    currentHandle = fn();
    currentHandle.onFinish((completed) => {
      if (!completed || cancelled) {
        for (const cb of finishCallbacks) cb(false);
        return;
      }
      runIteration();
    });
  }

  runIteration();

  const handle: AnimationHandle = {
    cancel() {
      if (cancelled) return;
      cancelled = true;
      currentHandle?.cancel();
    },
    onFinish(cb) {
      finishCallbacks.push(cb);
      return handle;
    },
  };

  return handle;
}
