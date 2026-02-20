/**
 * untrack() — Read signals without creating dependencies.
 *
 * Useful when you need a value but don't want the effect to re-run when
 * that signal changes.
 *
 * @example
 * ```ts
 * effect(() => {
 *   const n = name.value;              // tracked
 *   const c = untrack(() => count.value); // NOT tracked
 *   console.log(`${n}: ${c}`);
 * });
 * ```
 */

import { getCurrentSubscriber, setCurrentSubscriber } from './graph';

/**
 * Execute a function without tracking any signal reads as dependencies.
 *
 * Any signal reads within `fn` will not register the current effect/computed
 * as a subscriber. The return value of `fn` is returned.
 *
 * @param fn - Function to execute without tracking.
 * @returns The return value of `fn`.
 *
 * @example
 * ```ts
 * effect(() => {
 *   // only re-runs when `name` changes, NOT when `count` changes
 *   const name = name.value;
 *   const count = untrack(() => count.value);
 *   console.log(`${name}: ${count}`);
 * });
 * ```
 */
export function untrack<T>(fn: () => T): T {
    const prev = setCurrentSubscriber(null);
    try {
        return fn();
    } finally {
        setCurrentSubscriber(prev);
    }
}
