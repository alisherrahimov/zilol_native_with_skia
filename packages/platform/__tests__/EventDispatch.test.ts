/**
 * EventDispatch.test.ts — Tests for touch event dispatch and bubbling.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SkiaNode } from "@zilol-native/nodes";
import { EventDispatcher, TouchPhase } from "../src/EventDispatch";
import type { TouchEvent } from "../src/EventDispatch";

describe("EventDispatcher", () => {
  let root: SkiaNode;
  let dispatcher: EventDispatcher;

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

    dispatcher = new EventDispatcher();
    dispatcher.setRoot(root);
  });

  it("dispatches onTouchStart and onPressIn on touch began", () => {
    const onTouchStart = vi.fn();
    const onPressIn = vi.fn();

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onTouchStart", onTouchStart);
    child.setProp("onPressIn", onPressIn);
    root.appendChild(child);

    dispatcher.handleTouch(TouchPhase.Began, 50, 50, 0);

    expect(onTouchStart).toHaveBeenCalledTimes(1);
    expect(onPressIn).toHaveBeenCalledTimes(1);

    const event: TouchEvent = onTouchStart.mock.calls[0][0];
    expect(event.x).toBe(50);
    expect(event.y).toBe(50);
    expect(event.pointerId).toBe(0);
    expect(event.phase).toBe(TouchPhase.Began);
    expect(event.target).toBe(child);
  });

  it("dispatches onTouchMove on touch moved", () => {
    const onTouchMove = vi.fn();

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onTouchStart", () => {}); // make touchable for hit test
    child.setProp("onTouchMove", onTouchMove);
    root.appendChild(child);

    // Start touch to register active target
    dispatcher.handleTouch(TouchPhase.Began, 50, 50, 0);

    // Move
    dispatcher.handleTouch(TouchPhase.Moved, 60, 70, 0);

    expect(onTouchMove).toHaveBeenCalledTimes(1);
    const event: TouchEvent = onTouchMove.mock.calls[0][0];
    expect(event.x).toBe(60);
    expect(event.y).toBe(70);
  });

  it("dispatches onPress when touch ends within target bounds", () => {
    const onPress = vi.fn();
    const onPressOut = vi.fn();

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onPress", onPress);
    child.setProp("onPressOut", onPressOut);
    child.setProp("onTouchStart", () => {}); // touchable
    root.appendChild(child);

    dispatcher.handleTouch(TouchPhase.Began, 50, 50, 0);
    dispatcher.handleTouch(TouchPhase.Ended, 60, 60, 0); // within bounds

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it("does NOT dispatch onPress when touch ends outside target bounds", () => {
    const onPress = vi.fn();

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onPress", onPress);
    child.setProp("onTouchStart", () => {}); // touchable
    root.appendChild(child);

    dispatcher.handleTouch(TouchPhase.Began, 50, 50, 0);
    dispatcher.handleTouch(TouchPhase.Ended, 200, 200, 0); // outside bounds

    expect(onPress).not.toHaveBeenCalled();
  });

  it("bubbles events up to parent", () => {
    const parentHandler = vi.fn();

    const parent = new SkiaNode("view");
    parent.layout = {
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      absoluteX: 0,
      absoluteY: 0,
    };
    parent.setProp("onTouchStart", parentHandler);

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      absoluteX: 50,
      absoluteY: 50,
    };
    child.setProp("onTouchStart", () => {}); // touchable
    child.setProp("onPress", () => {}); // touchable

    root.appendChild(parent);
    parent.appendChild(child);

    dispatcher.handleTouch(TouchPhase.Began, 60, 60, 0);

    // Parent's onTouchStart should be called via bubbling
    expect(parentHandler).toHaveBeenCalledTimes(1);
  });

  it("handles touch cancelled by firing onPressOut", () => {
    const onPressOut = vi.fn();

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onPressOut", onPressOut);
    child.setProp("onTouchStart", () => {}); // touchable
    root.appendChild(child);

    dispatcher.handleTouch(TouchPhase.Began, 50, 50, 0);
    dispatcher.handleTouch(TouchPhase.Cancelled, 50, 50, 0);

    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it("ignores touch move without prior began", () => {
    const onTouchMove = vi.fn();

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onTouchMove", onTouchMove);
    root.appendChild(child);

    // No began → move should be ignored
    dispatcher.handleTouch(TouchPhase.Moved, 50, 50, 0);

    expect(onTouchMove).not.toHaveBeenCalled();
  });

  it("supports multi-touch (different pointer IDs)", () => {
    const onTouchStartA = vi.fn();
    const onTouchStartB = vi.fn();

    const childA = new SkiaNode("view");
    childA.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      absoluteX: 0,
      absoluteY: 0,
    };
    childA.setProp("onTouchStart", onTouchStartA);

    const childB = new SkiaNode("view");
    childB.layout = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      absoluteX: 200,
      absoluteY: 200,
    };
    childB.setProp("onTouchStart", onTouchStartB);

    root.appendChild(childA);
    root.appendChild(childB);

    dispatcher.handleTouch(TouchPhase.Began, 50, 50, 0); // hits childA
    dispatcher.handleTouch(TouchPhase.Began, 220, 220, 1); // hits childB

    expect(onTouchStartA).toHaveBeenCalledTimes(1);
    expect(onTouchStartB).toHaveBeenCalledTimes(1);
  });

  it("reset clears active touches", () => {
    const onTouchEnd = vi.fn();

    const child = new SkiaNode("view");
    child.layout = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      absoluteX: 0,
      absoluteY: 0,
    };
    child.setProp("onTouchEnd", onTouchEnd);
    child.setProp("onTouchStart", () => {});
    root.appendChild(child);

    dispatcher.handleTouch(TouchPhase.Began, 50, 50, 0);
    dispatcher.reset();
    dispatcher.handleTouch(TouchPhase.Ended, 50, 50, 0);

    // After reset, the ended event should be ignored (no active touch)
    expect(onTouchEnd).not.toHaveBeenCalled();
  });
});
