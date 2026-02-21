import { describe, it, expect, beforeEach } from "vitest";
import { nodePool } from "../src/core/NodePool";
import { SkiaNode } from "../src/core/SkiaNode";

describe("NodePool", () => {
  beforeEach(() => {
    nodePool.clear();
  });

  it("should acquire a new node when pool is empty", () => {
    const node = nodePool.acquire("view");
    expect(node).toBeInstanceOf(SkiaNode);
    expect(node.type).toBe("view");
  });

  it("should acquire a recycled node after release", () => {
    const original = new SkiaNode("view");
    original.setProp("backgroundColor", "#FF0000");

    nodePool.release(original);
    expect(nodePool.totalPooled).toBe(1);

    const recycled = nodePool.acquire("view");
    // Should be reset
    expect(recycled.getProp("backgroundColor")).toBeUndefined();
    expect(nodePool.totalPooled).toBe(0);
  });

  it("should separate pools by node type", () => {
    nodePool.release(new SkiaNode("view"));
    nodePool.release(new SkiaNode("text"));

    expect(nodePool.stats()).toEqual({ view: 1, text: 1 });

    const view = nodePool.acquire("view");
    expect(view.type).toBe("view");
    expect(nodePool.stats()).toEqual({ view: 0, text: 1 });
  });

  it("should recursively release children", () => {
    const parent = new SkiaNode("view");
    const child1 = new SkiaNode("text");
    const child2 = new SkiaNode("text");
    parent.appendChild(child1);
    parent.appendChild(child2);

    nodePool.release(parent);
    expect(nodePool.totalPooled).toBe(3);
    expect(nodePool.stats()).toEqual({ view: 1, text: 2 });
  });

  it("should respect max pool size of 100", () => {
    for (let i = 0; i < 110; i++) {
      nodePool.release(new SkiaNode("view"));
    }
    expect(nodePool.stats()["view"]).toBe(100);
  });

  it("should clear all pools", () => {
    nodePool.release(new SkiaNode("view"));
    nodePool.release(new SkiaNode("text"));

    nodePool.clear();
    expect(nodePool.totalPooled).toBe(0);
    expect(nodePool.stats()).toEqual({});
  });
});
