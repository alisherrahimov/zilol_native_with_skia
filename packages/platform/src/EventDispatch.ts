/**
 * EventDispatch.ts — Touch event dispatch from native → SkiaNode tree.
 *
 * The native layer sends raw touch events (began/moved/ended/cancelled)
 * via JSI. This module:
 * 1. Hit tests to find the target node
 * 2. Dispatches events to the target and bubbles up through ancestors
 * 3. Tracks active touches for multi-touch support
 */

import type { SkiaNode } from "@zilol-native/nodes";
import { hitTest } from "./HitTest";
import type { Point } from "./HitTest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Touch event phases from the native side. */
export const enum TouchPhase {
  Began = 0,
  Moved = 1,
  Ended = 2,
  Cancelled = 3,
}

/** Touch event payload passed to handlers. */
export interface TouchEvent {
  /** Screen x coordinate. */
  x: number;
  /** Screen y coordinate. */
  y: number;
  /** Unique pointer identifier for multi-touch. */
  pointerId: number;
  /** Touch phase. */
  phase: TouchPhase;
  /** The SkiaNode that was hit. */
  target: SkiaNode;
  /** Timestamp. */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Active touch tracking
// ---------------------------------------------------------------------------

interface ActiveTouch {
  target: SkiaNode;
  startX: number;
  startY: number;
}

// ---------------------------------------------------------------------------
// EventDispatcher
// ---------------------------------------------------------------------------

export class EventDispatcher {
  private _rootNode: SkiaNode | null = null;
  private _activeTouches: Map<number, ActiveTouch> = new Map();

  /**
   * Set the root node for hit testing.
   */
  setRoot(root: SkiaNode): void {
    this._rootNode = root;
  }

  /**
   * Handle a raw touch event from the native layer.
   * Called by the JSI touch handler registered via `__registerTouchHandler`.
   */
  handleTouch(phase: number, x: number, y: number, pointerId: number): void {
    if (!this._rootNode) return;

    const point: Point = { x, y };

    switch (phase as TouchPhase) {
      case TouchPhase.Began:
        this._handleTouchBegan(point, pointerId);
        break;
      case TouchPhase.Moved:
        this._handleTouchMoved(point, pointerId);
        break;
      case TouchPhase.Ended:
        this._handleTouchEnded(point, pointerId);
        break;
      case TouchPhase.Cancelled:
        this._handleTouchCancelled(point, pointerId);
        break;
    }
  }

  /**
   * Clear all active touches (e.g. on root change).
   */
  reset(): void {
    this._activeTouches.clear();
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private _handleTouchBegan(point: Point, pointerId: number): void {
    const target = hitTest(this._rootNode!, point);
    if (!target) return;

    this._activeTouches.set(pointerId, {
      target,
      startX: point.x,
      startY: point.y,
    });

    const event = this._makeEvent(point, pointerId, TouchPhase.Began, target);

    // Fire onTouchStart / onPressIn on target
    this._callHandler(target, "onTouchStart", event);
    this._callHandler(target, "onPressIn", event);

    // Bubble up
    this._bubbleEvent(target.parent, "onTouchStart", event);
  }

  private _handleTouchMoved(point: Point, pointerId: number): void {
    const active = this._activeTouches.get(pointerId);
    if (!active) return;

    const event = this._makeEvent(
      point,
      pointerId,
      TouchPhase.Moved,
      active.target,
    );

    this._callHandler(active.target, "onTouchMove", event);
    this._bubbleEvent(active.target.parent, "onTouchMove", event);
  }

  private _handleTouchEnded(point: Point, pointerId: number): void {
    const active = this._activeTouches.get(pointerId);
    if (!active) return;

    const event = this._makeEvent(
      point,
      pointerId,
      TouchPhase.Ended,
      active.target,
    );

    // Fire onTouchEnd
    this._callHandler(active.target, "onTouchEnd", event);

    // Fire onPressOut
    this._callHandler(active.target, "onPressOut", event);

    // Fire onPress if still within original target bounds
    if (this._isInBounds(point, active.target)) {
      this._callHandler(active.target, "onPress", event);
    }

    // Bubble
    this._bubbleEvent(active.target.parent, "onTouchEnd", event);

    this._activeTouches.delete(pointerId);
  }

  private _handleTouchCancelled(point: Point, pointerId: number): void {
    const active = this._activeTouches.get(pointerId);
    if (!active) return;

    const event = this._makeEvent(
      point,
      pointerId,
      TouchPhase.Cancelled,
      active.target,
    );

    this._callHandler(active.target, "onPressOut", event);
    this._callHandler(active.target, "onTouchEnd", event);

    this._activeTouches.delete(pointerId);
  }

  private _makeEvent(
    point: Point,
    pointerId: number,
    phase: TouchPhase,
    target: SkiaNode,
  ): TouchEvent {
    return {
      x: point.x,
      y: point.y,
      pointerId,
      phase,
      target,
      timestamp: Date.now(),
    };
  }

  private _callHandler(
    node: SkiaNode,
    handlerName: string,
    event: TouchEvent,
  ): void {
    const handler = node.props[handlerName] as
      | ((e: TouchEvent) => void)
      | undefined;
    if (typeof handler === "function") {
      handler(event);
    }
  }

  private _bubbleEvent(
    node: SkiaNode | null,
    handlerName: string,
    event: TouchEvent,
  ): void {
    let current = node;
    while (current) {
      this._callHandler(current, handlerName, event);
      current = current.parent;
    }
  }

  private _isInBounds(point: Point, node: SkiaNode): boolean {
    const localX = point.x - node.layout.absoluteX;
    const localY = point.y - node.layout.absoluteY;
    return (
      localX >= 0 &&
      localX <= node.layout.width &&
      localY >= 0 &&
      localY <= node.layout.height
    );
  }
}
