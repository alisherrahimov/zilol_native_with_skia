/**
 * onLayout() — Runs after Yoga calculates layout for the component's root node.
 *
 * In Phase 1 (no Yoga integration yet), this is a no-op placeholder.
 * In Phase 3+, the layout engine will call registered callbacks with
 * computed layout results.
 *
 * @example
 * ```ts
 * function ResponsiveGrid() {
 *   const columns = signal(2);
 *   onLayout((layout) => {
 *     columns.value = layout.width > 600 ? 3 : 2;
 *   });
 *   return View({ ... });
 * }
 * ```
 */

import { registerDisposer } from '../reactive/scope';

/** Layout result from Yoga computation. */
export interface Layout {
    x: number;
    y: number;
    width: number;
    height: number;
    absoluteX: number;
    absoluteY: number;
}

/** Callback storage for layout listeners (wired in Phase 3). */
export type LayoutCallback = (layout: Layout) => void;

const _layoutCallbacks: Set<LayoutCallback> = new Set();

/**
 * Register a layout callback.
 *
 * The callback will be invoked after Yoga calculates layout for the
 * component's root node. In Phase 1, this registers the callback for
 * future use when the layout engine is integrated.
 *
 * @param fn - Function to call with layout results.
 */
export function onLayout(fn: LayoutCallback): void {
    _layoutCallbacks.add(fn);

    // Auto-remove on scope disposal
    registerDisposer(() => {
        _layoutCallbacks.delete(fn);
    });
}

/**
 * Trigger layout callbacks with computed layout. Called by the layout engine.
 * @internal
 */
export function _triggerLayoutCallbacks(layout: Layout): void {
    for (const cb of _layoutCallbacks) {
        cb(layout);
    }
}
