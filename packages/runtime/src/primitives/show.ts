/**
 * Show() — Conditional rendering primitive.
 *
 * Mounts/unmounts a child subtree when the condition changes.
 * In Phase 1 (no SkiaNode tree), this returns a description object
 * that the node layer will consume in Phase 2.
 *
 * @example
 * ```ts
 * Show({
 *   when: () => user.value,
 *   fallback: () => Text({ text: "Loading..." }),
 *   children: (u) => Text({ text: () => u.name }),
 * });
 * ```
 */

import { signal } from '../reactive/signal';
import { effect } from '../reactive/effect';
import { scope } from '../reactive/scope';
import type { Disposer } from '../reactive/graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Generic node type — will be SkiaNode in Phase 2+. */
export type AnyNode = unknown;

export interface ShowProps<T> {
    /** Reactive condition. When truthy, renders children. */
    when: () => T | null | undefined | false;
    /** Optional fallback to render when condition is falsy. */
    fallback?: () => AnyNode;
    /** Child factory. Receives the truthy value. */
    children: (value: T) => AnyNode;
}

export interface ShowResult {
    readonly type: 'show';
    /** The currently active node (children or fallback). */
    readonly current: () => AnyNode | null;
    /** Dispose this Show and all its inner scopes. */
    readonly dispose: Disposer;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Conditional rendering.
 *
 * Evaluates `when()` reactively. When the truthiness changes:
 * - Disposes the previous child scope
 * - Creates a new scope for the new child (children or fallback)
 *
 * @param props - Show configuration.
 * @returns A ShowResult with the current active node.
 */
export function Show<T>(props: ShowProps<T>): ShowResult {
    const currentNode = signal<AnyNode | null>(null);
    let childDispose: Disposer | null = null;
    let lastTruthy: boolean | null = null;

    const outerDispose = scope(() => {
        effect(() => {
            const value = props.when();
            const truthy = Boolean(value);

            // Only re-mount if truthiness actually changed
            if (truthy === lastTruthy) return;
            lastTruthy = truthy;

            // Dispose previous child scope
            if (childDispose !== null) {
                childDispose();
                childDispose = null;
            }

            if (truthy && value != null && value !== false) {
                // Mount children
                const result = scope<AnyNode>(() => {
                    return props.children(value as T);
                });
                childDispose = result.dispose;
                currentNode.value = result.value;
            } else if (props.fallback) {
                // Mount fallback
                const result = scope<AnyNode>(() => {
                    return props.fallback!();
                });
                childDispose = result.dispose;
                currentNode.value = result.value;
            } else {
                currentNode.value = null;
            }
        });
    }) as Disposer;

    return {
        type: 'show',
        current: () => currentNode.peek(),
        dispose: () => {
            if (childDispose !== null) {
                childDispose();
                childDispose = null;
            }
            outerDispose();
        },
    };
}
