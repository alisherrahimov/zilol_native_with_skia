/**
 * SkiaNode — Base node in the lightweight render tree.
 *
 * Each SkiaNode is ~100-200 bytes. Replaces native view objects.
 * Tree mutations (appendChild, removeChild, insertBefore) automatically
 * mark the node dirty and propagate hasDirtyDescendant up the tree.
 *
 * @example
 * ```ts
 * const root = new SkiaNode('view');
 * const child = new SkiaNode('text');
 * root.appendChild(child);
 * child.setProp('text', 'Hello');
 * ```
 */

import type {
  SkiaNodeType,
  SkiaNodeProps,
  NodeLayout,
  Rect,
  DirtyReason,
} from "./types";
import { dirtyTracker } from "./DirtyTracker";

// ---------------------------------------------------------------------------
// C++ node tree bridge (JSI globals registered by SkiaNodeTree.h)
// ---------------------------------------------------------------------------

declare function __nodeCreate(type: string): number;
declare function __nodeSetProp(nodeId: number, key: string, value: any): void;
declare function __nodeAppendChild(parentId: number, childId: number): void;
declare function __nodeRemoveChild(parentId: number, childId: number): void;
declare function __nodeSetLayout(
  nodeId: number,
  x: number,
  y: number,
  w: number,
  h: number,
  absX: number,
  absY: number,
): void;
declare function __nodeSetRoot(nodeId: number): void;
declare function __touchSetCallback(
  nodeId: number,
  event: string,
  callback: Function,
): void;

// Check if C++ node tree is available
const hasCppNodeTree = typeof (globalThis as any).__nodeCreate === "function";
const hasCppTouchDispatcher =
  typeof (globalThis as any).__touchSetCallback === "function";

/** Touch event keys that need to be forwarded to C++ TouchDispatcher. */
const TOUCH_EVENT_KEYS = new Set([
  "onPress",
  "onPressIn",
  "onPressOut",
  "onLongPress",
]);

// ---------------------------------------------------------------------------
// ID counter
// ---------------------------------------------------------------------------

let nextId = 1;

/** Reset the ID counter — only for testing. */
export function _resetNodeIdCounter(): void {
  nextId = 1;
}

// ---------------------------------------------------------------------------
// SkiaNode
// ---------------------------------------------------------------------------

export class SkiaNode {
  // --- Identity ---
  readonly id: number;
  readonly type: SkiaNodeType;
  key: string | null = null;

  // --- Tree ---
  parent: SkiaNode | null = null;
  children: SkiaNode[] = [];
  depth: number = 0;

  // --- Props ---
  props: SkiaNodeProps = {};

