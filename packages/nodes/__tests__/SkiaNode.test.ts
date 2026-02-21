import { describe, it, expect, beforeEach } from "vitest";
import { SkiaNode, _resetNodeIdCounter } from "../src/core/SkiaNode";

describe("SkiaNode", () => {
  beforeEach(() => {
    _resetNodeIdCounter();
  });

  // --- Construction ---

  it("should create a node with auto-incrementing id", () => {
    const a = new SkiaNode("view");
    const b = new SkiaNode("text");
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    expect(a.type).toBe("view");
    expect(b.type).toBe("text");
  });

  it("should have correct default values", () => {
    const node = new SkiaNode("view");
    expect(node.key).toBeNull();
    expect(node.parent).toBeNull();
    expect(node.children).toEqual([]);
    expect(node.depth).toBe(0);
    expect(node.dirty).toBe(false);
    expect(node.hasDirtyDescendant).toBe(false);
    expect(node.dirtyRect).toBeNull();
    expect(node.opacity).toBe(1);
    expect(node.touchable).toBe(false);
  });

  // --- Tree operations ---

  it("should appendChild and set parent/depth", () => {
    const parent = new SkiaNode("view");
    const child = new SkiaNode("text");

    parent.appendChild(child);

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toBe(child);
    expect(child.parent).toBe(parent);
    expect(child.depth).toBe(1);
  });

  it("should handle nested depth correctly", () => {
    const root = new SkiaNode("view");
    const mid = new SkiaNode("view");
    const leaf = new SkiaNode("text");

    root.appendChild(mid);
    mid.appendChild(leaf);

    expect(root.depth).toBe(0);
    expect(mid.depth).toBe(1);
    expect(leaf.depth).toBe(2);
  });

  it("should reparent a child when appending to a new parent", () => {
    const parent1 = new SkiaNode("view");
    const parent2 = new SkiaNode("view");
    const child = new SkiaNode("text");

    parent1.appendChild(child);
    expect(parent1.children).toHaveLength(1);

    parent2.appendChild(child);
    expect(parent1.children).toHaveLength(0);
    expect(parent2.children).toHaveLength(1);
    expect(child.parent).toBe(parent2);
  });

  it("should insertBefore correctly", () => {
    const parent = new SkiaNode("view");
    const child1 = new SkiaNode("text");
    const child2 = new SkiaNode("text");
    const child3 = new SkiaNode("text");

    parent.appendChild(child1);
    parent.appendChild(child3);
    parent.insertBefore(child2, child3);

    expect(parent.children).toEqual([child1, child2, child3]);
    expect(child2.parent).toBe(parent);
    expect(child2.depth).toBe(1);
  });

  it("should insertBefore with null ref = appendChild", () => {
    const parent = new SkiaNode("view");
    const child = new SkiaNode("text");

    parent.insertBefore(child, null);

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toBe(child);
  });

  it("should removeChild", () => {
    const parent = new SkiaNode("view");
    const child = new SkiaNode("text");

    parent.appendChild(child);
    parent.removeChild(child);

    expect(parent.children).toHaveLength(0);
    expect(child.parent).toBeNull();
    expect(child.depth).toBe(0);
  });

  it("should no-op removeChild for non-child", () => {
    const parent = new SkiaNode("view");
    const other = new SkiaNode("text");

    parent.removeChild(other); // should not throw
    expect(parent.children).toHaveLength(0);
  });

  // --- Props ---

  it("should setProp and getProp", () => {
    const node = new SkiaNode("view");

    node.setProp("backgroundColor", "#FF0000");
    expect(node.getProp("backgroundColor")).toBe("#FF0000");
  });

  it("should not mark dirty if setProp value is same", () => {
    const node = new SkiaNode("view");
    node.setProp("backgroundColor", "#FF0000");
    node.clearDirty();

    node.setProp("backgroundColor", "#FF0000"); // same value
    expect(node.dirty).toBe(false);
  });

  // --- Dirty tracking ---

  it("should markDirty and propagate hasDirtyDescendant", () => {
    const root = new SkiaNode("view");
    const mid = new SkiaNode("view");
    const leaf = new SkiaNode("text");

    root.appendChild(mid);
    mid.appendChild(leaf);

    // Clear dirty from tree construction
    root.clearDirty();
    mid.clearDirty();
    leaf.clearDirty();

    leaf.markDirty("prop");

    expect(leaf.dirty).toBe(true);
    expect(mid.hasDirtyDescendant).toBe(true);
    expect(root.hasDirtyDescendant).toBe(true);
  });

  it("should not re-propagate if already dirty", () => {
    const root = new SkiaNode("view");
    const child = new SkiaNode("text");
    root.appendChild(child);

    root.clearDirty();
    child.clearDirty();

    child.markDirty("prop");
    child.markDirty("prop"); // should be no-op for the same reason

    expect(child.dirty).toBe(true);
    expect(root.hasDirtyDescendant).toBe(true);
  });

  it("should clearDirty", () => {
    const node = new SkiaNode("view");
    node.markDirty("prop");

    expect(node.dirty).toBe(true);

    node.clearDirty();
    expect(node.dirty).toBe(false);
    expect(node.hasDirtyDescendant).toBe(false);
    expect(node.dirtyRect).toBeNull();
  });

  // --- Geometry ---

  it("should getWorldBounds from layout", () => {
    const node = new SkiaNode("view");
    node.layout = {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      absoluteX: 30,
      absoluteY: 40,
    };

    const bounds = node.getWorldBounds();
    expect(bounds).toEqual({ x: 30, y: 40, width: 100, height: 50 });
  });

  // --- Pool recycling ---

  it("should reset all fields", () => {
    const node = new SkiaNode("view");
    node.key = "test";
    node.props.backgroundColor = "#FFF";
    node.dirty = true;
    node.hasDirtyDescendant = true;
    node.opacity = 0.5;
    node.touchable = true;

    const parent = new SkiaNode("view");
    parent.appendChild(node);

    node.reset();

    expect(node.key).toBeNull();
    expect(node.parent).toBeNull();
    expect(node.children).toEqual([]);
    expect(node.depth).toBe(0);
    expect(node.props).toEqual({});
    expect(node.dirty).toBe(false);
    expect(node.hasDirtyDescendant).toBe(false);
    expect(node.dirtyRect).toBeNull();
    expect(node.opacity).toBe(1);
    expect(node.touchable).toBe(false);
  });
});
