/**
 * effect() — Side-effect runner.
 *
 * Runs a function immediately and re-runs it whenever its dependencies change.
 * Dependencies are automatically tracked on each execution.
 * Returns a disposer to stop the effect.
 *
 * @example
 * ```ts
 * const name = signal("Alisher");
 * const dispose = effect(() => {
 *   console.log(`Hello ${name.value}`);
 * });
 * // logs: "Hello Alisher"
 * name.value = "John";
 * // logs: "Hello John"
 * dispose();
 * ```
 */

import {
    type ReactiveNode,
    type Subscriber,
    type Disposer,
    nextReactiveId,
    getCurrentSubscriber,
    setCurrentSubscriber,
    unlinkSubscriber,
} from './graph';
import { registerDisposer } from './scope';

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class EffectImpl implements Subscriber {
    readonly id: number;
    readonly dependencies = new Set<ReactiveNode>();

    private readonly _fn: () => void | (() => void);
    private _cleanup: (() => void) | null = null;
    private _disposed = false;

    constructor(fn: () => void | (() => void)) {
        this.id = nextReactiveId();
        this._fn = fn;
    }

    /** Run the effect function, tracking dependencies. */
    run(): void {
        if (this._disposed) return;

        // Run previous cleanup before re-executing
        this._runCleanup();

        // Unlink old dependencies
        unlinkSubscriber(this);

        // Track new dependencies
        const prevSubscriber = setCurrentSubscriber(this);
        try {
            const result = this._fn();
            if (typeof result === 'function') {
                this._cleanup = result;
            }
        } finally {
            setCurrentSubscriber(prevSubscriber);
        }
    }

    /** Called by the graph when a dependency changes. */
    notify(): void {
        if (this._disposed) return;
        this.run();
    }

    clearDependencies(): void {
        unlinkSubscriber(this);
    }

    /** Dispose this effect — stop tracking, run cleanup. */
    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this._runCleanup();
        unlinkSubscriber(this);
    }

    private _runCleanup(): void {
        if (this._cleanup !== null) {
            const cleanup = this._cleanup;
            this._cleanup = null;
            cleanup();
        }
    }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create and immediately run a reactive side effect.
 *
 * The function runs once immediately to establish dependencies,
 * then re-runs whenever any tracked dependency changes.
 *
 * If the function returns a cleanup function, it will be called
 * before each re-execution and on disposal.
 *
 * @param fn - The side-effect function. May return a cleanup function.
 * @returns A disposer function to stop the effect.
 *
 * @example
 * ```ts
 * const timer = effect(() => {
 *   const id = setInterval(() => console.log(count.value), 1000);
 *   return () => clearInterval(id); // cleanup
 * });
 * timer(); // dispose
 * ```
 */
export function effect(fn: () => void | (() => void)): Disposer {
    const eff = new EffectImpl(fn);

    // Run immediately to establish dependencies
    eff.run();

    const dispose = () => eff.dispose();

    // Register with current scope for auto-cleanup
    registerDisposer(dispose);

    return dispose;
}