  // --- Layout (populated by Yoga in Phase 3) ---
  layout: NodeLayout = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    absoluteX: 0,
    absoluteY: 0,
  };

  // --- Dirty tracking ---
  dirty: boolean = false;
  hasDirtyDescendant: boolean = false;
  dirtyRect: Rect | null = null;

  // --- Rendering ---
  opacity: number = 1;
  touchable: boolean = false;

  // --- C++ mirror node ID ---
  cppNodeId: number = 0;

  constructor(type: SkiaNodeType) {
    this.id = nextId++;
    this.type = type;

    // Create mirror node in C++ tree
    if (hasCppNodeTree) {
      this.cppNodeId = __nodeCreate(type);
    }
  }

  // --- Tree operations ---

  /**
   * Append a child node. If the child already has a parent, it is
   * first removed from that parent.
   */
  appendChild(child: SkiaNode): void {
    if (child.parent === this) return;
    if (child.parent !== null) {
      child.parent.removeChild(child);
    }
    child.parent = this;
    child.depth = this.depth + 1;
    this.children.push(child);
    this._updateChildDepths(child);

    // Sync to C++ tree
    if (hasCppNodeTree && this.cppNodeId && child.cppNodeId) {
      __nodeAppendChild(this.cppNodeId, child.cppNodeId);
    }

    this.markDirty("children");
  }

  /**
   * Insert a child before a reference child. If `ref` is null,
   * appends to the end.
   */
  insertBefore(child: SkiaNode, ref: SkiaNode | null): void {
    if (ref === null) {
      this.appendChild(child);
      return;
    }

    if (child.parent !== null) {
      child.parent.removeChild(child);
    }

    const idx = this.children.indexOf(ref);
    if (idx === -1) {
      // ref not found — append
      this.appendChild(child);
      return;
    }

    child.parent = this;
    child.depth = this.depth + 1;
    this.children.splice(idx, 0, child);
    this._updateChildDepths(child);
    this.markDirty("children");
  }

  /** Remove a child node from this node's children. */
  removeChild(child: SkiaNode): void {
    const idx = this.children.indexOf(child);
    if (idx === -1) return;

    this.children.splice(idx, 1);
    child.parent = null;
    child.depth = 0;

    // Sync to C++ tree
    if (hasCppNodeTree && this.cppNodeId && child.cppNodeId) {
      __nodeRemoveChild(this.cppNodeId, child.cppNodeId);
    }

    this.markDirty("children");
  }

  // --- Props ---

  /** Set a single prop and mark dirty. */
  setProp<K extends keyof SkiaNodeProps>(
    key: K,
    value: SkiaNodeProps[K],
  ): void {
    if (this.props[key] === value) return; // no-op if same value
    this.props[key] = value;

    // Sync to C++ tree (skip functions — they're JS callbacks)
    if (hasCppNodeTree && this.cppNodeId && typeof value !== "function") {
      __nodeSetProp(this.cppNodeId, key as string, value);
    }

    // Forward touch callbacks to C++ TouchDispatcher
    if (
      hasCppTouchDispatcher &&
      this.cppNodeId &&
      typeof value === "function" &&
      TOUCH_EVENT_KEYS.has(key as string)
    ) {
      __touchSetCallback(this.cppNodeId, key as string, value as Function);
    }

    this.markDirty("prop");
  }

  /** Get a single prop value. */
  getProp<K extends keyof SkiaNodeProps>(key: K): SkiaNodeProps[K] {
    return this.props[key];
  }

  /**
   * Mark this node as dirty and propagate hasDirtyDescendant up the tree.
   * Accumulates a damage rect from the current layout bounds.
   * Notifies the global DirtyTracker so a render frame is scheduled.
   */
  markDirty(reason: DirtyReason): void {
    if (this.dirty && reason !== "children") return; // already dirty

    this.dirty = true;

    // Accumulate damage rect from current layout
    const bounds = this.getWorldBounds();
    if (bounds.width > 0 && bounds.height > 0) {
      this.dirtyRect = bounds;
    }

    // Propagate hasDirtyDescendant up
    let node = this.parent;
    while (node !== null) {
      if (node.hasDirtyDescendant) break; // already marked
      node.hasDirtyDescendant = true;
      node = node.parent;
    }

    // Notify global tracker (non-recursive — does NOT call markDirty again)
    dirtyTracker.notifyDirty(this);
  }

  /** Clear dirty flags after rendering. */
  clearDirty(): void {
    this.dirty = false;
    this.hasDirtyDescendant = false;
    this.dirtyRect = null;
  }

  // --- Geometry ---

  /** Compute the world-space bounding rect from layout. */
  getWorldBounds(): Rect {
    return {
      x: this.layout.absoluteX,
      y: this.layout.absoluteY,
      width: this.layout.width,
      height: this.layout.height,
    };
  }

  // --- Pool recycling ---

  /** Reset all fields for reuse from NodePool. */
  reset(): void {
    this.key = null;
    this.parent = null;
    this.children = [];
    this.depth = 0;
    this.props = {};
    this.layout = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      absoluteX: 0,
      absoluteY: 0,
    };
    this.dirty = false;
    this.hasDirtyDescendant = false;
    this.dirtyRect = null;
    this.opacity = 1;
    this.touchable = false;
  }

  // --- Internal helpers ---

  /** Recursively update depth for child and its subtree. */
  private _updateChildDepths(child: SkiaNode): void {
    for (let i = 0; i < child.children.length; i++) {
      const grandchild = child.children[i];
      grandchild.depth = child.depth + 1;
      this._updateChildDepths(grandchild);
    }
  }
}
