import { describe, it, expect, beforeEach } from "vitest";
import { SkiaNode, _resetNodeIdCounter } from "@zilol-native/nodes";
import { drawNode } from "../src/draw/drawNode";
import type { DrawCommand } from "../src/types";

describe("drawNode", () => {
  beforeEach(() => {
    _resetNodeIdCounter();
  });

  function collectCommands(
    node: SkiaNode,
    damageRect = { x: 0, y: 0, width: 9999, height: 9999 },
  ): DrawCommand[] {
    const commands: DrawCommand[] = [];
    drawNode(node, damageRect, (cmd) => commands.push(cmd));
    return commands;
  }

  it("should draw a view node with background", () => {
    const node = new SkiaNode("view");
    node.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      absoluteX: 0,
      absoluteY: 0,
    };
    node.props.backgroundColor = "#FF0000";

    const commands = collectCommands(node);
    expect(commands.some((c) => c.type === "drawRect")).toBe(true);
  });

  it("should draw text node", () => {
    const node = new SkiaNode("text");
    node.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      absoluteX: 0,
      absoluteY: 0,
    };
    node.props.text = "Hello";

    const commands = collectCommands(node);
    expect(commands.some((c) => c.type === "drawText")).toBe(true);
  });

  it("should recursively draw children", () => {
    const root = new SkiaNode("view");
    root.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    root.props.backgroundColor = "#FFF";

    const child = new SkiaNode("text");
    child.layout = {
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      absoluteX: 10,
      absoluteY: 10,
    };
    child.props.text = "Child";

    root.appendChild(child);

    const commands = collectCommands(root);

    const hasRect = commands.some((c) => c.type === "drawRect");
    const hasText = commands.some((c) => c.type === "drawText");

    expect(hasRect).toBe(true);
    expect(hasText).toBe(true);
  });

  it("should skip nodes with display:none", () => {
    const node = new SkiaNode("view");
    node.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      absoluteX: 0,
      absoluteY: 0,
    };
    node.props.backgroundColor = "#FF0000";
    node.props.display = "none";

    const commands = collectCommands(node);
    expect(commands).toHaveLength(0);
  });

  it("should skip nodes outside damage rect", () => {
    const node = new SkiaNode("view");
    node.layout = {
      x: 500,
      y: 500,
      width: 100,
      height: 50,
      absoluteX: 500,
      absoluteY: 500,
    };
    node.props.backgroundColor = "#FF0000";

    // Damage rect is at top-left corner only
    const damageRect = { x: 0, y: 0, width: 100, height: 100 };
    const commands = collectCommands(node, damageRect);
    expect(commands).toHaveLength(0);
  });

  it("should wrap in save/restore for opacity < 1", () => {
    const node = new SkiaNode("view");
    node.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      absoluteX: 0,
      absoluteY: 0,
    };
    node.props.backgroundColor = "#FF0000";
    node.opacity = 0.5;

    const commands = collectCommands(node);
    expect(commands[0].type).toBe("save");
    expect(commands[commands.length - 1].type).toBe("restore");
  });

  it("should not wrap save/restore for opacity = 1", () => {
    const node = new SkiaNode("view");
    node.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      absoluteX: 0,
      absoluteY: 0,
    };
    node.props.backgroundColor = "#FF0000";
    node.opacity = 1;

    const commands = collectCommands(node);
    expect(commands[0].type).not.toBe("save");
  });

  it("should skip drawing for marker node", () => {
    const node = new SkiaNode("marker");
    node.layout = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      absoluteX: 0,
      absoluteY: 0,
    };

    const commands = collectCommands(node);
    expect(commands).toHaveLength(0);
  });
});
