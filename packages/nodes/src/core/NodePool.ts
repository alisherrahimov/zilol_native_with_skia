/**
 * NodePool — Object recycling pool for SkiaNodes.
 *
 * Avoids GC pressure by reusing node objects. Each node type has
 * its own pool, bounded at MAX_POOL_SIZE entries.
 *
 * @example
 * ```ts
 * import { nodePool } from '@zilol-native/nodes';
 *
 * const node = nodePool.acquire('view');
 * // ... use node ...
 * nodePool.release(node); // returns to pool (recursively releases children)
 * ```
 */

import { SkiaNode } from "./SkiaNode";
import type { SkiaNodeType } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum nodes kept per type. */
const MAX_POOL_SIZE = 100;

// ---------------------------------------------------------------------------
// NodePool
// ---------------------------------------------------------------------------

class NodePoolImpl {
  private readonly _pools: Map<SkiaNodeType, SkiaNode[]> = new Map();

  /**
   * Acquire a node of the given type.
   * Returns a recycled node (reset) if available, otherwise creates a new one.
   */
  acquire(type: SkiaNodeType): SkiaNode {
    const pool = this._pools.get(type);
    if (pool !== undefined && pool.length > 0) {
      const node = pool.pop()!;
      node.reset();
      return node;
    }
    return new SkiaNode(type);
  }

  /**
   * Release a node back to the pool.
   * Recursively releases all children first.
   */
  release(node: SkiaNode): void {
    // Recursively release children
    for (let i = node.children.length - 1; i >= 0; i--) {
      this.release(node.children[i]);
    }

    // Detach from parent
    if (node.parent !== null) {
      node.parent.removeChild(node);
    }

    // Reset node state
    node.reset();

    // Return to pool if under limit
    let pool = this._pools.get(node.type);
    if (pool === undefined) {
      pool = [];
      this._pools.set(node.type, pool);
    }

    if (pool.length < MAX_POOL_SIZE) {
      pool.push(node);
    }
  }

  /** Drain all pools. */
  clear(): void {
    this._pools.clear();
  }

  /** Get pool sizes per node type (for devtools). */
  stats(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [type, pool] of this._pools) {
      result[type] = pool.length;
    }
    return result;
  }

  /** Get total pooled node count. */
  get totalPooled(): number {
    let total = 0;
    for (const pool of this._pools.values()) {
      total += pool.length;
    }
    return total;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/** Global node pool singleton. */
export const nodePool = new NodePoolImpl();
