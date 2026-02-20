/**
 * batch() — Group multiple signal writes into a single update.
 *
 * All effects and computed re-evaluations are deferred until the batch
 * completes, then run exactly once.
 *
 * @example
 * ```ts
 * batch(() => {
 *   firstName.value = "Jane";
 *   lastName.value = "Smith";
 * });
 * // effects that depend on both run ONCE, not twice
 * ```
 */

import { startBatch, endBatch } from './graph';

/**
 * Group multiple signal writes into a single atomic update.
 *
 * Effects only run once after the batch completes, preventing
 * intermediate/inconsistent states from being visible.
 * Batches can be nested — only the outermost batch triggers flush.
 *
 * @param fn - Function containing multiple signal writes.
 *
 * @example
 * ```ts
 * const a = signal(1);
 * const b = signal(2);
 * const sum = computed(() => a.value + b.value);
 * effect(() => console.log(sum.value)); // logs: 3
 *
 * batch(() => {
 *   a.value = 10;
 *   b.value = 20;
 * });
 * // logs ONCE: 30  (not 12 then 30)
 * ```
 */
export function batch(fn: () => void): void {
    startBatch();
    try {
        fn();
    } finally {
        endBatch();
    }
}
