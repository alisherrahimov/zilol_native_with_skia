import { describe, it, expect } from "vitest";
import { bindProps } from "../src/props/binding";
import { SkiaNode } from "../src/core/SkiaNode";
import { signal, effect } from "@zilol-native/runtime";

describe("bindProps", () => {
  it("should set static props once", () => {
    const node = new SkiaNode("view");
    const dispose = bindProps(node, {
      backgroundColor: "#FF0000",
      borderRadius: 8,
    });

    expect(node.getProp("backgroundColor")).toBe("#FF0000");
    expect(node.getProp("borderRadius")).toBe(8);

    dispose();
  });

  it("should reactively update function props", () => {
    const color = signal("#FF0000");
    const node = new SkiaNode("view");

    const dispose = bindProps(node, {
      backgroundColor: () => color.value,
    });

    expect(node.getProp("backgroundColor")).toBe("#FF0000");

    color.value = "#00FF00";
    expect(node.getProp("backgroundColor")).toBe("#00FF00");

    color.value = "#0000FF";
    expect(node.getProp("backgroundColor")).toBe("#0000FF");

    dispose();
  });

  it("should stop updating after dispose", () => {
    const color = signal("#FF0000");
    const node = new SkiaNode("view");

    const dispose = bindProps(node, {
      backgroundColor: () => color.value,
    });

    expect(node.getProp("backgroundColor")).toBe("#FF0000");

    dispose();

    color.value = "#00FF00";
    // Should still be the old value after dispose
    expect(node.getProp("backgroundColor")).toBe("#FF0000");
  });

  it("should treat event handlers as static (not reactive)", () => {
    let pressed = false;
    const handler = () => {
      pressed = true;
    };
    const node = new SkiaNode("view");

    const dispose = bindProps(node, {
      onPress: handler,
    });

    // Event handler should be stored directly, not treated as reactive accessor
    expect(node.getProp("onPress")).toBe(handler);

    const fn = node.getProp("onPress") as () => void;
    fn();
    expect(pressed).toBe(true);

    dispose();
  });

  it("should handle mixed static and reactive props", () => {
    const opacity = signal(0.5);
    const node = new SkiaNode("view");

    const dispose = bindProps(node, {
      backgroundColor: "#FF0000", // static
      opacity: () => opacity.value, // reactive
      borderRadius: 12, // static
    });

    expect(node.getProp("backgroundColor")).toBe("#FF0000");
    expect(node.getProp("opacity")).toBe(0.5);
    expect(node.getProp("borderRadius")).toBe(12);

    opacity.value = 1.0;
    expect(node.getProp("opacity")).toBe(1.0);
    // Static props unchanged
    expect(node.getProp("backgroundColor")).toBe("#FF0000");

    dispose();
  });

  it("should skip undefined props", () => {
    const node = new SkiaNode("view");
    const dispose = bindProps(node, {
      backgroundColor: undefined,
    });

    expect(node.getProp("backgroundColor")).toBeUndefined();
    dispose();
  });
});
