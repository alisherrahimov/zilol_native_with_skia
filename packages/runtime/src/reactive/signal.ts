/**
 * signal() — Atomic reactive value.
 *
 * Reading `.value` inside an `effect` or `computed` automatically tracks
 * the dependency. Writing `.value` notifies all subscribers.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * count.value;        // 0 (tracks if inside effect/computed)
 * count.peek();       // 0 (never tracks)
 * count.value = 5;    // notifies all subscribers
 * ```
 */

import {
    type ReactiveNode,
    type Disposer,
    nextReactiveId,
    trackDependency,
    notifySubscribers,
} from './graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A readable + writable reactive value. */
export interface Signal<T> {
    /** Read the current value. Auto-tracks dependency if inside effect/computed. */
    get value(): T;
    /** Write a new value. Notifies all subscribers if the value changed. */
    set value(v: T);
    /** Read the current value WITHOUT tracking any dependency. */
    peek(): T;
    /** Subscribe to value changes manually. Returns a disposer to stop listening. */
    subscribe(fn: (value: T) => void): Disposer;
}

/** Read-only signal interface (returned by computed). */
export interface ReadonlySignal<T> {
    get value(): T;
    peek(): T;
    subscribe(fn: (value: T) => void): Disposer;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SignalImpl<T> implements Signal<T>, ReactiveNode {
    readonly id: number;
    readonly subscribers = new Set<import('./graph').Subscriber>();

    private _value: T;
    private readonly _equals: (a: T, b: T) => boolean;
    /** Manual subscriptions (not part of dependency graph). */
    private _manualSubs: Set<(value: T) => void> | null = null;

    /** Optional HMR identifier for hot reload signal preservation. */
    readonly _hmrId: string | undefined;

    constructor(
        initialValue: T,
        options?: SignalOptions<T>,
    ) {
        this.id = nextReactiveId();
        this._value = initialValue;
        this._equals = options?.equals ?? Object.is;
        this._hmrId = options?.hmrId;
    }

    get value(): T {
        trackDependency(this);
        return this._value;
    }

    set value(newValue: T) {
        if (this._equals(this._value, newValue)) {
            return;
        }
        this._value = newValue;

        // Notify dependency-graph subscribers
        notifySubscribers(this);

        // Notify manual subscribers
        if (this._manualSubs !== null && this._manualSubs.size > 0) {
            const subs = Array.from(this._manualSubs);
            for (let i = 0; i < subs.length; i++) {
                subs[i](newValue);
            }
        }
    }

    peek(): T {
        return this._value;
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
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SignalOptions<T> {
    /** Custom equality function. Default: Object.is */
    equals?: (a: T, b: T) => boolean;
    /** HMR identifier for hot reload signal preservation (injected by SWC plugin). */
    hmrId?: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new reactive signal.
 *
 * @param initialValue - The initial value of the signal.
 * @param options - Optional configuration (custom equality, HMR id).
 * @returns A Signal that can be read and written reactively.
 *
 * @example
 * ```ts
 * const name = signal("Alisher");
 * console.log(name.value); // "Alisher"
 * name.value = "John";     // notifies subscribers
 * ```
 */
export function signal<T>(initialValue: T, options?: SignalOptions<T>): Signal<T> {
    return new SignalImpl(initialValue, options);
}

/**
 * Type guard: check if a value is a Signal.
 */
export function isSignal<T = unknown>(value: unknown): value is Signal<T> {
    return value instanceof SignalImpl;
}
