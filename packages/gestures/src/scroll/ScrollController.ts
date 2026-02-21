/**
 * ScrollController.ts — Stateful scroll lifecycle manager.
 *
 * Bound to a single SkiaNode of type "scroll". Manages the full
 * touch-to-scroll pipeline:
 *
 *   touch began → capture
 *   touch moved → apply delta (with rubber-band if overscrolling)
 *   touch ended → compute fling velocity → deceleration animation
 *   frame tick  → apply physics → update offset → fire callbacks
 *   settled     → bounce-back if overscrolled, snap if configured
 *
 * Uses __skiaRequestFrame / __skiaCancelFrame for frame scheduling
 * (CADisplayLink on iOS, Choreographer on Android).
 */

import type { SkiaNode } from "@zilol-native/nodes";
import { VelocityTracker } from "./VelocityTracker";
import {
  decelerationStep,
  springStep,
  rubberBandClamp,
  findSnapTarget,
  findPageTarget,
  clamp,
  resolveDecelerationRate,
  DECELERATION_RATE_NORMAL,
  type DecelerationState,
  type SpringState,
} from "./ScrollPhysics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Scroll offset. */
export interface ScrollOffset {
  readonly x: number;
  readonly y: number;
}

/** Phase of the scroll lifecycle. */
const enum ScrollPhase {
  /** No scroll activity. */
  Idle,
  /** User is actively dragging. */
  Dragging,
  /** Post-fling deceleration. */
  Decelerating,
  /** Spring bounce-back to boundary. */
  Bouncing,
  /** Spring snap to target. */
  Snapping,
}

// ---------------------------------------------------------------------------
// ScrollController
// ---------------------------------------------------------------------------

export class ScrollController {
  // --- Bound node ---
  private readonly _node: SkiaNode;

  // --- State ---
  private _phase: ScrollPhase = ScrollPhase.Idle;
  private _offsetX: number = 0;
  private _offsetY: number = 0;
  private _velocityX: number = 0;
  private _velocityY: number = 0;

  // --- Touch tracking ---
  private _trackerX: VelocityTracker = new VelocityTracker();
  private _trackerY: VelocityTracker = new VelocityTracker();
  private _lastTouchX: number = 0;
  private _lastTouchY: number = 0;
  private _activePointerId: number = -1;

  // --- Animation ---
  private _frameId: number = 0;
  private _lastFrameTimestamp: number = 0;
  private _snapTargetX: number = 0;
  private _snapTargetY: number = 0;

  // --- Content bounds ---
  private _contentWidth: number = 0;
  private _contentHeight: number = 0;
  private _viewportWidth: number = 0;
  private _viewportHeight: number = 0;

  constructor(node: SkiaNode) {
    this._node = node;
    this._onFrame = this._onFrame.bind(this);
  }

  // -----------------------------------------------------------------------
  // Public API — called by touch event dispatcher
  // -----------------------------------------------------------------------

  /**
   * Handle touch-began. Captures the scroll if appropriate.
   *
   * @returns true if the touch was captured by this scroll.
   */
  onTouchBegan(
    pointerId: number,
    x: number,
    y: number,
    timestamp: number,
  ): boolean {
    if (!this._isScrollEnabled()) return false;

    // Stop any running animation
    this._cancelAnimation();

    this._phase = ScrollPhase.Dragging;
    this._activePointerId = pointerId;
    this._lastTouchX = x;
    this._lastTouchY = y;

    this._trackerX.reset();
    this._trackerY.reset();
    this._trackerX.addPoint(timestamp, x);
    this._trackerY.addPoint(timestamp, y);

    this._updateBounds();

    // Fire callback
    const onBeginDrag = this._node.props.onScrollBeginDrag as
      | (() => void)
      | undefined;
    if (onBeginDrag) onBeginDrag();

    return true;
  }

  /**
   * Handle touch-moved. Updates scroll offset.
   */
  onTouchMoved(
    pointerId: number,
    x: number,
    y: number,
    timestamp: number,
  ): void {
    if (this._phase !== ScrollPhase.Dragging) return;
    if (pointerId !== this._activePointerId) return;

    this._trackerX.addPoint(timestamp, x);
    this._trackerY.addPoint(timestamp, y);

    const deltaX = x - this._lastTouchX;
    const deltaY = y - this._lastTouchY;
    this._lastTouchX = x;
    this._lastTouchY = y;

    const horizontal = this._isHorizontal();
    const maxX = this._maxScrollX();
    const maxY = this._maxScrollY();

    // Apply delta with rubber-band if overscrolling
    if (horizontal) {
      this._offsetX = this._applyDelta(
        this._offsetX,
        -deltaX,
        0,
        maxX,
        this._viewportWidth,
      );
    } else {
      this._offsetY = this._applyDelta(
        this._offsetY,
        -deltaY,
        0,
        maxY,
        this._viewportHeight,
      );
    }

    this._commitOffset();
  }

