import { describe, it, expect, beforeEach } from "vitest";
import { SkiaNode, _resetNodeIdCounter } from "@zilol-native/nodes";
import { DisplayList } from "../src/pipeline/DisplayList";
import type { DrawCommand } from "../src/types";

describe("DisplayList", () => {
  beforeEach(() => {
    _resetNodeIdCounter();
  });

  // --- Basic operations ---

  it("should start empty", () => {
    const list = new DisplayList();
    expect(list.length).toBe(0);
    expect(list.commands).toEqual([]);
  });

  it("should push commands", () => {
    const list = new DisplayList();
    list.push({ type: "save" });
    list.push({ type: "restore" });
    expect(list.length).toBe(2);
  });

  it("should clear commands", () => {
    const list = new DisplayList();
    list.push({ type: "save" });
    list.clear();
    expect(list.length).toBe(0);
  });

  it("should execute commands via executor", () => {
    const list = new DisplayList();
    list.push({ type: "save" });
    list.push({ type: "restore" });

    const executed: DrawCommand[] = [];
    list.execute((cmd) => executed.push(cmd));

    expect(executed).toHaveLength(2);
    expect(executed[0].type).toBe("save");
    expect(executed[1].type).toBe("restore");
  });

  // --- View generation ---

  describe("generateForView", () => {
    it("should generate drawRect for view with background", () => {
      const node = new SkiaNode("view");
      node.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        absoluteX: 10,
        absoluteY: 20,
      };
      node.props.backgroundColor = "#FF0000";

      const list = DisplayList.generateForView(node);
      expect(list.length).toBe(1);
      expect(list.commands[0]).toEqual({
        type: "drawRect",
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        color: "#FF0000",
      });
    });

    it("should generate drawRRect for view with border radius", () => {
      const node = new SkiaNode("view");
      node.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        absoluteX: 0,
        absoluteY: 0,
      };
      node.props.backgroundColor = "#00FF00";
      node.props.borderRadius = 8;

      const list = DisplayList.generateForView(node);
      expect(list.length).toBe(1);
      expect(list.commands[0].type).toBe("drawRRect");
      if (list.commands[0].type === "drawRRect") {
        expect(list.commands[0].rx).toBe(8);
        expect(list.commands[0].ry).toBe(8);
      }
    });

    it("should generate border stroke", () => {
      const node = new SkiaNode("view");
      node.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        absoluteX: 0,
        absoluteY: 0,
      };
      node.props.borderWidth = 2;
      node.props.borderColor = "#000";

      const list = DisplayList.generateForView(node);
      const strokeCmd = list.commands.find((c) => c.type === "drawRRectStroke");
      expect(strokeCmd).toBeDefined();
    });

    it("should generate shadow + background + border in order", () => {
      const node = new SkiaNode("view");
      node.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        absoluteX: 0,
        absoluteY: 0,
      };
      node.props.backgroundColor = "#FFF";
      node.props.borderWidth = 1;
      node.props.borderColor = "#000";
      node.props.shadow = {
        color: "#000",
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
      };

      const list = DisplayList.generateForView(node);
      const types = list.commands.map((c) => c.type);
      expect(types).toEqual(["drawShadow", "drawRect", "drawRRectStroke"]);
    });

    it("should return empty list for zero-size node", () => {
      const node = new SkiaNode("view");
      node.layout = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        absoluteX: 0,
        absoluteY: 0,
      };
      node.props.backgroundColor = "#FFF";

      const list = DisplayList.generateForView(node);
      expect(list.length).toBe(0);
    });

    it("should add clip for overflow hidden", () => {
      const node = new SkiaNode("view");
      node.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        absoluteX: 0,
        absoluteY: 0,
      };
      node.props.overflow = "hidden";

      const list = DisplayList.generateForView(node);
      const clipCmd = list.commands.find((c) => c.type === "clipRRect");
      expect(clipCmd).toBeDefined();
    });
  });

  // --- Text generation ---

  describe("generateForText", () => {
    it("should generate drawText command", () => {
      const node = new SkiaNode("text");
      node.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        absoluteX: 10,
        absoluteY: 30,
      };
      node.props.text = "Hello";
      node.props.color = "#333";
      node.props.fontSize = 16;

      const list = DisplayList.generateForText(node);
      expect(list.length).toBe(1);
      expect(list.commands[0]).toEqual({
        type: "drawText",
        text: "Hello",
        x: 10,
        y: 30,
        color: "#333",
        fontSize: 16,
      });
    });

    it("should use defaults for missing color/fontSize", () => {
      const node = new SkiaNode("text");
      node.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        absoluteX: 0,
        absoluteY: 0,
      };
      node.props.text = "Default";

      const list = DisplayList.generateForText(node);
      if (list.commands[0].type === "drawText") {
        expect(list.commands[0].color).toBe("#000000");
        expect(list.commands[0].fontSize).toBe(14);
      }
    });

    it("should return empty list if no text", () => {
      const node = new SkiaNode("text");
      node.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        absoluteX: 0,
        absoluteY: 0,
      };

      const list = DisplayList.generateForText(node);
      expect(list.length).toBe(0);
    });
  });

  // --- Generic generate ---

  describe("generate", () => {
    it("should dispatch to correct generator by type", () => {
      const viewNode = new SkiaNode("view");
      viewNode.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        absoluteX: 0,
        absoluteY: 0,
      };
      viewNode.props.backgroundColor = "#FFF";
      expect(DisplayList.generate(viewNode).length).toBeGreaterThan(0);

      const textNode = new SkiaNode("text");
      textNode.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        absoluteX: 0,
        absoluteY: 0,
      };
      textNode.props.text = "Test";
      expect(DisplayList.generate(textNode).length).toBeGreaterThan(0);

      const markerNode = new SkiaNode("marker");
      expect(DisplayList.generate(markerNode).length).toBe(0);
    });
  });
});
