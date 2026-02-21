/**
 * ComponentBase — Shared chainable modifiers for all components.
 *
 * Provides layout, spacing, position, and common visual methods
 * that both ViewBuilder and TextBuilder inherit. Each method sets
 * a prop on the underlying SkiaNode and returns `this` for chaining.
 *
 * Supports both static values and reactive accessors:
 *
 * @example
 * ```ts
 * View()
 *   .width(200)                           // static
 *   .backgroundColor(() => theme.value)   // reactive — auto-updates
 * ```
 */

import type { SkiaNode, SkiaNodeProps } from "@zilol-native/nodes";
import { effect } from "@zilol-native/runtime";
import type { Component } from "./types";

// ---------------------------------------------------------------------------
// Reactive setter helper
// ---------------------------------------------------------------------------

/**
 * Set a prop on a node. If the value is a function (reactive accessor),
 * wrap it in an effect so the prop auto-updates when signals change.
 */
function setPropReactive<K extends keyof SkiaNodeProps>(
  node: SkiaNode,
  key: K,
  value: SkiaNodeProps[K] | (() => SkiaNodeProps[K]),
): void {
  if (typeof value === "function") {
    const accessor = value as () => SkiaNodeProps[K];
    effect(() => {
      node.setProp(key, accessor());
    });
  } else {
    node.setProp(key, value);
  }
}

// ---------------------------------------------------------------------------
// ComponentBase
// ---------------------------------------------------------------------------

/** Value that can be static or reactive. */
type Val<T> = T | (() => T);

export abstract class ComponentBase implements Component {
  abstract readonly node: SkiaNode;

  // -----------------------------------------------------------------------
  // Dimensions
  // -----------------------------------------------------------------------

  width(value: Val<number | string>): this {
    setPropReactive(this.node, "width", value as any);
    return this;
  }

  height(value: Val<number | string>): this {
    setPropReactive(this.node, "height", value as any);
    return this;
  }

  /** Set both width and height at once. */
  size(w: Val<number | string>, h: Val<number | string>): this {
    this.width(w);
    this.height(h);
    return this;
  }

  minWidth(value: Val<number | string>): this {
    setPropReactive(this.node, "minWidth", value as any);
    return this;
  }

  minHeight(value: Val<number | string>): this {
    setPropReactive(this.node, "minHeight", value as any);
    return this;
  }

  maxWidth(value: Val<number | string>): this {
    setPropReactive(this.node, "maxWidth", value as any);
    return this;
  }

  maxHeight(value: Val<number | string>): this {
    setPropReactive(this.node, "maxHeight", value as any);
    return this;
  }

  // -----------------------------------------------------------------------
  // Flex
  // -----------------------------------------------------------------------

  flex(value: Val<number>): this {
    setPropReactive(this.node, "flex", value as any);
    return this;
  }

  flexGrow(value: Val<number>): this {
    setPropReactive(this.node, "flexGrow" as any, value as any);
    return this;
  }

  flexShrink(value: Val<number>): this {
    setPropReactive(this.node, "flexShrink" as any, value as any);
    return this;
  }

  flexDirection(
    value: Val<"row" | "column" | "row-reverse" | "column-reverse">,
  ): this {
    setPropReactive(this.node, "flexDirection", value as any);
    return this;
  }

  /** Alias: `.column()` sets flexDirection to "column". */
  column(): this {
    return this.flexDirection("column");
  }

  /** Alias: `.row()` sets flexDirection to "row". */
  row(): this {
    return this.flexDirection("row");
  }

  justifyContent(
    value: Val<
      | "flex-start"
      | "flex-end"
      | "center"
      | "space-between"
      | "space-around"
      | "space-evenly"
    >,
  ): this {
    setPropReactive(this.node, "justifyContent", value as any);
    return this;
  }

  alignItems(
    value: Val<"flex-start" | "flex-end" | "center" | "stretch" | "baseline">,
  ): this {
    setPropReactive(this.node, "alignItems", value as any);
    return this;
  }

