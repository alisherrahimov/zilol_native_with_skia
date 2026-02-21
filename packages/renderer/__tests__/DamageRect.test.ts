import { describe, it, expect, beforeEach } from "vitest";
import { SkiaNode, _resetNodeIdCounter } from "@zilol-native/nodes";
import {
  collectDamageRects,
  mergeRects,
  intersects,
  unionRects,
} from "../src/pipeline/DamageRect";

describe("DamageRect", () => {
  beforeEach(() => {
    _resetNodeIdCounter();
  });

  // --- intersects ---

  describe("intersects", () => {
    it("should detect overlapping rects", () => {
      const a = { x: 0, y: 0, width: 100, height: 100 };
      const b = { x: 50, y: 50, width: 100, height: 100 };
      expect(intersects(a, b)).toBe(true);
    });

    it("should return false for non-overlapping rects", () => {
      const a = { x: 0, y: 0, width: 50, height: 50 };
      const b = { x: 100, y: 100, width: 50, height: 50 };
      expect(intersects(a, b)).toBe(false);
    });

    it("should return false for adjacent (touching) rects", () => {
      const a = { x: 0, y: 0, width: 50, height: 50 };
      const b = { x: 50, y: 0, width: 50, height: 50 };
      expect(intersects(a, b)).toBe(false);
    });

    it("should detect containment as intersection", () => {
      const big = { x: 0, y: 0, width: 100, height: 100 };
      const small = { x: 25, y: 25, width: 50, height: 50 };
      expect(intersects(big, small)).toBe(true);
    });
  });

  // --- unionRects ---

  describe("unionRects", () => {
    it("should compute bounding union", () => {
      const a = { x: 0, y: 0, width: 50, height: 50 };
      const b = { x: 100, y: 100, width: 50, height: 50 };
      const result = unionRects(a, b);
      expect(result).toEqual({ x: 0, y: 0, width: 150, height: 150 });
    });

    it("should handle contained rects", () => {
      const big = { x: 0, y: 0, width: 100, height: 100 };
      const small = { x: 25, y: 25, width: 50, height: 50 };
      expect(unionRects(big, small)).toEqual(big);
    });
  });

  // --- collectDamageRects ---

  describe("collectDamageRects", () => {
    it("should return empty array for clean tree", () => {
      const root = new SkiaNode("view");
      root.clearDirty();
      const rects = collectDamageRects(root);
      expect(rects).toEqual([]);
    });

    it("should collect dirty rect from dirty node", () => {
      const root = new SkiaNode("view");
      root.clearDirty();
      root.layout = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        absoluteX: 0,
        absoluteY: 0,
      };
      root.dirtyRect = { x: 0, y: 0, width: 100, height: 100 };
      root.dirty = true;

      const rects = collectDamageRects(root);
      expect(rects).toHaveLength(1);
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });

    it("should walk into dirty descendants", () => {
      const root = new SkiaNode("view");
      const child = new SkiaNode("view");
      root.appendChild(child);

      root.clearDirty();
      child.clearDirty();

      // Mark child dirty
      child.dirtyRect = { x: 10, y: 10, width: 50, height: 50 };
      child.dirty = true;
      root.hasDirtyDescendant = true;

      const rects = collectDamageRects(root);
      expect(rects).toHaveLength(1);
      expect(rects[0]).toEqual({ x: 10, y: 10, width: 50, height: 50 });
    });

    it("should not walk children without dirty descendant flag", () => {
      const root = new SkiaNode("view");
      const child = new SkiaNode("view");
      root.appendChild(child);

      root.clearDirty();
      child.clearDirty();

      // Make child dirty but don't set hasDirtyDescendant on root
      child.dirtyRect = { x: 10, y: 10, width: 50, height: 50 };
      child.dirty = true;
      // root.hasDirtyDescendant is false — walk should not enter children

      const rects = collectDamageRects(root);
      expect(rects).toHaveLength(0);
    });
  });

  // --- mergeRects ---

  describe("mergeRects", () => {
    it("should return single rect as-is", () => {
      const rects = [{ x: 0, y: 0, width: 50, height: 50 }];
      expect(mergeRects(rects)).toEqual(rects);
    });

    it("should return empty for empty input", () => {
      expect(mergeRects([])).toEqual([]);
    });

    it("should merge overlapping rects", () => {
      const rects = [
        { x: 0, y: 0, width: 60, height: 60 },
        { x: 40, y: 40, width: 60, height: 60 },
      ];
      const merged = mergeRects(rects);
      expect(merged).toHaveLength(1);
      expect(merged[0]).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });

    it("should keep non-overlapping rects separate", () => {
      const rects = [
        { x: 0, y: 0, width: 40, height: 40 },
        { x: 200, y: 200, width: 40, height: 40 },
      ];
      const merged = mergeRects(rects);
      expect(merged).toHaveLength(2);
    });
  });
});
