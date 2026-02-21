/**
 * View — Container component with visual styling.
 *
 * Creates a view node that supports flexbox layout, background color,
 * border, shadow, border radius, clipping, and touch interaction.
 * Returns a chainable builder for SwiftUI-style modifier syntax.
 *
 * @example
 * ```ts
 * import { View, Text } from '@zilol-native/components';
 *
 * // Simple card
 * const card = View(
 *   Text('Hello').fontSize(18).color('#FFF'),
 *   Text('World').fontSize(14).color('#AAA'),
 * )
 *   .size(300, 200)
 *   .backgroundColor('#1E293B')
 *   .borderRadius(16)
 *   .padding(20)
 *   .column()
 *   .gap(8);
 *
 * // Reactive background
 * const bg = signal('#FF0000');
 * View().backgroundColor(() => bg.value);
 * ```
 */

import { createViewNode } from "@zilol-native/nodes";
import { effect } from "@zilol-native/runtime";
import type { SkiaNode, BorderRadius, ShadowProps } from "@zilol-native/nodes";
import { ComponentBase } from "./ComponentBase";
import { resolveNode } from "./types";
import type { ComponentChild } from "./types";

// ---------------------------------------------------------------------------
// Reactive setter helper (duplicated to avoid circular deps)
// ---------------------------------------------------------------------------

type Val<T> = T | (() => T);

function setProp(node: SkiaNode, key: string, value: unknown): void {
  if (typeof value === "function") {
    const accessor = value as () => unknown;
    effect(() => {
      node.setProp(key as any, accessor());
    });
  } else {
    node.setProp(key as any, value);
  }
}

// ---------------------------------------------------------------------------
// ViewBuilder
// ---------------------------------------------------------------------------

export class ViewBuilder extends ComponentBase {
  readonly node: SkiaNode;

  constructor(children: ComponentChild[]) {
    super();
    this.node = createViewNode();

    for (let i = 0; i < children.length; i++) {
      const resolved = resolveNode(children[i]);
      if (resolved !== null) {
        this.node.appendChild(resolved);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Visual
  // -----------------------------------------------------------------------

  backgroundColor(value: Val<string>): this {
    setProp(this.node, "backgroundColor", value);
    return this;
  }

  borderRadius(value: Val<number | BorderRadius>): this {
    setProp(this.node, "borderRadius", value);
    return this;
  }

  borderWidth(value: Val<number>): this {
    setProp(this.node, "borderWidth", value);
    return this;
  }

  borderColor(value: Val<string>): this {
    setProp(this.node, "borderColor", value);
    return this;
  }

  /** Set border width and color together. */
  border(width: Val<number>, color: Val<string>): this {
    this.borderWidth(width);
    this.borderColor(color);
    return this;
  }

  shadow(value: Val<ShadowProps>): this {
    setProp(this.node, "shadow", value);
    return this;
  }

  clip(value: Val<boolean> = true): this {
    setProp(this.node, "clip", value);
    return this;
  }

  // -----------------------------------------------------------------------
  // Interaction
  // -----------------------------------------------------------------------

  touchable(value: boolean = true): this {
    this.node.setProp("touchable", value);
    return this;
  }

  onPress(handler: () => void): this {
    this.node.setProp("onPress", handler);
    this.node.setProp("touchable", true);
    return this;
  }

  onPressIn(handler: () => void): this {
    this.node.setProp("onPressIn", handler);
    return this;
  }

  onPressOut(handler: () => void): this {
    this.node.setProp("onPressOut", handler);
    return this;
  }

  onLongPress(handler: () => void): this {
    this.node.setProp("onLongPress", handler);
    return this;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a view with optional children.
 *
 * @param children - Child components (ViewBuilder, TextBuilder, SkiaNode, or falsy)
 * @returns A ViewBuilder with chainable modifiers
 *
 * @example
 * ```ts
 * View(child1, child2)
 *   .flex(1)
 *   .backgroundColor('#0F172A')
 *   .padding(16);
 * ```
 */
export function View(...children: ComponentChild[]): ViewBuilder {
  return new ViewBuilder(children);
}