  /**
   * Handle touch-ended. Starts fling animation.
   */
  onTouchEnded(pointerId: number, timestamp: number): void {
    if (this._phase !== ScrollPhase.Dragging) return;
    if (pointerId !== this._activePointerId) return;

    this._activePointerId = -1;

    const onEndDrag = this._node.props.onScrollEndDrag as
      | (() => void)
      | undefined;
    if (onEndDrag) onEndDrag();

    // Compute fling velocity
    this._velocityX = this._trackerX.getVelocity();
    this._velocityY = this._trackerY.getVelocity();

    // Negate because tracker measures touch position (finger moves up → scroll down)
    this._velocityX = -this._velocityX;
    this._velocityY = -this._velocityY;

    const horizontal = this._isHorizontal();
    const maxX = this._maxScrollX();
    const maxY = this._maxScrollY();

    // If overscrolled, bounce back immediately
    if (horizontal && this._isOverscrolled(this._offsetX, 0, maxX)) {
      this._startBounce();
      return;
    }
    if (!horizontal && this._isOverscrolled(this._offsetY, 0, maxY)) {
      this._startBounce();
      return;
    }

    // If snap or paging is configured, snap to target
    const snapInterval = this._node.props.snapToInterval as number | undefined;
    const pagingEnabled = this._node.props.pagingEnabled as boolean | undefined;

    if (pagingEnabled) {
      this._startSnap(horizontal, maxX, maxY, true);
      return;
    }

    if (snapInterval && snapInterval > 0) {
      this._startSnap(horizontal, maxX, maxY, false);
      return;
    }

    // Start deceleration
    this._startDeceleration();
  }

  /**
   * Handle touch-cancelled.
   */
  onTouchCancelled(pointerId: number): void {
    if (pointerId !== this._activePointerId) return;
    this._activePointerId = -1;

    // Bounce back if overscrolled, otherwise just stop
    const horizontal = this._isHorizontal();
    const maxX = this._maxScrollX();
    const maxY = this._maxScrollY();

    if (
      (horizontal && this._isOverscrolled(this._offsetX, 0, maxX)) ||
      (!horizontal && this._isOverscrolled(this._offsetY, 0, maxY))
    ) {
      this._startBounce();
    } else {
      this._phase = ScrollPhase.Idle;
    }
  }

  /**
   * Programmatically scroll to an offset.
   *
   * @param x      Target X offset.
   * @param y      Target Y offset.
   * @param animated Whether to animate.
   */
  scrollTo(x: number, y: number, animated: boolean = true): void {
    this._cancelAnimation();
    this._updateBounds();

    const maxX = this._maxScrollX();
    const maxY = this._maxScrollY();
    const targetX = clamp(x, 0, maxX);
    const targetY = clamp(y, 0, maxY);

    if (!animated) {
      this._offsetX = targetX;
      this._offsetY = targetY;
      this._commitOffset();
      this._fireScrollEnd();
      return;
    }

    // Animate with spring
    this._snapTargetX = targetX;
    this._snapTargetY = targetY;
    this._velocityX = 0;
    this._velocityY = 0;
    this._phase = ScrollPhase.Snapping;
    this._startFrameLoop();
  }

  /** Current scroll offset. */
  get offset(): ScrollOffset {
    return { x: this._offsetX, y: this._offsetY };
  }

  /** Whether the controller is currently animating. */
  get isAnimating(): boolean {
    return (
      this._phase !== ScrollPhase.Idle && this._phase !== ScrollPhase.Dragging
    );
  }

  /** Dispose — cancel any running animation. */
  dispose(): void {
    this._cancelAnimation();
  }

  // -----------------------------------------------------------------------
  // Internal — Physics animation loop
  // -----------------------------------------------------------------------

  private _onFrame(timestamp: number): void {
    if (
      this._phase === ScrollPhase.Idle ||
      this._phase === ScrollPhase.Dragging
    ) {
      return;
    }

    const dt =
      this._lastFrameTimestamp > 0
        ? Math.min(timestamp - this._lastFrameTimestamp, 32) // cap at ~30fps to prevent spiral
        : 16.67;
    this._lastFrameTimestamp = timestamp;

    const horizontal = this._isHorizontal();
    const maxX = this._maxScrollX();
    const maxY = this._maxScrollY();

    let finished = false;

    switch (this._phase) {
      case ScrollPhase.Decelerating:
        finished = this._stepDeceleration(dt, horizontal, maxX, maxY);
        break;
      case ScrollPhase.Bouncing:
        finished = this._stepBounce(dt, horizontal, maxX, maxY);
        break;
      case ScrollPhase.Snapping:
        finished = this._stepSnap(dt);
        break;
    }

    this._commitOffset();

    if (finished) {
      this._phase = ScrollPhase.Idle;
      this._lastFrameTimestamp = 0;
      this._fireScrollEnd();
    } else {
      this._frameId = __skiaRequestFrame(this._onFrame);
    }
  }

