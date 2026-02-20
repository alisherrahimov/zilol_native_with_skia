/**
 * scope() — Reactive scope for automatic cleanup.
 *
 * Creates a scope that tracks all signals, computeds, and effects created
 * within it. Disposing the scope cleans up everything. Each component runs
 * inside its own scope.
 *
 * @example
 * ```ts
 * const dispose = scope(() => {
 *   const count = signal(0);
 *   const doubled = computed(() => count.value * 2);
 *   effect(() => console.log(doubled.value));
 * });
 * dispose(); // all signals, computeds, effects cleaned up
 * ```
 */

import type { Disposer } from './graph';

// ---------------------------------------------------------------------------
// Global scope stack
// ---------------------------------------------------------------------------

interface ReactiveScope {
    /** Disposers registered within this scope. */
    disposers: Disposer[];
    /** Child scopes (nested components). */
    children: ReactiveScope[];
    /** Parent scope, if any. */
    parent: ReactiveScope | null;
    /** Whether this scope has been disposed. */
    disposed: boolean;
}

let _currentScope: ReactiveScope | null = null;

/** Get the currently active scope (if any). */
export function getCurrentScope(): ReactiveScope | null {
    return _currentScope;
}

/**
 * Register a disposer with the current scope.
 * Called internally by effect(), computed(), etc.
 * If there is no active scope, the disposer is not tracked (caller must
 * manage lifecycle manually).
 */
export function registerDisposer(disposer: Disposer): void {
    if (_currentScope !== null && !_currentScope.disposed) {
        _currentScope.disposers.push(disposer);
    }
}

// ---------------------------------------------------------------------------
// Dispose
// ---------------------------------------------------------------------------

function disposeScope(s: ReactiveScope): void {
    if (s.disposed) return;
    s.disposed = true;

    // Dispose children first (innermost first)
    for (let i = s.children.length - 1; i >= 0; i--) {
        disposeScope(s.children[i]);
    }
    s.children.length = 0;

    // Dispose all registered disposers (reverse order)
    for (let i = s.disposers.length - 1; i >= 0; i--) {
        s.disposers[i]();
    }
    s.disposers.length = 0;

    // Remove from parent
    if (s.parent !== null) {
        const idx = s.parent.children.indexOf(s);
        if (idx !== -1) {
            s.parent.children.splice(idx, 1);
        }
        s.parent = null;
    }
}

// ---------------------------------------------------------------------------
// Factory — void overload
// ---------------------------------------------------------------------------

/**
 * Create a reactive scope. All effects and computeds created inside `fn`
 * are tracked and will be disposed when the returned disposer is called.
 *
 * @param fn - Function to execute within the scope.
 * @returns A disposer that cleans up everything created in the scope.
 *
 * @example
 * ```ts
 * const dispose = scope(() => {
 *   const x = signal(0);
 *   effect(() => console.log(x.value));
 * });
 * dispose(); // effect is cleaned up
 * ```
 */
export function scope(fn: () => void): Disposer;

/**
 * Create a reactive scope that returns a value.
 *
 * @param fn - Function to execute within the scope.
 * @returns An object with the return value and a disposer.
 */
export function scope<T>(fn: () => T): { value: T; dispose: Disposer };

export function scope<T>(fn: () => T | void): Disposer | { value: T; dispose: Disposer } {
    const newScope: ReactiveScope = {
        disposers: [],
        children: [],
        parent: _currentScope,
        disposed: false,
    };

    // Attach to parent scope
    if (_currentScope !== null) {
        _currentScope.children.push(newScope);
    }

    const prevScope = _currentScope;
    _currentScope = newScope;

    let result: T | void;
    try {
        result = fn();
    } catch (err) {
        // On error, dispose everything created so far
        _currentScope = prevScope;
        disposeScope(newScope);
        throw err;
    }

    _currentScope = prevScope;

    const dispose = () => disposeScope(newScope);

    // If the function returns void, just return the disposer
    if (result === undefined) {
        return dispose;
    }

    return { value: result as T, dispose };
}
