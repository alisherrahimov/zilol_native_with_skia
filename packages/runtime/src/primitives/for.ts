/**
 * For() — Keyed list rendering primitive.
 *
 * Efficiently handles add/remove/reorder without re-rendering unchanged items.
 * Uses a key function to identify items and only creates/destroys nodes when
 * items enter/leave the list.
 *
 * @example
 * ```ts
 * For({
 *   each: () => todos.value,
 *   key: (todo) => todo.id,
 *   children: (todo, index) =>
 *     View({ children: [Text({ text: () => todo().title })] }),
 * });
 * ```
 */

import { signal, type Signal } from '../reactive/signal';
import { effect } from '../reactive/effect';
import { scope } from '../reactive/scope';
import type { Disposer } from '../reactive/graph';
import type { AnyNode } from './show';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ForProps<T> {
    /** Reactive data array. */
    each: () => T[];
    /** Key extractor — must return a unique, stable key per item. */
    key: (item: T, index: number) => string | number;
    /** Child factory. Receives reactive item and index accessors. */
    children: (item: () => T, index: () => number) => AnyNode;
    /** Optional fallback when the array is empty. */
    fallback?: () => AnyNode;
}

export interface ForResult {
    readonly type: 'for';
    /** Current rendered nodes, in order. */
    readonly nodes: () => AnyNode[];
    /** Dispose this For loop and all item scopes. */
    readonly dispose: Disposer;
}

interface MappedItem<T> {
    key: string | number;
    itemSignal: Signal<T>;
    indexSignal: Signal<number>;
    node: AnyNode;
    dispose: Disposer;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Keyed list rendering.
 *
 * On each list change:
 * 1. Removes items no longer present (by key)
 * 2. Adds new items
 * 3. Reorders existing items
 * 4. Updates item/index signals for moved items (no re-render, just signal update)
 *
 * @param props - For configuration.
 * @returns A ForResult with current rendered nodes.
 */
export function For<T>(props: ForProps<T>): ForResult {
    const mappedItems = new Map<string | number, MappedItem<T>>();
    let orderedNodes: AnyNode[] = [];
    let fallbackDispose: Disposer | null = null;

    const outerDispose = scope(() => {
        effect(() => {
            const items = props.each();

            // Track which keys are in the new list
            const newKeys = new Set<string | number>();

            // Build new order
            const newMapped: MappedItem<T>[] = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const key = props.key(item, i);
                newKeys.add(key);

                const existing = mappedItems.get(key);
                if (existing !== undefined) {
                    // Update existing item's signals (no re-render of the component)
                    existing.itemSignal.value = item;
                    existing.indexSignal.value = i;
                    newMapped.push(existing);
                } else {
                    // Create new item
                    const itemSignal = signal(item);
                    const indexSignal = signal(i);

                    const result = scope<AnyNode>(() => {
                        return props.children(
                            () => itemSignal.value,
                            () => indexSignal.value,
                        );
                    });

                    const mapped: MappedItem<T> = {
                        key,
                        itemSignal,
                        indexSignal,
                        node: result.value,
                        dispose: result.dispose,
                    };

                    mappedItems.set(key, mapped);
                    newMapped.push(mapped);
                }
            }

            // Remove items no longer in the list
            for (const [key, mapped] of mappedItems) {
                if (!newKeys.has(key)) {
                    mapped.dispose();
                    mappedItems.delete(key);
                }
            }

            // Dispose fallback if items now exist
            if (fallbackDispose !== null && items.length > 0) {
                fallbackDispose();
                fallbackDispose = null;
            }

            // Show fallback if empty
            if (items.length === 0 && props.fallback && fallbackDispose === null) {
                const fbResult = scope<AnyNode>(() => props.fallback!());
                fallbackDispose = fbResult.dispose;
                orderedNodes = [fbResult.value];
            } else {
                orderedNodes = newMapped.map((m) => m.node);
            }
        });
    }) as Disposer;

    return {
        type: 'for',
        nodes: () => orderedNodes,
        dispose: () => {
            for (const [, mapped] of mappedItems) {
                mapped.dispose();
            }
            mappedItems.clear();
            if (fallbackDispose !== null) {
                fallbackDispose();
                fallbackDispose = null;
            }
            outerDispose();
        },
    };
}