  // --- Deceleration ---

  private _startDeceleration(): void {
    const horizontal = this._isHorizontal();
    const velocity = horizontal ? this._velocityX : this._velocityY;

    if (Math.abs(velocity) < 0.05) {
      this._phase = ScrollPhase.Idle;
      this._fireScrollEnd();
      return;
    }

    this._phase = ScrollPhase.Decelerating;
    this._startFrameLoop();
  }

  private _stepDeceleration(
    dt: number,
    horizontal: boolean,
    maxX: number,
    maxY: number,
  ): boolean {
    const rate = this._getDecelerationRate();

    if (horizontal) {
      const state = decelerationStep(
        this._offsetX,
        this._velocityX,
        dt,
        rate,
        0,
        maxX,
      );
      this._offsetX = state.offset;
      this._velocityX = state.velocity;

      if (state.finished) {
        // Hit boundary or stopped → bounce if overscrolled
        if (this._isOverscrolled(this._offsetX, 0, maxX)) {
          this._startBounce();
          return false; // not finished, transitioning to bounce
        }
        // Check snap
        return this._checkSnapAfterDeceleration(horizontal, maxX, maxY);
      }
    } else {
      const state = decelerationStep(
        this._offsetY,
        this._velocityY,
        dt,
        rate,
        0,
        maxY,
      );
      this._offsetY = state.offset;
      this._velocityY = state.velocity;

      if (state.finished) {
        if (this._isOverscrolled(this._offsetY, 0, maxY)) {
          this._startBounce();
          return false;
        }
        return this._checkSnapAfterDeceleration(horizontal, maxX, maxY);
      }
    }

    return false;
  }

  private _checkSnapAfterDeceleration(
    horizontal: boolean,
    maxX: number,
    maxY: number,
  ): boolean {
    const snapInterval = this._node.props.snapToInterval as number | undefined;
    if (snapInterval && snapInterval > 0) {
      this._startSnap(horizontal, maxX, maxY, false);
      return false;
    }
    return true;
  }

  // --- Bounce ---

  private _startBounce(): void {
    this._phase = ScrollPhase.Bouncing;
    this._startFrameLoop();
  }

  private _stepBounce(
    dt: number,
    horizontal: boolean,
    maxX: number,
    maxY: number,
  ): boolean {
    if (horizontal) {
      const target = clamp(this._offsetX, 0, maxX);
      const state = springStep(this._offsetX, this._velocityX, target, dt);
      this._offsetX = state.offset;
      this._velocityX = state.velocity;
      return state.finished;
    } else {
      const target = clamp(this._offsetY, 0, maxY);
      const state = springStep(this._offsetY, this._velocityY, target, dt);
      this._offsetY = state.offset;
      this._velocityY = state.velocity;
      return state.finished;
    }
  }

  // --- Snap ---

  private _startSnap(
    horizontal: boolean,
    maxX: number,
    maxY: number,
    isPaging: boolean,
  ): void {
    const snapInterval = this._node.props.snapToInterval as number | undefined;
    const rate = this._getDecelerationRate();

    if (horizontal) {
      if (isPaging) {
        this._snapTargetX = findPageTarget(
          this._offsetX,
          this._velocityX,
          this._viewportWidth,
          0,
          maxX,
        );
      } else {
        this._snapTargetX = findSnapTarget(
          this._offsetX,
          this._velocityX,
          snapInterval!,
          0,
          maxX,
          rate,
        );
      }
      this._snapTargetY = this._offsetY;
    } else {
      if (isPaging) {
        this._snapTargetY = findPageTarget(
          this._offsetY,
          this._velocityY,
          this._viewportHeight,
          0,
          maxY,
        );
      } else {
        this._snapTargetY = findSnapTarget(
          this._offsetY,
          this._velocityY,
          snapInterval!,
          0,
          maxY,
          rate,
        );
      }
      this._snapTargetX = this._offsetX;
    }

    this._phase = ScrollPhase.Snapping;
    this._startFrameLoop();
  }

