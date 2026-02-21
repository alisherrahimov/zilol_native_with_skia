/**
 * SwiftUI-style component API tests.
 */

import { describe, it, expect } from "vitest";
import { View } from "../src/View";
import { Text } from "../src/Text";
import { signal } from "@zilol-native/runtime";

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

describe("View", () => {
  it("should create a view node with no children", () => {
    const v = View();
    expect(v.node.type).toBe("view");
    expect(v.node.children).toEqual([]);
  });

  it("should chain layout modifiers", () => {
    const v = View()
      .width(200)
      .height(100)
      .flex(1)
      .flexDirection("column")
      .justifyContent("center")
      .alignItems("center");

    expect(v.node.props.width).toBe(200);
    expect(v.node.props.height).toBe(100);
    expect(v.node.props.flex).toBe(1);
    expect(v.node.props.flexDirection).toBe("column");
    expect(v.node.props.justifyContent).toBe("center");
    expect(v.node.props.alignItems).toBe("center");
  });

  it("should chain visual modifiers", () => {
    const v = View()
      .backgroundColor("#FF0000")
      .borderRadius(12)
      .borderWidth(2)
      .borderColor("#00FF00")
      .opacity(0.8);

    expect(v.node.props.backgroundColor).toBe("#FF0000");
    expect(v.node.props.borderRadius).toBe(12);
    expect(v.node.props.borderWidth).toBe(2);
    expect(v.node.props.borderColor).toBe("#00FF00");
    expect(v.node.props.opacity).toBe(0.8);
  });

  it("should accept children as varargs", () => {
    const child1 = View().width(50);
    const child2 = Text("Hello");
    const parent = View(child1, child2).flex(1);

    expect(parent.node.children.length).toBe(2);
    expect(parent.node.children[0]).toBe(child1.node);
    expect(parent.node.children[1]).toBe(child2.node);
  });

  it("should filter out null, undefined, and false children", () => {
    const child = View().width(50);
    const parent = View(null, child, undefined, false);

    expect(parent.node.children.length).toBe(1);
    expect(parent.node.children[0]).toBe(child.node);
  });

  it("should support .size() shorthand", () => {
    const v = View().size(100, 50);
    expect(v.node.props.width).toBe(100);
    expect(v.node.props.height).toBe(50);
  });

  it("should support .column() and .row() aliases", () => {
    const col = View().column();
    expect(col.node.props.flexDirection).toBe("column");

    const row = View().row();
    expect(row.node.props.flexDirection).toBe("row");
  });

  it("should support .border() shorthand", () => {
    const v = View().border(2, "#333");
    expect(v.node.props.borderWidth).toBe(2);
    expect(v.node.props.borderColor).toBe("#333");
  });

  it("should support .absolute() shorthand", () => {
    const v = View().absolute().top(10).left(20);
    expect(v.node.props.position).toBe("absolute");
    expect(v.node.props.top).toBe(10);
    expect(v.node.props.left).toBe(20);
  });

  it("should bind reactive props", () => {
    const bg = signal("#FF0000");
    const v = View().backgroundColor(() => bg.value);

    expect(v.node.props.backgroundColor).toBe("#FF0000");

    bg.value = "#00FF00";
    expect(v.node.props.backgroundColor).toBe("#00FF00");
  });

  it("should set onPress and auto-enable touchable", () => {
    let pressed = false;
    const v = View().onPress(() => {
      pressed = true;
    });

    expect(v.node.props.touchable).toBe(true);
    expect(typeof v.node.props.onPress).toBe("function");
  });

  it("should support .key()", () => {
    const v = View().key("my-view");
    expect(v.node.key).toBe("my-view");
  });

  it("should support deep nesting", () => {
    const tree = View(
      View(Text("Nested").fontSize(14)).backgroundColor("#333"),
      View().height(50),
    )
      .flex(1)
      .column();

    expect(tree.node.children.length).toBe(2);
    expect(tree.node.children[0].type).toBe("view");
    expect(tree.node.children[0].children.length).toBe(1);
    expect(tree.node.children[0].children[0].type).toBe("text");
    expect(tree.node.children[0].children[0].props.text).toBe("Nested");
  });

  it("should support spacing modifiers", () => {
    const v = View().padding(16).margin(8).gap(12);
    expect(v.node.props.padding).toBe(16);
    expect(v.node.props.margin).toBe(8);
    expect(v.node.props.gap).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

describe("Text", () => {
  it("should create a text node with static content", () => {
    const t = Text("Hello, Zilol!");
    expect(t.node.type).toBe("text");
    expect(t.node.props.text).toBe("Hello, Zilol!");
  });

  it("should create a text node with no content", () => {
    const t = Text();
    expect(t.node.type).toBe("text");
  });

  it("should chain font modifiers", () => {
    const t = Text("Test")
      .fontSize(18)
      .fontWeight("bold")
      .fontFamily("Inter")
      .color("#FFFFFF")
      .textAlign("center");

    expect(t.node.props.fontSize).toBe(18);
    expect(t.node.props.fontWeight).toBe("bold");
    expect(t.node.props.fontFamily).toBe("Inter");
    expect(t.node.props.color).toBe("#FFFFFF");
    expect(t.node.props.textAlign).toBe("center");
  });

  it("should support .bold() shorthand", () => {
    const t = Text("Bold").bold();
    expect(t.node.props.fontWeight).toBe("bold");
  });

  it("should support .ellipsis() shorthand", () => {
    const t = Text("Long text...").ellipsis(2);
    expect(t.node.props.maxLines).toBe(2);
    expect(t.node.props.textOverflow).toBe("ellipsis");
  });

  it("should bind reactive text", () => {
    const count = signal(0);
    const t = Text(() => `Count: ${count.value}`);

    expect(t.node.props.text).toBe("Count: 0");

    count.value = 42;
    expect(t.node.props.text).toBe("Count: 42");
  });

  it("should bind reactive font size", () => {
    const size = signal(14);
    const t = Text("Test").fontSize(() => size.value);

    expect(t.node.props.fontSize).toBe(14);

    size.value = 24;
    expect(t.node.props.fontSize).toBe(24);
  });

  it("should support layout modifiers", () => {
    const t = Text("Layout").width(200).margin(8).alignSelf("center");

    expect(t.node.props.width).toBe(200);
    expect(t.node.props.margin).toBe(8);
    expect(t.node.props.alignSelf).toBe("center");
  });

  it("should support .key()", () => {
    const t = Text("Keyed").key("my-text");
    expect(t.node.key).toBe("my-text");
  });
});
