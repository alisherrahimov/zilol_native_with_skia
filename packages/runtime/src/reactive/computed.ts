/**
 * computed() — Derived reactive value.
 *
 * Lazy: only recalculates when read AND dependencies have changed.
 * Cached: returns the same value if dependencies haven't changed.
 * Glitch-free: never exposes intermediate/stale values.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const doubled = computed(() => count.value * 2);
 * doubled.value; // 0
 * count.value = 5;
 * doubled.value; // 10
 * ```
 */

import {
  type ReactiveNode,
  type Subscriber,
  type Disposer,
  nextReactiveId,
  trackDependency,
  getCurrentSubscriber,
  setCurrentSubscriber,
  unlinkSubscriber,
  queueNotification,
} from "./graph";
import type { ReadonlySignal } from "./signal";

// ---------------------------------------------------------------------------
// State enum (bitwise for performance)
// ---------------------------------------------------------------------------

const enum ComputedState {
  /** Value is current, no dependencies changed. */
  Clean = 0,
  /** A dependency MAY have changed — needs recheck. */
  MaybeDirty = 1,
  /** Definitely needs recalculation. */
  Dirty = 2,
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class ComputedImpl<T> implements ReadonlySignal<T>, ReactiveNode, Subscriber {
  readonly id: number;
  readonly subscribers = new Set<Subscriber>();
  readonly dependencies = new Set<ReactiveNode>();

  private _value: T | undefined = undefined;
  private _state: ComputedState = ComputedState.Dirty;
  private readonly _fn: () => T;
  private readonly _equals: (a: T, b: T) => boolean;
  private _disposed = false;
  private _valueChanged = false;

  /** Manual subscriptions. */
  private _manualSubs: Set<(value: T) => void> | null = null;

  constructor(fn: () => T, equals?: (a: T, b: T) => boolean) {
    this.id = nextReactiveId();
    this._fn = fn;
    this._equals = equals ?? Object.is;
  }

  // --- ReactiveNode / Signal interface ------------------------------------

  get value(): T {
    if (this._disposed) {
      return this._value as T;
    }

    // Recalculate if dirty
    this._updateIfNeeded();

    // Track this computed as a dependency of whoever is reading us
    trackDependency(this);

    return this._value as T;
  }

  peek(): T {
    if (this._disposed) {
      return this._value as T;
    }
    this._updateIfNeeded();
    return this._value as T;
  }

  subscribe(fn: (value: T) => void): Disposer {
    if (this._manualSubs === null) {
      this._manualSubs = new Set();
    }
    this._manualSubs.add(fn);
    return () => {
      this._manualSubs?.delete(fn);
    };
  }

  // --- Subscriber interface -----------------------------------------------

  notify(): void {
    if (this._disposed) return;

    const prevState = this._state;
    this._state = ComputedState.MaybeDirty;

    // Only propagate if we were clean — avoids redundant notifications
    if (prevState === ComputedState.Clean) {
      // Eagerly recompute to determine if value actually changed
      this._updateIfNeeded();

      // Only notify downstream if the value truly changed
      if (this._valueChanged) {
        this._valueChanged = false;
        const subs = Array.from(this.subscribers);
        for (let i = 0; i < subs.length; i++) {
          queueNotification(subs[i]);
        }
      }
    }
  }

  clearDependencies(): void {
    unlinkSubscriber(this);
  }

  // --- Internal -----------------------------------------------------------

  private _updateIfNeeded(): void {
    if (this._state === ComputedState.Clean) {
      return;
    }

    // Unlink old dependencies and re-track
    unlinkSubscriber(this);

    const prevSubscriber = setCurrentSubscriber(this);
    try {
      const newValue = this._fn();

      if (
        this._value !== undefined &&
        this._equals(this._value as T, newValue)
      ) {
        // Value didn't actually change — stay clean, don't propagate
        this._state = ComputedState.Clean;
        this._valueChanged = false;
        return;
      }

      this._value = newValue;
      this._state = ComputedState.Clean;
      this._valueChanged = true;

      // Notify manual subscribers if value changed
      if (this._manualSubs !== null && this._manualSubs.size > 0) {
        const subs = Array.from(this._manualSubs);
        for (let i = 0; i < subs.length; i++) {
          subs[i](newValue);
        }
      }
    } finally {
      setCurrentSubscriber(prevSubscriber);
    }
  }
  /**
   * Dispose this computed — stop tracking, clear dependencies.
   * After disposal, `.value` returns the last cached value.
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    unlinkSubscriber(this);
    this._manualSubs?.clear();
    this._manualSubs = null;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface ComputedOptions<T> {
  /** Custom equality function. Default: Object.is */
  equals?: (a: T, b: T) => boolean;
}

/**
 * Create a derived reactive value.
 *
 * @param fn - Derivation function. Dependencies are auto-tracked.
 * @param options - Optional configuration.
 * @returns A ReadonlySignal that lazily recalculates when dependencies change.
 *
 * @example
 * ```ts
 * const firstName = signal("John");
 * const lastName = signal("Doe");
 * const fullName = computed(() => `${firstName.value} ${lastName.value}`);
 * fullName.value; // "John Doe"
 * ```
 */
export function computed<T>(
  fn: () => T,
  options?: ComputedOptions<T>,
): ReadonlySignal<T> {
  return new ComputedImpl(fn, options?.equals);
}
