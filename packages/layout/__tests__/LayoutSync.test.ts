import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SkiaNode, _resetNodeIdCounter } from "@zilol-native/nodes";
import { YogaBridge } from "../src/YogaBridge";
import { syncLayoutResults } from "../src/LayoutSync";
import { installYogaJSIMock, uninstallYogaJSIMock } from "./yogaJSIMock";

describe("LayoutSync", () => {
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

  it("should sync layout to SkiaNode default fields", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 100);
    root.setProp("height", 50);

    bridge.attachNode(root);
    bridge.calculateLayout(375, 812);
    syncLayoutResults(root, bridge);

    expect(root.layout).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      absoluteX: 0,
      absoluteY: 0,
    });
  });

  it("should accumulate absolute positions through tree", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 400);
    root.setProp("height", 800);

    const a = new SkiaNode("view");
    a.setProp("width", 200);
    a.setProp("height", 200);
    a.setProp("marginTop", 100);
    a.setProp("marginLeft", 50);

    const b = new SkiaNode("view");
    b.setProp("width", 50);
    b.setProp("height", 50);
    b.setProp("marginTop", 10);
    b.setProp("marginLeft", 20);

    root.appendChild(a);
    a.appendChild(b);

    bridge.attachNode(root);
    bridge.attachNode(a);
    bridge.attachNode(b);

    bridge.calculateLayout(400, 800);
    syncLayoutResults(root, bridge);

    // root at (0, 0) absolute
    expect(root.layout.absoluteX).toBe(0);
    expect(root.layout.absoluteY).toBe(0);

    // a at (50, 100) relative → (50, 100) absolute
    expect(a.layout.x).toBe(50);
    expect(a.layout.y).toBe(100);
    expect(a.layout.absoluteX).toBe(50);
    expect(a.layout.absoluteY).toBe(100);

    // b at (20, 10) relative → (70, 110) absolute
    expect(b.layout.x).toBe(20);
    expect(b.layout.y).toBe(10);
    expect(b.layout.absoluteX).toBe(70);
    expect(b.layout.absoluteY).toBe(110);
  });

  it("should not update layout if values haven't changed", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 100);
    root.setProp("height", 100);

    bridge.attachNode(root);
    bridge.calculateLayout(375, 812);
    syncLayoutResults(root, bridge);

    // Capture reference
    const firstLayout = root.layout;

    // Re-sync — values are the same
    syncLayoutResults(root, bridge);

    // Object reference should be the same (no update)
    expect(root.layout).toBe(firstLayout);
  });

  it("should handle nodes not in the bridge", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 100);
    root.setProp("height", 100);

    // Don't attach to bridge — syncLayoutResults should not crash
    syncLayoutResults(root, bridge);

    // Layout should remain at default
    expect(root.layout.width).toBe(0);
  });

  it("should correctly sync after layout changes", () => {
    const root = new SkiaNode("view");
    root.setProp("width", 200);
    root.setProp("height", 200);

    const child = new SkiaNode("view");
    child.setProp("width", 100);
    child.setProp("height", 50);

    root.appendChild(child);

    bridge.attachNode(root);
    bridge.attachNode(child);

    bridge.calculateLayout(200, 200);
    syncLayoutResults(root, bridge);

    expect(child.layout.width).toBe(100);

    // Change child width
    child.setProp("width", 150);
    bridge.syncProps(child);
    bridge.calculateLayout(200, 200);
    syncLayoutResults(root, bridge);

    expect(child.layout.width).toBe(150);
  });
});
