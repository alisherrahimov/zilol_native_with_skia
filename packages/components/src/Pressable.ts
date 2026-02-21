/**
 * Pressable — Touchable wrapper component with press-state feedback.
 *
 * Unlike View.onPress() which just fires a callback, Pressable exposes
 * a reactive `pressed` signal that children can observe for styling
 * changes (e.g. opacity reduction, scale, color shift during press).
 *
 * @example
 * ```ts
 * import { Pressable, Text } from '@zilol-native/components';
 *
 * Pressable(
 *   Text('Tap me').fontSize(16).color('#FFF'),
 * )
 *   .onPress(() => console.log('pressed!'))
 *   .backgroundColor('#3B82F6')
 *   .borderRadius(12)
 *   .padding(16);
 *
 * // With press-state-aware styling
 * const btn = Pressable(
 *   Text('Hold me').fontSize(16).color('#FFF'),
 * )
 *   .onPress(() => doSomething())
 *   .backgroundColor((pressed) => pressed ? '#1D4ED8' : '#3B82F6')
 *   .opacity((pressed) => pressed ? 0.8 : 1.0)
 *   .borderRadius(12)
 *   .padding(16);
 * ```
 */

import { createViewNode } from "@zilol-native/nodes";
import { signal, effect } from "@zilol-native/runtime";
import type { SkiaNode, BorderRadius, ShadowProps } from "@zilol-native/nodes";
import { ComponentBase } from "./ComponentBase";
import { resolveNode } from "./types";
import type { ComponentChild } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Value that can be static, reactive, or press-state-aware. */
type PressVal<T> = T | ((pressed: boolean) => T);

// ---------------------------------------------------------------------------
// Reactive setter helpers
// ---------------------------------------------------------------------------

/**
 * Set a prop on a node. If the value is a function that depends
 * on the pressed signal, wrap it in an effect.
 */
function setPressReactive(
  node: SkiaNode,
  key: string,
  value: unknown,
  pressed: { readonly value: boolean },
): void {
  if (typeof value === "function") {
    const fn = value as (pressed: boolean) => unknown;
    effect(() => {
      node.setProp(key as any, fn(pressed.value));
    });
  } else {
    node.setProp(key as any, value);
  }
}

// ---------------------------------------------------------------------------
// PressableBuilder
// ---------------------------------------------------------------------------

export class PressableBuilder extends ComponentBase {
  readonly node: SkiaNode;

  /** Reactive pressed state — true while the finger is down. */
  private _pressed = signal(false);

  constructor(children: ComponentChild[]) {
    super();
    this.node = createViewNode();
    this.node.setProp("touchable", true);

    // Wire up press-in / press-out to toggle the pressed signal
    this.node.setProp("onPressIn", () => {
      this._pressed.value = true;
    });
    this.node.setProp("onPressOut", () => {
      this._pressed.value = false;
    });

    for (let i = 0; i < children.length; i++) {
      const resolved = resolveNode(children[i]);
      if (resolved !== null) {
        this.node.appendChild(resolved);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Interaction handlers
  // -----------------------------------------------------------------------

  /** Called when a press is released within bounds. */
  onPress(handler: () => void): this {
    this.node.setProp("onPress", handler);
    return this;
  }

  /** Called when a long press is detected. */
  onLongPress(handler: () => void): this {
    this.node.setProp("onLongPress", handler);
    return this;
  }

  /** Called when the press gesture starts. */
  onPressIn(handler: () => void): this {
    // Chain with the internal pressed signal toggle
    const prev = this.node.props.onPressIn as (() => void) | undefined;
    this.node.setProp("onPressIn", () => {
      this._pressed.value = true;
      if (prev) prev();
      handler();
    });
    return this;
  }

  /** Called when the press gesture ends or is cancelled. */
  onPressOut(handler: () => void): this {
    const prev = this.node.props.onPressOut as (() => void) | undefined;
    this.node.setProp("onPressOut", () => {
      this._pressed.value = false;
      if (prev) prev();
      handler();
    });
    return this;
  }

  // -----------------------------------------------------------------------
  // Press-aware visual modifiers
  //
  // These accept either a static value or a function (pressed) => value
  // that automatically re-evaluates when press state changes.
  // -----------------------------------------------------------------------

  backgroundColor(value: PressVal<string>): this {
    setPressReactive(this.node, "backgroundColor", value, this._pressed);
    return this;
  }

  borderRadius(value: PressVal<number | BorderRadius>): this {
    setPressReactive(this.node, "borderRadius", value, this._pressed);
    return this;
  }

  borderWidth(value: PressVal<number>): this {
    setPressReactive(this.node, "borderWidth", value, this._pressed);
    return this;
  }

  borderColor(value: PressVal<string>): this {
    setPressReactive(this.node, "borderColor", value, this._pressed);
    return this;
  }

  border(width: PressVal<number>, color: PressVal<string>): this {
    this.borderWidth(width);
    this.borderColor(color);
    return this;
  }

  shadow(value: PressVal<ShadowProps>): this {
    setPressReactive(this.node, "shadow", value, this._pressed);
    return this;
  }

  clip(value: PressVal<boolean> = true): this {
    setPressReactive(this.node, "clip", value, this._pressed);
    return this;
  }

  override opacity(value: PressVal<number>): this {
    setPressReactive(this.node, "opacity", value, this._pressed);
    return this;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a pressable (touchable) container with optional children.
 *
 * All visual modifiers accept either a static value or a function
 * `(pressed: boolean) => value` that reacts to press state changes.
 *
 * @param children - Child components
 * @returns A PressableBuilder with chainable modifiers
 *
 * @example
 * ```ts
 * Pressable(
 *   Text('Tap me').fontSize(16).color('#FFF'),
 * )
 *   .onPress(() => alert('Hello!'))
 *   .backgroundColor((pressed) => pressed ? '#1D4ED8' : '#3B82F6')
 *   .opacity((pressed) => pressed ? 0.8 : 1.0)
 *   .padding(16)
 *   .borderRadius(12);
 * ```
 */
export function Pressable(...children: ComponentChild[]): PressableBuilder {
  return new PressableBuilder(children);
}
