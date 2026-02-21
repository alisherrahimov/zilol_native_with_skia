/**
 * binding.ts — Wire reactive props to SkiaNodes.
 *
 * When a prop value is a function (reactive accessor), an effect is created
 * that auto-updates the node prop whenever the underlying signal changes.
 * Static values are set once.
 *
 * Uses `effect()` and `scope()` from `@zilol-native/runtime`.
 *
 * @example
 * ```ts
 * const color = signal('#FF0000');
 * const node = createViewNode();
 *
 * const dispose = bindProps(node, {
 *   backgroundColor: () => color.value,  // reactive — updates automatically
 *   borderRadius: 8,                      // static — set once
 * });
 *
 * color.value = '#00FF00'; // node.props.backgroundColor auto-updates
 * dispose(); // cleanup all effects
 * ```
 */

import type { SkiaNode } from "../core/SkiaNode";
import type { SkiaNodeProps } from "../core/types";
import { effect, scope, type Disposer } from "@zilol-native/runtime";

/** A prop value that is either static or a reactive accessor. */
export type ReactiveProp<T> = T | (() => T);

/** Record of prop keys to reactive-or-static values. */
export type ReactiveProps = {
  readonly [K in keyof SkiaNodeProps]?: ReactiveProp<SkiaNodeProps[K]>;
};

/**
 * Check if a value is a reactive accessor (function).
 * Excludes event handlers (onPress, onDraw, etc.) which are functions
 * but not reactive accessors.
 */
function isReactiveAccessor(
  key: string,
  value: unknown,
): value is () => unknown {
  if (typeof value !== "function") return false;
  // Event handlers start with "on" followed by uppercase letter
  if (
    key.length > 2 &&
    key[0] === "o" &&
    key[1] === "n" &&
    key[2] === key[2].toUpperCase()
  ) {
    return false;
  }
  return true;
}

/**
 * Bind reactive and static props to a SkiaNode.
 *
 * For each prop:
 * - If it's a function (reactive accessor), create an effect that
 *   calls `node.setProp(key, value())` whenever dependencies change.
 * - If it's a static value, call `node.setProp(key, value)` once.
 *
 * @returns A Disposer that cleans up all created effects.
 */
export function bindProps(node: SkiaNode, props: ReactiveProps): Disposer {
  const dispose = scope(() => {
    const keys = Object.keys(props) as Array<keyof SkiaNodeProps>;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = props[key];

      if (value === undefined) continue;

      if (isReactiveAccessor(key as string, value)) {
        // Reactive prop — create an effect
        const accessor = value as () => SkiaNodeProps[typeof key];
        effect(() => {
          node.setProp(key, accessor());
        });
      } else {
        // Static prop — set once
        node.setProp(key, value as SkiaNodeProps[typeof key]);
      }
    }
  });

  return dispose;
}
