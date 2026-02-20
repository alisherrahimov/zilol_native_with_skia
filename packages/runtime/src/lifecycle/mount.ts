/**
 * onMount() — Runs after the component's SkiaNode is added to the tree.
 *
 * In Phase 1 (no SkiaNode tree yet), this schedules the callback to run
 * on the next microtask as a stand-in for "after first paint".
 * In Phase 3+, it will be wired to the actual render pipeline.
 *
 * Return a cleanup function to run on unmount.
 *
 * @example
 * ```ts
 * function ChatScreen() {
 *   onMount(() => {
 *     const ws = new WebSocket("wss://...");
 *     return () => ws.close(); // cleanup on unmount
 *   });
 *   return View({ ... });
 * }
 * ```
 */

import { registerDisposer } from '../reactive/scope';

/**
 * Register a mount callback.
 *
 * The callback runs after the component is added to the tree.
 * If it returns a function, that function runs on unmount/cleanup.
 *
 * @param fn - Mount callback. May return an unmount/cleanup function.
 */
export function onMount(fn: () => void | (() => void)): void {
    let cleanup: (() => void) | null = null;
    let mounted = false;

    // Schedule mount callback — runs after current synchronous execution
    queueMicrotask(() => {
        if (mounted) return; // guard against double-mount
        mounted = true;
        const result = fn();
        if (typeof result === 'function') {
            cleanup = result;
        }
    });

    // Register disposal with the current scope
    registerDisposer(() => {
        mounted = true; // prevent mount if not yet run
        if (cleanup !== null) {
            cleanup();
            cleanup = null;
        }
    });
}
