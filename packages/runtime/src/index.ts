/**
 * @module @zilol-native/runtime
 *
 * Zilol Native — Reactive Runtime
 *
 * Public API for the core reactive runtime. This is the foundation that
 * all other packages build upon.
 *
 * @example
 * ```ts
 * import { signal, computed, effect, batch, scope, Show, For, onMount } from '@zilol-native/runtime';
 * ```
 */

// Reactive primitives
export {
    signal,
    isSignal,
    computed,
    effect,
    batch,
    untrack,
    scope,
    getCurrentScope,
    registerDisposer,
} from './reactive';
export type {
    Signal,
    ReadonlySignal,
    SignalOptions,
    ComputedOptions,
    Disposer,
} from './reactive';

// Control flow primitives
export { Show, For, Switch, Portal } from './primitives';
export type {
    ShowProps,
    ShowResult,
    ForProps,
    ForResult,
    SwitchProps,
    SwitchResult,
    PortalProps,
    PortalResult,
    AnyNode,
} from './primitives';

// Lifecycle hooks
export { onMount, onCleanup, onLayout } from './lifecycle';
export type { Layout, LayoutCallback } from './lifecycle';
