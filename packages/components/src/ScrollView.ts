/**
 * ScrollView — Scrollable container component with physics.
 *
 * Creates a scroll node backed by the C++ ScrollEngine that provides:
 *  - Touch-driven scrolling with velocity tracking (in C++)
 *  - iOS-style rubber-band overscroll (in C++)
 *  - Deceleration (friction-based fling) (in C++)
 *  - Bounce-back spring to boundaries (in C++)
 *  - Snap-to-interval and paging (in C++)
 *  - Scroll events (onScroll, onScrollEnd) via JS callbacks
 *
 * All physics runs in C++ — JS only receives onScroll/onScrollEnd
 * callbacks when the offset changes.
 *
 * @example
 * ```ts
 * ScrollView(child1, child2, child3)
 *   .flex(1)
 *   .backgroundColor('#0F172A');
 *
 * ScrollView(...cards)
 *   .horizontal()
 *   .snapToInterval(320)
 *   .decelerationRate('fast');
 * ```
 */

import { createScrollNode } from "@zilol-native/nodes";
import { effect } from "@zilol-native/runtime";
import type { SkiaNode, BorderRadius, ShadowProps } from "@zilol-native/nodes";
import { ComponentBase } from "./ComponentBase";
import { resolveNode } from "./types";
import type { ComponentChild } from "./types";

// ---------------------------------------------------------------------------
// C++ scroll engine bridge (JSI globals)
// ---------------------------------------------------------------------------

declare function __scrollCreate(nodeId: number): number;
declare function __scrollTouch(
  engineId: number,
  phase: number,
  x: number,
  y: number,
  timestamp: number,
  pointerId: number,
): boolean | undefined;
declare function __scrollTo(
  engineId: number,
  x: number,
  y: number,
  animated: boolean,
): void;
declare function __scrollSetConfig(
  engineId: number,
  key: string,
  value: any,
): void;
declare function __scrollSetCallbacks(
  engineId: number,
  onScroll: ((x: number, y: number) => void) | null,
  onScrollEnd: ((x: number, y: number) => void) | null,
): void;

const hasCppScroll = typeof (globalThis as any).__scrollCreate === "function";

// ---------------------------------------------------------------------------
// Reactive setter helper
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
  private _scrollEngineId: number = 0;

  constructor(children: ComponentChild[]) {
    super();
    this.node = createScrollNode();

    for (let i = 0; i < children.length; i++) {
      const resolved = resolveNode(children[i]);
      if (resolved !== null) {
        this.node.appendChild(resolved);
      }
    }

    // Create C++ scroll engine bound to this node
    if (hasCppScroll && (this.node as any).cppNodeId) {
      this._scrollEngineId = __scrollCreate((this.node as any).cppNodeId);

      // Wire touch events → C++ scroll engine
      const eid = this._scrollEngineId;
      this.node.props.onTouchStart = (e: any) => {
        __scrollTouch(eid, 0, e.x, e.y, e.timestamp, e.pointerId);
      };
      this.node.props.onTouchMove = (e: any) => {
        __scrollTouch(eid, 1, e.x, e.y, e.timestamp, e.pointerId);
      };
      this.node.props.onTouchEnd = (e: any) => {
        __scrollTouch(eid, 2, e.x, e.y, e.timestamp, e.pointerId);
      };
    }
  }

  // -----------------------------------------------------------------------
  // Scroll behaviour
  // -----------------------------------------------------------------------

  horizontal(value: Val<boolean> = true): this {
    setProp(this.node, "horizontal", value);
    if (hasCppScroll && this._scrollEngineId) {
      __scrollSetConfig(
        this._scrollEngineId,
        "horizontal",
        typeof value === "function" ? value() : value,
      );
    }
    return this;
  }

  bounces(value: Val<boolean> = true): this {
    setProp(this.node, "bounces", value);
    if (hasCppScroll && this._scrollEngineId) {
      __scrollSetConfig(
        this._scrollEngineId,
        "bounces",
        typeof value === "function" ? value() : value,
      );
    }
    return this;
  }

  showsScrollIndicator(value: Val<boolean> = true): this {
    setProp(this.node, "showsScrollIndicator", value);
    return this;
  }

  scrollX(value: Val<number>): this {
    setProp(this.node, "scrollX", value);
    return this;
  }

  scrollY(value: Val<number>): this {
    setProp(this.node, "scrollY", value);
    return this;
  }

  snapToInterval(value: Val<number>): this {
    setProp(this.node, "snapToInterval", value);
    if (hasCppScroll && this._scrollEngineId) {
      __scrollSetConfig(
        this._scrollEngineId,
        "snapToInterval",
        typeof value === "function" ? value() : value,
      );
    }
    return this;
  }

  decelerationRate(value: Val<"normal" | "fast" | number>): this {
    setProp(this.node, "decelerationRate", value);
    if (hasCppScroll && this._scrollEngineId) {
      __scrollSetConfig(
        this._scrollEngineId,
        "decelerationRate",
        typeof value === "function" ? value() : value,
      );
    }
    return this;
  }

  scrollEnabled(value: Val<boolean> = true): this {
    setProp(this.node, "scrollEnabled", value);
    if (hasCppScroll && this._scrollEngineId) {
      __scrollSetConfig(
        this._scrollEngineId,
        "scrollEnabled",
        typeof value === "function" ? value() : value,
      );
    }
    return this;
  }

  pagingEnabled(value: Val<boolean> = true): this {
    setProp(this.node, "pagingEnabled", value);
    if (hasCppScroll && this._scrollEngineId) {
      __scrollSetConfig(
        this._scrollEngineId,
        "pagingEnabled",
        typeof value === "function" ? value() : value,
      );
    }
    return this;
  }

  // -----------------------------------------------------------------------
  // Scroll event callbacks
  // -----------------------------------------------------------------------

  onScroll(handler: (offset: { x: number; y: number }) => void): this {
    this.node.setProp("onScroll", handler);
    if (hasCppScroll && this._scrollEngineId) {
      __scrollSetCallbacks(
        this._scrollEngineId,
        (x, y) => handler({ x, y }),
        null,
      );
    }
    return this;
  }

  onScrollEnd(handler: (offset: { x: number; y: number }) => void): this {
    this.node.setProp("onScrollEnd", handler);
    if (hasCppScroll && this._scrollEngineId) {
      __scrollSetCallbacks(this._scrollEngineId, null, (x, y) =>
        handler({ x, y }),
      );
    }
    return this;
  }

  onScrollBeginDrag(handler: () => void): this {
    this.node.setProp("onScrollBeginDrag", handler);
    return this;
  }

  onScrollEndDrag(handler: () => void): this {
    this.node.setProp("onScrollEndDrag", handler);
    return this;
  }

  // -----------------------------------------------------------------------
  // Programmatic scrolling
  // -----------------------------------------------------------------------

  scrollTo(x: number, y: number, animated: boolean = true): this {
    if (hasCppScroll && this._scrollEngineId) {
      __scrollTo(this._scrollEngineId, x, y, animated);
    }
    return this;
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
 * ScrollView(child1, child2, child3)
 *   .flex(1)
 *   .backgroundColor('#0F172A');
 *
 * ScrollView(...cards)
 *   .horizontal()
 *   .snapToInterval(320)
 *   .decelerationRate('fast');
 * ```
 */
export function ScrollView(...children: ComponentChild[]): ScrollViewBuilder {
  return new ScrollViewBuilder(children);
}