  private _stepSnap(dt: number): boolean {
    const stateX = springStep(
      this._offsetX,
      this._velocityX,
      this._snapTargetX,
      dt,
    );
    const stateY = springStep(
      this._offsetY,
      this._velocityY,
      this._snapTargetY,
      dt,
    );

    this._offsetX = stateX.offset;
    this._velocityX = stateX.velocity;
    this._offsetY = stateY.offset;
    this._velocityY = stateY.velocity;

    return stateX.finished && stateY.finished;
  }

  // -----------------------------------------------------------------------
  // Internal — Helpers
  // -----------------------------------------------------------------------

  /** Apply a delta with rubber-band resistance if overscrolling. */
  private _applyDelta(
    offset: number,
    delta: number,
    minOffset: number,
    maxOffset: number,
    viewportSize: number,
  ): number {
    const bounces = this._node.props.bounces !== false; // defaults to true

    if (!bounces) {
      // No rubber-band — hard clamp
      return clamp(offset + delta, minOffset, maxOffset);
    }

    // In bounds — apply directly
    if (offset >= minOffset && offset <= maxOffset) {
      const next = offset + delta;
      // Would go out of bounds?
      if (next < minOffset) {
        // Partially apply, rest is rubber-banded
        const inBoundsDelta = minOffset - offset;
        const overDelta = delta - inBoundsDelta;
        return minOffset + rubberBandClamp(overDelta, 0, viewportSize);
      }
      if (next > maxOffset) {
        const inBoundsDelta = maxOffset - offset;
        const overDelta = delta - inBoundsDelta;
        return maxOffset + rubberBandClamp(overDelta, 0, viewportSize);
      }
      return next;
    }

    // Already overscrolled — full rubber-band
    const overscroll =
      offset < minOffset ? minOffset - offset : offset - maxOffset;
    return offset + rubberBandClamp(delta, overscroll, viewportSize);
  }

  /** Write current offset to the node props and fire onScroll. */
  private _commitOffset(): void {
    this._node.setProp("scrollX", this._offsetX);
    this._node.setProp("scrollY", this._offsetY);

    const onScroll = this._node.props.onScroll as
      | ((offset: ScrollOffset) => void)
      | undefined;
    if (onScroll) {
      onScroll({ x: this._offsetX, y: this._offsetY });
    }
  }

  /** Fire onScrollEnd callback. */
  private _fireScrollEnd(): void {
    const onScrollEnd = this._node.props.onScrollEnd as
      | ((offset: ScrollOffset) => void)
      | undefined;
    if (onScrollEnd) {
      onScrollEnd({ x: this._offsetX, y: this._offsetY });
    }
  }

  /** Start the frame loop if not already running. */
  private _startFrameLoop(): void {
    this._cancelAnimation();
    this._lastFrameTimestamp = 0;
    this._frameId = __skiaRequestFrame(this._onFrame);
  }

  /** Cancel any running frame animation. */
  private _cancelAnimation(): void {
    if (this._frameId !== 0) {
      __skiaCancelFrame(this._frameId);
      this._frameId = 0;
    }
    this._lastFrameTimestamp = 0;
  }

  /** Update viewport and content bounds from node layout + children. */
  private _updateBounds(): void {
    const layout = this._node.layout;
    this._viewportWidth = layout.width;
    this._viewportHeight = layout.height;

    // Compute content size from children bounds
    let maxRight = 0;
    let maxBottom = 0;

    const children = this._node.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childLayout = child.layout;
      const right = childLayout.x + childLayout.width;
      const bottom = childLayout.y + childLayout.height;
      if (right > maxRight) maxRight = right;
      if (bottom > maxBottom) maxBottom = bottom;
    }

    this._contentWidth = maxRight;
    this._contentHeight = maxBottom;
  }

  /** Maximum scroll offset on X axis. */
  private _maxScrollX(): number {
    return Math.max(0, this._contentWidth - this._viewportWidth);
  }

  /** Maximum scroll offset on Y axis. */
  private _maxScrollY(): number {
    return Math.max(0, this._contentHeight - this._viewportHeight);
  }

  /** Whether the scroll is horizontal. */
  private _isHorizontal(): boolean {
    return (this._node.props.horizontal as boolean) === true;
  }

  /** Whether scrolling is enabled. */
  private _isScrollEnabled(): boolean {
    return this._node.props.scrollEnabled !== false; // default true
  }

  /** Whether an offset is past the boundaries. */
  private _isOverscrolled(offset: number, min: number, max: number): boolean {
    return offset < min || offset > max;
  }

  /** Get the configured deceleration rate. */
  private _getDecelerationRate(): number {
    return resolveDecelerationRate(
      this._node.props.decelerationRate as
        | "normal"
        | "fast"
        | number
        | undefined,
    );
  }
}
