/**
 * Switch() — Multi-condition rendering primitive.
 *
 * Renders one of several cases based on a reactive value.
 *
 * @example
 * ```ts
 * Switch({
 *   value: () => status.value,
 *   cases: {
 *     loading: () => Text({ text: "Loading..." }),
 *     success: () => Text({ text: "Done!" }),
 *     error: () => Text({ text: "Failed" }),
 *   },
 *   default: () => Text({ text: "Unknown" }),
 * });
 * ```
 */

import { signal } from '../reactive/signal';
import { effect } from '../reactive/effect';
import { scope } from '../reactive/scope';
import type { Disposer } from '../reactive/graph';
import type { AnyNode } from './show';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SwitchProps<T extends string | number> {
    /** Reactive value to match against case keys. */
    value: () => T;
    /** Map of case values to node factories. */
    cases: Record<string, () => AnyNode>;
    /** Optional default case when no case matches. */
    default?: () => AnyNode;
}

export interface SwitchResult {
    readonly type: 'switch';
    /** The currently rendered node. */
    readonly current: () => AnyNode | null;
    /** Dispose this Switch and all its inner scopes. */
    readonly dispose: Disposer;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Multi-condition rendering.
 *
 * Reactively watches `value()`. When it changes, disposes the previous
 * case's scope and mounts the matching case (or default).
 *
 * @param props - Switch configuration.
 * @returns A SwitchResult with the currently rendered node.
 */
export function Switch<T extends string | number>(props: SwitchProps<T>): SwitchResult {
    const currentNode = signal<AnyNode | null>(null);
    let childDispose: Disposer | null = null;
    let lastKey: string | null = null;

    const outerDispose = scope(() => {
        effect(() => {
            const key = String(props.value());

            // Only re-mount if the matched case changed
            if (key === lastKey) return;
            lastKey = key;

            // Dispose previous case
            if (childDispose !== null) {
                childDispose();
                childDispose = null;
            }

            const factory = props.cases[key] ?? props.default;

            if (factory) {
                const result = scope<AnyNode>(() => factory());
                childDispose = result.dispose;
                currentNode.value = result.value;
            } else {
                currentNode.value = null;
            }
        });
    }) as Disposer;

    return {
        type: 'switch',
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
