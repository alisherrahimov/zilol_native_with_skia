/**
 * onCleanup() — Registers a cleanup function for the current scope.
 *
 * Runs when the component's scope is disposed (unmount, hot reload, etc.).
 *
 * @example
 * ```ts
 * function Timer() {
 *   const count = signal(0);
 *   const id = setInterval(() => count.value++, 1000);
 *   onCleanup(() => clearInterval(id));
 *   return Text({ text: () => `${count.value}s` });
 * }
 * ```
 */

import { registerDisposer } from '../reactive/scope';

/**
 * Register a cleanup function with the current reactive scope.
 *
 * The function will be called when the enclosing scope is disposed,
 * typically when a component unmounts or during hot reload.
 *
 * @param fn - Cleanup function to run on scope disposal.
 */
export function onCleanup(fn: () => void): void {
    registerDisposer(fn);
}
