import { describe, it, expect, beforeEach } from "vitest";
import { dirtyTracker } from "../src/core/DirtyTracker";
import { SkiaNode } from "../src/core/SkiaNode";

describe("DirtyTracker", () => {
  beforeEach(() => {
    dirtyTracker._reset();
  });

  it("should track dirty nodes", () => {
    const node = new SkiaNode("view");

    dirtyTracker.markDirty(node, "prop");
    expect(dirtyTracker.dirtyCount).toBe(1);
  });

  it("should trigger frame callback when marking dirty", () => {
    let frameCallCount = 0;
    dirtyTracker.onFrameNeeded(() => {
      frameCallCount++;
    });

    const node = new SkiaNode("view");
    dirtyTracker.markDirty(node, "prop");

    expect(frameCallCount).toBe(1);
  });

  it("should coalesce multiple marks into one frame request", () => {
    let frameCallCount = 0;
    dirtyTracker.onFrameNeeded(() => {
      frameCallCount++;
    });

    const node1 = new SkiaNode("view");
    const node2 = new SkiaNode("text");

    dirtyTracker.markDirty(node1, "prop");
    dirtyTracker.markDirty(node2, "prop");

    // Only one frame request despite two dirty marks
    expect(frameCallCount).toBe(1);
    expect(dirtyTracker.dirtyCount).toBe(2);
  });

  it("should collect merged damage rect", () => {
    const node1 = new SkiaNode("view");
    node1.layout = {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      absoluteX: 10,
      absoluteY: 10,
    };

    const node2 = new SkiaNode("view");
    node2.layout = {
      x: 0,
      y: 0,
      width: 30,
      height: 30,
      absoluteX: 80,
      absoluteY: 80,
    };

    dirtyTracker.markDirty(node1, "prop");
    dirtyTracker.markDirty(node2, "prop");

    const damage = dirtyTracker.collectDamageRect();
    expect(damage).not.toBeNull();
    expect(damage!.x).toBe(10);
    expect(damage!.y).toBe(10);
    expect(damage!.width).toBe(100); // 80+30-10
    expect(damage!.height).toBe(100); // 80+30-10
  });

  it("should return null damage rect when no nodes dirty", () => {
    const damage = dirtyTracker.collectDamageRect();
    expect(damage).toBeNull();
  });

  it("should flush dirty flags", () => {
    const node = new SkiaNode("view");
    dirtyTracker.markDirty(node, "prop");

    expect(node.dirty).toBe(true);
    expect(dirtyTracker.dirtyCount).toBe(1);

    dirtyTracker.flush();

    expect(node.dirty).toBe(false);
    expect(dirtyTracker.dirtyCount).toBe(0);
  });

  it("should allow new frame requests after flush", () => {
    let frameCallCount = 0;
    dirtyTracker.onFrameNeeded(() => {
      frameCallCount++;
    });

    const node = new SkiaNode("view");
    dirtyTracker.markDirty(node, "prop");
    expect(frameCallCount).toBe(1);

    dirtyTracker.flush();

    // After flush, a new mark should request a new frame
    dirtyTracker.markDirty(node, "prop");
    expect(frameCallCount).toBe(2);
  });
});
