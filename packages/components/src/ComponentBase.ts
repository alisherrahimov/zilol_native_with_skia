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

  flexWrap(value: Val<"nowrap" | "wrap" | "wrap-reverse">): this {
    setPropReactive(this.node, "flexWrap" as any, value as any);
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
  // Safe Area
  // -----------------------------------------------------------------------

  /**
   * Apply safe area insets as padding to avoid the notch, home indicator, etc.
   *
   * @param edges - Which edges to apply. `"all"` | `"top"` | `"bottom"` | `"horizontal"` | `"vertical"` or omit for all.
   *
   * @example
   * ```ts
   * View(...).safeArea();           // all edges
   * View(...).safeArea("top");      // only status bar
   * View(...).safeArea("bottom");   // only home indicator
   * ```
   */
  safeArea(
    edges?:
      | "all"
      | "top"
      | "bottom"
      | "left"
      | "right"
      | "horizontal"
      | "vertical",
  ): this {
    const insets = (globalThis as any).__getSafeAreaInsets?.() ?? {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };
    const edge = edges ?? "all";

    if (edge === "all") {
      if (insets.top > 0) this.paddingTop(insets.top);
      if (insets.bottom > 0) this.paddingBottom(insets.bottom);
      if (insets.left > 0) this.paddingLeft(insets.left);
      if (insets.right > 0) this.paddingRight(insets.right);
    } else if (edge === "top") {
      if (insets.top > 0) this.paddingTop(insets.top);
    } else if (edge === "bottom") {
      if (insets.bottom > 0) this.paddingBottom(insets.bottom);
    } else if (edge === "left") {
      if (insets.left > 0) this.paddingLeft(insets.left);
    } else if (edge === "right") {
      if (insets.right > 0) this.paddingRight(insets.right);
    } else if (edge === "horizontal") {
      if (insets.left > 0) this.paddingLeft(insets.left);
      if (insets.right > 0) this.paddingRight(insets.right);
    } else if (edge === "vertical") {
      if (insets.top > 0) this.paddingTop(insets.top);
      if (insets.bottom > 0) this.paddingBottom(insets.bottom);
    }
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
  // Transform
  // -----------------------------------------------------------------------

  /** Rotate in degrees. */
  rotate(value: Val<number>): this {
    setPropReactive(this.node, "rotation" as any, value as any);
    return this;
  }

  /** Uniform scale. */
  scale(value: Val<number>): this {
    setPropReactive(this.node, "scale" as any, value as any);
    return this;
  }

  scaleX(value: Val<number>): this {
    setPropReactive(this.node, "scaleX" as any, value as any);
    return this;
  }

  scaleY(value: Val<number>): this {
    setPropReactive(this.node, "scaleY" as any, value as any);
    return this;
  }

  translateX(value: Val<number>): this {
    setPropReactive(this.node, "translateX" as any, value as any);
    return this;
  }

  translateY(value: Val<number>): this {
    setPropReactive(this.node, "translateY" as any, value as any);
    return this;
  }

  // -----------------------------------------------------------------------
  // Per-side borders
  // -----------------------------------------------------------------------

  borderTopWidth(value: Val<number>): this {
    setPropReactive(this.node, "borderTopWidth" as any, value as any);
    return this;
  }

  borderRightWidth(value: Val<number>): this {
    setPropReactive(this.node, "borderRightWidth" as any, value as any);
    return this;
  }

  borderBottomWidth(value: Val<number>): this {
    setPropReactive(this.node, "borderBottomWidth" as any, value as any);
    return this;
  }

  borderLeftWidth(value: Val<number>): this {
    setPropReactive(this.node, "borderLeftWidth" as any, value as any);
    return this;
  }

  borderTopColor(value: Val<string>): this {
    setPropReactive(this.node, "borderTopColor" as any, value as any);
    return this;
  }

  borderRightColor(value: Val<string>): this {
    setPropReactive(this.node, "borderRightColor" as any, value as any);
    return this;
  }

  borderBottomColor(value: Val<string>): this {
    setPropReactive(this.node, "borderBottomColor" as any, value as any);
    return this;
  }

  borderLeftColor(value: Val<string>): this {
    setPropReactive(this.node, "borderLeftColor" as any, value as any);
    return this;
  }

  // -----------------------------------------------------------------------
  // zIndex
  // -----------------------------------------------------------------------

  zIndex(value: Val<number>): this {
    setPropReactive(this.node, "zIndex" as any, value as any);
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
