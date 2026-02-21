/**
 * CanvasExecutor.test.ts — Tests for the DrawCommand → canvas call bridge.
 */

import { describe, it, expect, vi } from "vitest";
import { createCanvasExecutor } from "../src/CanvasExecutor";
import type { DrawCommand } from "@zilol-native/renderer";

/** Create a mock SkiaCanvasProxy with all methods as vi.fn(). */
function createMockCanvas() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    concat: vi.fn(),
    clipRect: vi.fn(),
    clipRRect: vi.fn(),
    drawRect: vi.fn(),
    drawRRect: vi.fn(),
    drawRRectStroke: vi.fn(),
    drawText: vi.fn(),
    drawShadow: vi.fn(),
    saveLayerAlpha: vi.fn(),
    clear: vi.fn(),
  };
}

describe("createCanvasExecutor", () => {
  it("executes drawRect command", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    executor({
      type: "drawRect",
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      color: "#FF0000",
    });

    expect(canvas.drawRect).toHaveBeenCalledWith(10, 20, 100, 50, "#FF0000");
  });

  it("executes drawRRect command", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    executor({
      type: "drawRRect",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rx: 8,
      ry: 8,
      color: "#00FF00",
    });

    expect(canvas.drawRRect).toHaveBeenCalledWith(
      0,
      0,
      100,
      100,
      8,
      8,
      "#00FF00",
    );
  });

  it("executes drawRRectStroke command", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    executor({
      type: "drawRRectStroke",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rx: 4,
      ry: 4,
      color: "#0000FF",
      strokeWidth: 2,
    });

    expect(canvas.drawRRectStroke).toHaveBeenCalledWith(
      0,
      0,
      100,
      100,
      4,
      4,
      "#0000FF",
      2,
    );
  });

  it("executes drawText command", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    executor({
      type: "drawText",
      text: "Hello",
      x: 10,
      y: 30,
      color: "#000000",
      fontSize: 16,
    });

    expect(canvas.drawText).toHaveBeenCalledWith(
      "Hello",
      10,
      30,
      "#000000",
      16,
    );
  });

  it("executes drawShadow command", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    executor({
      type: "drawShadow",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rx: 8,
      ry: 8,
      color: "rgba(0,0,0,0.3)",
      offsetX: 0,
      offsetY: 2,
      blurRadius: 4,
    });

    expect(canvas.drawShadow).toHaveBeenCalledWith(
      0,
      0,
      100,
      100,
      8,
      8,
      "rgba(0,0,0,0.3)",
      0,
      2,
      4,
    );
  });

  it("executes clipRRect command", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    executor({
      type: "clipRRect",
      x: 10,
      y: 10,
      width: 200,
      height: 200,
      rx: 12,
      ry: 12,
    });

    expect(canvas.clipRRect).toHaveBeenCalledWith(10, 10, 200, 200, 12, 12);
  });

  it("executes save/restore commands", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    executor({ type: "save" });
    executor({ type: "restore" });

    expect(canvas.save).toHaveBeenCalledTimes(1);
    expect(canvas.restore).toHaveBeenCalledTimes(1);
  });

  it("executes translate command", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    executor({ type: "translate", dx: 50, dy: 100 });

    expect(canvas.translate).toHaveBeenCalledWith(50, 100);
  });

  it("executes clear command", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    executor({ type: "clear", color: "#FFFFFF" });

    expect(canvas.clear).toHaveBeenCalledWith("#FFFFFF");
  });

  it("handles drawImage as a no-op (platform-layer managed)", () => {
    const canvas = createMockCanvas();
    const executor = createCanvasExecutor(canvas as any);

    // Should not throw
    executor({
      type: "drawImage",
      image: { width: () => 100, height: () => 100 } as any,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });

    // No canvas method should be called for drawImage
    expect(canvas.drawRect).not.toHaveBeenCalled();
  });
});
