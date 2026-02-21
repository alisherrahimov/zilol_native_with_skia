import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SkiaNode, _resetNodeIdCounter } from "@zilol-native/nodes";
import { YogaBridge } from "../src/YogaBridge";
import { syncLayoutResults } from "../src/LayoutSync";
import { installYogaJSIMock, uninstallYogaJSIMock } from "./yogaJSIMock";

describe("YogaBridge", () => {
  let bridge: YogaBridge;

  beforeEach(() => {
    installYogaJSIMock();
    _resetNodeIdCounter();
    bridge = new YogaBridge();
  });

  afterEach(() => {
    bridge.destroy();
    uninstallYogaJSIMock();
  });

  // --- Attach / Detach ---

  it("should attach a root node", () => {
    const root = new SkiaNode("view");
    bridge.attachNode(root);

    expect(bridge.nodeCount).toBe(1);
    expect(bridge.rootNode).toBe(root);
    expect(bridge.getYogaHandle(root)).toBeDefined();
  });

  it("should attach parent and child nodes", () => {
    const root = new SkiaNode("view");
    const child = new SkiaNode("text");
    root.appendChild(child);

    bridge.attachNode(root);
    bridge.attachNode(child);

    expect(bridge.nodeCount).toBe(2);

    // Verify the child was inserted into the parent's Yoga node
    const parentHandle = bridge.getYogaHandle(root)!;
    expect(__yogaGetChildCount(parentHandle)).toBe(1);
  });

  it("should not attach the same node twice", () => {
    const root = new SkiaNode("view");
    bridge.attachNode(root);
    bridge.attachNode(root);

    expect(bridge.nodeCount).toBe(1);
  });

  it("should detach a node", () => {
    const root = new SkiaNode("view");
    bridge.attachNode(root);
    bridge.detachNode(root);

    expect(bridge.nodeCount).toBe(0);
    expect(bridge.rootNode).toBeNull();
    expect(bridge.getYogaHandle(root)).toBeUndefined();
  });

  it("should detach a child from its parent's Yoga node", () => {
    const root = new SkiaNode("view");
    const child = new SkiaNode("view");
    root.appendChild(child);

    bridge.attachNode(root);
    bridge.attachNode(child);
    bridge.detachNode(child);

    const parentHandle = bridge.getYogaHandle(root)!;
    expect(__yogaGetChildCount(parentHandle)).toBe(0);
  });

  // --- Layout calculation ---

  it("should calculate simple layout", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 200);
    root.setProp("height", 100);

    bridge.attachNode(root);
    bridge.calculateLayout(375, 812);
    syncLayoutResults(root, bridge);

    expect(root.layout.width).toBe(200);
    expect(root.layout.height).toBe(100);
    expect(root.layout.x).toBe(0);
    expect(root.layout.y).toBe(0);
  });

  it("should calculate nested flex layout", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 300);
    root.setProp("height", 600);
    root.setProp("flexDirection", "column");

    const child1 = new SkiaNode("view");
    child1.setProp("height", 100);

    const child2 = new SkiaNode("view");
    child2.setProp("flex", 1);

    root.appendChild(child1);
    root.appendChild(child2);

    bridge.attachNode(root);
    bridge.attachNode(child1);
    bridge.attachNode(child2);

    bridge.calculateLayout(375, 812);
    syncLayoutResults(root, bridge);

    expect(child1.layout.y).toBe(0);
    expect(child1.layout.height).toBe(100);
    expect(child1.layout.width).toBe(300);

    expect(child2.layout.y).toBe(100);
    expect(child2.layout.height).toBe(500); // 600 - 100
    expect(child2.layout.width).toBe(300);
  });

  it("should handle padding", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 200);
    root.setProp("height", 200);
    root.setProp("paddingTop", 10);
    root.setProp("paddingLeft", 20);

    const child = new SkiaNode("view");
    child.setProp("width", 50);
    child.setProp("height", 50);

    root.appendChild(child);

    bridge.attachNode(root);
    bridge.attachNode(child);

    bridge.calculateLayout(375, 812);
    syncLayoutResults(root, bridge);

    expect(child.layout.x).toBe(20);
    expect(child.layout.y).toBe(10);
  });

  it("should compute absolute positions", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 300);
    root.setProp("height", 600);
    root.setProp("paddingTop", 50);
    root.setProp("paddingLeft", 30);

    const mid = new SkiaNode("view");
    mid.setProp("width", 200);
    mid.setProp("height", 200);
    mid.setProp("paddingTop", 10);
    mid.setProp("paddingLeft", 10);

    const leaf = new SkiaNode("view");
    leaf.setProp("width", 50);
    leaf.setProp("height", 50);

    root.appendChild(mid);
    mid.appendChild(leaf);

    bridge.attachNode(root);
    bridge.attachNode(mid);
    bridge.attachNode(leaf);

    bridge.calculateLayout(375, 812);
    syncLayoutResults(root, bridge);

    // mid is at (30, 50) relative to root
    expect(mid.layout.absoluteX).toBe(30);
    expect(mid.layout.absoluteY).toBe(50);

    // leaf is at (10, 10) relative to mid → (40, 60) absolute
    expect(leaf.layout.absoluteX).toBe(40);
    expect(leaf.layout.absoluteY).toBe(60);
  });

  it("should handle percentage dimensions", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 400);
    root.setProp("height", 800);

    const child = new SkiaNode("view");
    child.setProp("width", "50%");
    child.setProp("height", "25%");

    root.appendChild(child);

    bridge.attachNode(root);
    bridge.attachNode(child);

    bridge.calculateLayout(400, 800);
    syncLayoutResults(root, bridge);

    expect(child.layout.width).toBe(200);
    expect(child.layout.height).toBe(200);
  });

  it("should handle row flex direction", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 300);
    root.setProp("height", 100);
    root.setProp("flexDirection", "row");

    const a = new SkiaNode("view");
    a.setProp("width", 100);
    a.setProp("height", 50);

    const b = new SkiaNode("view");
    b.setProp("width", 100);
    b.setProp("height", 50);

    root.appendChild(a);
    root.appendChild(b);

    bridge.attachNode(root);
    bridge.attachNode(a);
    bridge.attachNode(b);

    bridge.calculateLayout(300, 100);
    syncLayoutResults(root, bridge);

    expect(a.layout.x).toBe(0);
    expect(b.layout.x).toBe(100);
  });

  // --- Sync Props ---

  it("should update props via syncProps", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 100);
    root.setProp("height", 100);

    bridge.attachNode(root);
    bridge.calculateLayout(375, 812);
    syncLayoutResults(root, bridge);

    expect(root.layout.width).toBe(100);

    // Change width
    root.setProp("width", 200);
    bridge.syncProps(root);
    bridge.calculateLayout(375, 812);
    syncLayoutResults(root, bridge);

    expect(root.layout.width).toBe(200);
  });

  // --- Destroy ---

  it("should destroy all nodes", () => {
    const root = new SkiaNode("view");
    const child = new SkiaNode("view");
    root.appendChild(child);

    bridge.attachNode(root);
    bridge.attachNode(child);

    bridge.destroy();

    expect(bridge.nodeCount).toBe(0);
    expect(bridge.rootNode).toBeNull();
  });
});