  alignSelf(
    value: Val<
      "auto" | "flex-start" | "flex-end" | "center" | "stretch" | "baseline"
    >,
  ): this {
    setPropReactive(this.node, "alignSelf", value as any);
    return this;
  }

  // -----------------------------------------------------------------------
  // Spacing — Padding
  // -----------------------------------------------------------------------

  padding(value: Val<number>): this {
    setPropReactive(this.node, "padding", value as any);
    return this;
  }

  paddingTop(value: Val<number>): this {
    setPropReactive(this.node, "paddingTop", value as any);
    return this;
  }

  paddingRight(value: Val<number>): this {
    setPropReactive(this.node, "paddingRight", value as any);
    return this;
  }

  paddingBottom(value: Val<number>): this {
    setPropReactive(this.node, "paddingBottom", value as any);
    return this;
  }

  paddingLeft(value: Val<number>): this {
    setPropReactive(this.node, "paddingLeft", value as any);
    return this;
  }

  paddingHorizontal(value: Val<number>): this {
    setPropReactive(this.node, "paddingHorizontal", value as any);
    return this;
  }

  paddingVertical(value: Val<number>): this {
    setPropReactive(this.node, "paddingVertical", value as any);
    return this;
  }

  // -----------------------------------------------------------------------
  // Spacing — Margin
  // -----------------------------------------------------------------------

  margin(value: Val<number>): this {
    setPropReactive(this.node, "margin", value as any);
    return this;
  }

  marginTop(value: Val<number>): this {
    setPropReactive(this.node, "marginTop", value as any);
    return this;
  }

  marginRight(value: Val<number>): this {
    setPropReactive(this.node, "marginRight", value as any);
    return this;
  }

  marginBottom(value: Val<number>): this {
    setPropReactive(this.node, "marginBottom", value as any);
    return this;
  }

  marginLeft(value: Val<number>): this {
    setPropReactive(this.node, "marginLeft", value as any);
    return this;
  }

  marginHorizontal(value: Val<number>): this {
    setPropReactive(this.node, "marginHorizontal", value as any);
    return this;
  }

  marginVertical(value: Val<number>): this {
    setPropReactive(this.node, "marginVertical", value as any);
    return this;
  }

  // -----------------------------------------------------------------------
  // Gap
  // -----------------------------------------------------------------------

  gap(value: Val<number>): this {
    setPropReactive(this.node, "gap" as any, value as any);
    return this;
  }

  rowGap(value: Val<number>): this {
    setPropReactive(this.node, "rowGap" as any, value as any);
    return this;
  }

  columnGap(value: Val<number>): this {
    setPropReactive(this.node, "columnGap" as any, value as any);
    return this;
  }

  // -----------------------------------------------------------------------
  // Position
  // -----------------------------------------------------------------------

  position(value: Val<"relative" | "absolute">): this {
    setPropReactive(this.node, "position", value as any);
    return this;
  }

  /** Shorthand: `.absolute()` sets position to "absolute". */
  absolute(): this {
    return this.position("absolute");
  }

  top(value: Val<number | string>): this {
    setPropReactive(this.node, "top", value as any);
    return this;
  }

  right(value: Val<number | string>): this {
    setPropReactive(this.node, "right", value as any);
    return this;
  }

  bottom(value: Val<number | string>): this {
    setPropReactive(this.node, "bottom", value as any);
    return this;
  }

  left(value: Val<number | string>): this {
    setPropReactive(this.node, "left", value as any);
    return this;
  }

  // -----------------------------------------------------------------------
  // Common visual
  // -----------------------------------------------------------------------

  opacity(value: Val<number>): this {
    setPropReactive(this.node, "opacity", value as any);
    return this;
  }

  overflow(value: Val<"visible" | "hidden" | "scroll">): this {
    setPropReactive(this.node, "overflow", value as any);
    return this;
  }

  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  key(value: string): this {
    this.node.key = value;
    return this;
  }
}
