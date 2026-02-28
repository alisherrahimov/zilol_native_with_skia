/**
 * Gesture.ts — Composable gesture builders.
 *
 * Each gesture type returns a chainable builder that registers
 * callbacks and configuration. Gestures are attached to nodes
 * via GestureDetector.
 *
 * @example
 * ```ts
 * const pan = Gesture.Pan()
 *   .onStart((e) => { ... })
 *   .onUpdate((e) => { e.translationX, e.translationY })
 *   .onEnd((e) => { e.velocityX, e.velocityY });
 * ```
 */

// JSI declarations (registered by C++ TouchDispatcher)
declare function __gestureAttach(nodeId: number, gestureType: string): number;
declare function __gestureSetCallback(
  gestureId: number,
  event: string,
  callback: Function,
): void;
declare function __gestureSetConfig(
  gestureId: number,
  key: string,
  value: number,
): void;

// ---------------------------------------------------------------------------
// Gesture event types
// ---------------------------------------------------------------------------

export interface GestureEvent {
  x: number;
  y: number;
  absoluteX: number;
  absoluteY: number;
  translationX: number;
  translationY: number;
  velocityX: number;
  velocityY: number;
  scale: number;
  rotation: number;
  focalX: number;
  focalY: number;
  numberOfPointers: number;
}

export type GestureCallback = (event: GestureEvent) => void;

// ---------------------------------------------------------------------------
// GestureBuilder base
// ---------------------------------------------------------------------------

export class GestureBuilder {
  readonly gestureType: string;

  /** @internal */ _onStart?: GestureCallback;
  /** @internal */ _onUpdate?: GestureCallback;
  /** @internal */ _onEnd?: GestureCallback;
  /** @internal */ _config: Record<string, number> = {};

  constructor(type: string) {
    this.gestureType = type;
  }

  onStart(cb: GestureCallback): this {
    this._onStart = cb;
    return this;
  }

  onUpdate(cb: GestureCallback): this {
    this._onUpdate = cb;
    return this;
  }

  onEnd(cb: GestureCallback): this {
    this._onEnd = cb;
    return this;
  }

  /**
   * Attach this gesture to a C++ node, registering callbacks.
   * @internal Called by GestureDetector.
   */
  _attach(cppNodeId: number): void {
    const gid = __gestureAttach(cppNodeId, this.gestureType);
    if (gid < 0) return;

    if (this._onStart) __gestureSetCallback(gid, "onStart", this._onStart);
    if (this._onUpdate) __gestureSetCallback(gid, "onUpdate", this._onUpdate);
    if (this._onEnd) __gestureSetCallback(gid, "onEnd", this._onEnd);

    for (const [key, value] of Object.entries(this._config)) {
      __gestureSetConfig(gid, key, value);
    }
  }
}

// ---------------------------------------------------------------------------
// Concrete gesture types
// ---------------------------------------------------------------------------

export class PanGesture extends GestureBuilder {
  constructor() {
    super("pan");
  }

  /** Min distance (px) before pan activates. Default: 10. */
  activationThreshold(value: number): this {
    this._config.activationThreshold = value;
    return this;
  }
}

export class PinchGesture extends GestureBuilder {
  constructor() {
    super("pinch");
  }
}

export class RotationGesture extends GestureBuilder {
  constructor() {
    super("rotation");
  }
}

export class TapGesture extends GestureBuilder {
  constructor() {
    super("tap");
  }

  /** Number of taps required. Default: 1. */
  numberOfTaps(value: number): this {
    this._config.numberOfTaps = value;
    return this;
  }

  /** Max movement allowed during tap (px). Default: 15. */
  maxDistance(value: number): this {
    this._config.maxDistance = value;
    return this;
  }
}

// ---------------------------------------------------------------------------
// Gesture factory
// ---------------------------------------------------------------------------

export const Gesture = {
  Pan: () => new PanGesture(),
  Pinch: () => new PinchGesture(),
  Rotation: () => new RotationGesture(),
  Tap: () => new TapGesture(),
};
