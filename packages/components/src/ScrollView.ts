/**
 * ScrollView — Scrollable container component with physics.
 *
 * Creates a scroll node backed by a ScrollController that provides:
 *  - Touch-driven scrolling with velocity tracking
 *  - iOS-style rubber-band overscroll
 *  - Deceleration (friction-based fling)
 *  - Bounce-back spring to boundaries
 *  - Snap-to-interval and paging
 *  - Scroll events (onScroll, onScrollEnd, drag events)
 *
 * Inherits all layout modifiers from ComponentBase (padding, margin,
 * flex, size, etc.) plus visual modifiers for background and border.
 *
 * @example
 * ```ts
 * import { ScrollView, View, Text } from '@zilol-native/components';
 * import { signal } from '@zilol-native/runtime';
 *
 * // Vertical list
 * const list = ScrollView(
 *   ...items.map((item) =>
 *     View(Text(item.title).color('#FFF'))
 *       .padding(16)
 *       .backgroundColor('#1E293B')
 *       .borderRadius(8),
 *   ),
 * )
 *   .flex(1)
 *   .gap(8)
 *   .padding(16)
 *   .backgroundColor('#0A1628');
 *
 * // Horizontal carousel with snapping
 * const offset = signal({ x: 0, y: 0 });
 *
 * ScrollView(...cards)
 *   .horizontal()
 *   .showsScrollIndicator(false)
 *   .snapToInterval(320)
 *   .decelerationRate('fast')
 *   .onScroll((pos) => { offset.value = pos; });
 * ```
 */

import { createScrollNode } from "@zilol-native/nodes";
import { effect } from "@zilol-native/runtime";
import type { SkiaNode, BorderRadius, ShadowProps } from "@zilol-native/nodes";
import { ScrollController } from "@zilol-native/gestures";
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
// ScrollViewBuilder
// ---------------------------------------------------------------------------

export class ScrollViewBuilder extends ComponentBase {
  readonly node: SkiaNode;
  private readonly _controller: ScrollController;

  constructor(children: ComponentChild[]) {
    super();
    this.node = createScrollNode();

    for (let i = 0; i < children.length; i++) {
      const resolved = resolveNode(children[i]);
      if (resolved !== null) {
        this.node.appendChild(resolved);
      }
    }

    // Attach scroll controller for touch-driven physics
    this._controller = new ScrollController(this.node);

    // Wire touch events → ScrollController
    // These fire when the scroll node is hit directly, or via event bubbling
    // from child nodes (e.g. user drags on a card inside the scroll)
    const ctrl = this._controller;

    this.node.props.onTouchStart = (e: any) => {
      ctrl.onTouchBegan(e.pointerId, e.x, e.y, e.timestamp);
    };

    this.node.props.onTouchMove = (e: any) => {
      ctrl.onTouchMoved(e.pointerId, e.x, e.y, e.timestamp);
    };

    this.node.props.onTouchEnd = (e: any) => {
      ctrl.onTouchEnded(e.pointerId, e.timestamp);
    };
  }

  // -----------------------------------------------------------------------
  // Scroll behaviour
  // -----------------------------------------------------------------------

  /**
   * Enable horizontal scrolling (default is vertical).
   * Sets the scroll axis — children flow accordingly.
   */
  horizontal(value: Val<boolean> = true): this {
    setProp(this.node, "horizontal", value);
    return this;
  }

  /** Enable/disable iOS-style rubber banding on overscroll (default: true). */
  bounces(value: Val<boolean> = true): this {
    setProp(this.node, "bounces", value);
    return this;
  }

  /** Show/hide scroll indicators (default: true). */
  showsScrollIndicator(value: Val<boolean> = true): this {
    setProp(this.node, "showsScrollIndicator", value);
    return this;
  }

  /** Set the scroll offset programmatically (x axis). */
  scrollX(value: Val<number>): this {
    setProp(this.node, "scrollX", value);
    return this;
  }

  /** Set the scroll offset programmatically (y axis). */
  scrollY(value: Val<number>): this {
    setProp(this.node, "scrollY", value);
    return this;
  }

  /** Snap to intervals — children are snapped at multiples of this value. */
  snapToInterval(value: Val<number>): this {
    setProp(this.node, "snapToInterval", value);
    return this;
  }

  /**
   * Deceleration rate for fling:
   * - `'normal'` (0.998) — default iOS behavior
   * - `'fast'` (0.99) — stops quickly, good for pickers
   * - custom number (0…1) — lower = faster deceleration
   */
  decelerationRate(value: Val<"normal" | "fast" | number>): this {
    setProp(this.node, "decelerationRate", value);
    return this;
  }

  /** Enable/disable scrolling (default: true). Content remains clipped. */
  scrollEnabled(value: Val<boolean> = true): this {
    setProp(this.node, "scrollEnabled", value);
    return this;
  }

  /**
   * Enable paging mode — scroll stops at multiples of the viewport size.
   * Useful for onboarding flows, photo galleries, etc.
   */
  pagingEnabled(value: Val<boolean> = true): this {
    setProp(this.node, "pagingEnabled", value);
    return this;
  }

  // -----------------------------------------------------------------------
  // Scroll event callbacks
  // -----------------------------------------------------------------------

  /** Called on every scroll offset change with { x, y }. */
  onScroll(handler: (offset: { x: number; y: number }) => void): this {
    this.node.setProp("onScroll", handler);
    return this;
  }

  /** Called when scroll momentum settles (deceleration/bounce/snap complete). */
  onScrollEnd(handler: (offset: { x: number; y: number }) => void): this {
    this.node.setProp("onScrollEnd", handler);
    return this;
  }

  /** Called when the user begins dragging. */
  onScrollBeginDrag(handler: () => void): this {
    this.node.setProp("onScrollBeginDrag", handler);
    return this;
  }

  /** Called when the user stops dragging (may still be decelerating). */
  onScrollEndDrag(handler: () => void): this {
    this.node.setProp("onScrollEndDrag", handler);
    return this;
  }

  // -----------------------------------------------------------------------
  // Programmatic scrolling
  // -----------------------------------------------------------------------

  /**
   * Scroll to a specific offset.
   *
   * @param x        Target X offset.
   * @param y        Target Y offset.
   * @param animated Whether to animate (spring) or jump instantly.
   */
  scrollTo(x: number, y: number, animated: boolean = true): this {
    this._controller.scrollTo(x, y, animated);
    return this;
  }

  /** Access the underlying ScrollController for advanced use. */
  get controller(): ScrollController {
    return this._controller;
  }

  // -----------------------------------------------------------------------
  // Visual (same as View)
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
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a scrollable container with optional children.
 *
 * @param children - Child components
 * @returns A ScrollViewBuilder with chainable modifiers
 *
 * @example
 * ```ts
 * // Vertical scroll
 * ScrollView(child1, child2, child3)
 *   .flex(1)
 *   .backgroundColor('#0F172A');
 *
 * // Horizontal carousel with snap
 * ScrollView(...cards)
 *   .horizontal()
 *   .showsScrollIndicator(false)
 *   .snapToInterval(320)
 *   .decelerationRate('fast');
 *
 * // Paging
 * ScrollView(...pages)
 *   .pagingEnabled()
 *   .bounces(false);
 * ```
 */
export function ScrollView(...children: ComponentChild[]): ScrollViewBuilder {
  return new ScrollViewBuilder(children);
}
