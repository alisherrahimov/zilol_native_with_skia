import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  setTextMeasurer,
  getTextMeasurer,
  _resetTextMeasurer,
  MeasureMode,
} from "../src/TextMeasure";
import type { TextMeasureFunc } from "../src/TextMeasure";

describe("TextMeasure", () => {
  afterEach(() => {
    _resetTextMeasurer();
  });

  it("should return a default stub that returns 0x0", () => {
    const measurer = getTextMeasurer();
    const result = measurer(
      "Hello",
      14,
      undefined,
      undefined,
      100,
      MeasureMode.AtMost,
      Infinity,
      MeasureMode.Undefined,
    );

    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it("should allow registering a custom measurer", () => {
    const customMeasurer: TextMeasureFunc = (text, fontSize) => ({
      width: text.length * fontSize * 0.6,
      height: fontSize * 1.2,
    });

    setTextMeasurer(customMeasurer);

    const measurer = getTextMeasurer();
    const result = measurer(
      "Hello",
      20,
      undefined,
      undefined,
      200,
      MeasureMode.AtMost,
      Infinity,
      MeasureMode.Undefined,
    );

    expect(result.width).toBe(5 * 20 * 0.6); // 60
    expect(result.height).toBe(20 * 1.2); // 24
  });

  it("should reset to default stub", () => {
    const customMeasurer: TextMeasureFunc = () => ({
      width: 999,
      height: 999,
    });

    setTextMeasurer(customMeasurer);
    expect(
      getTextMeasurer()("", 14, undefined, undefined, 0, 0, 0, 0).width,
    ).toBe(999);

    _resetTextMeasurer();
    expect(
      getTextMeasurer()("", 14, undefined, undefined, 0, 0, 0, 0).width,
    ).toBe(0);
  });

  it("should pass all parameters to the custom measurer", () => {
    let receivedArgs: unknown[] = [];

    const spy: TextMeasureFunc = (
      text,
      fontSize,
      fontFamily,
      fontWeight,
      maxWidth,
      widthMode,
      maxHeight,
      heightMode,
      lineHeight,
      maxLines,
    ) => {
      receivedArgs = [
        text,
        fontSize,
        fontFamily,
        fontWeight,
        maxWidth,
        widthMode,
        maxHeight,
        heightMode,
        lineHeight,
        maxLines,
      ];
      return { width: 0, height: 0 };
    };

    setTextMeasurer(spy);

    getTextMeasurer()(
      "Hello World",
      16,
      "Inter",
      "bold",
      300,
      MeasureMode.AtMost,
      100,
      MeasureMode.Exactly,
      1.5,
      3,
    );

    expect(receivedArgs).toEqual([
      "Hello World",
      16,
      "Inter",
      "bold",
      300,
      MeasureMode.AtMost,
      100,
      MeasureMode.Exactly,
      1.5,
      3,
    ]);
  });
});
