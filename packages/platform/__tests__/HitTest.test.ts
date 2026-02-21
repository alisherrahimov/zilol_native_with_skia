/**
 * HitTest.test.ts — Tests for point-in-rect hit testing.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SkiaNode } from "@zilol-native/nodes";
import { hitTest } from "../src/HitTest";

describe("hitTest", () => {
  let root: SkiaNode;

  beforeEach(() => {
    root = new SkiaNode("view");
    root.layout = {
      x: 0,
      y: 0,
      width: 400,
      height: 800,
      absoluteX: 0,
      absoluteY: 0,
    };
  });

  it("returns null if no node is touchable", () => {
    expect(hitTest(root, { x: 100, y: 100 })).toBeNull();
  });

  it("returns the root if it is touchable and hit", () => {
    root.setProp("onPress", () => {});
    expect(hitTest(root, { x: 100, y: 100 })).toBe(root);
  });

  it("returns null for points outside root bounds", () => {
    root.setProp("onPress", () => {});
    expect(hitTest(root, { x: 500, y: 100 })).toBeNull();
    expect(hitTest(root, { x: -1, y: 100 })).toBeNull();
    expect(hitTest(root, { x: 100, y: 900 })).toBeNull();
  });

  it("returns the frontmost (last) child when overlapping", () => {
    const childA = new SkiaNode("view");
    childA.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    childA.setProp("onPress", () => {});

    const childB = new SkiaNode("view");
    childB.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    childB.setProp("onPress", () => {});

    root.appendChild(childA);
    root.appendChild(childB);

    // childB is last in children array → painted on top → should be hit first
    expect(hitTest(root, { x: 100, y: 100 })).toBe(childB);
  });

  it("returns a nested child correctly", () => {
    const parent = new SkiaNode("view");
    parent.layout = {
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      absoluteX: 50,
      absoluteY: 50,
    };

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      absoluteX: 100,
      absoluteY: 100,
    };
    child.setProp("onPress", () => {});

    root.appendChild(parent);
    parent.appendChild(child);

    expect(hitTest(root, { x: 120, y: 120 })).toBe(child);
  });

  it("respects pointerEvents: none", () => {
    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onPress", () => {});
    child.setProp("pointerEvents", "none");

    root.appendChild(child);

    expect(hitTest(root, { x: 100, y: 100 })).toBeNull();
  });

  it("respects pointerEvents: box-only (ignores children)", () => {
    const parent = new SkiaNode("view");
    parent.layout = {
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      absoluteX: 0,
      absoluteY: 0,
    };
    parent.setProp("onPress", () => {});
    parent.setProp("pointerEvents", "box-only");

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      absoluteX: 50,
      absoluteY: 50,
    };
    child.setProp("onPress", () => {});

    root.appendChild(parent);
    parent.appendChild(child);

    // Should hit parent, not child (box-only skips children)
    expect(hitTest(root, { x: 60, y: 60 })).toBe(parent);
  });

  it("respects pointerEvents: box-none (passes through self)", () => {
    const parent = new SkiaNode("view");
    parent.layout = {
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      absoluteX: 0,
      absoluteY: 0,
    };
    parent.setProp("onPress", () => {});
    parent.setProp("pointerEvents", "box-none");

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      absoluteX: 50,
      absoluteY: 50,
    };
    child.setProp("onPress", () => {});

    root.appendChild(parent);
    parent.appendChild(child);

    // Child should be hit (box-none still checks children)
    expect(hitTest(root, { x: 60, y: 60 })).toBe(child);

    // Point outside child but inside parent → null (box-none passes through self)
    expect(hitTest(root, { x: 250, y: 250 })).toBeNull();
  });

  it("respects overflow: hidden (clips children)", () => {
    const parent = new SkiaNode("view");
    parent.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      absoluteX: 0,
      absoluteY: 0,
    };
    parent.setProp("overflow", "hidden");

    // Child extends beyond parent bounds
    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onPress", () => {});

    root.appendChild(parent);
    parent.appendChild(child);

    // Inside parent bounds → should hit child
    expect(hitTest(root, { x: 50, y: 50 })).toBe(child);

    // Outside parent bounds → clipped, no hit
    expect(hitTest(root, { x: 150, y: 150 })).toBeNull();
  });

  it("skips invisible nodes", () => {
    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onPress", () => {});
    child.setProp("visible", false);

    root.appendChild(child);

    expect(hitTest(root, { x: 100, y: 100 })).toBeNull();
  });
});
