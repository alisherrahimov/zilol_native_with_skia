/**
 * types.ts — Opaque Skia interfaces for testability.
 *
 * Instead of importing from @shopify/react-native-skia directly, we
 * define minimal interfaces that the renderer uses. The actual Skia
 * objects are passed in by the platform layer.
 *
 * This enables testing draw logic with mock canvas objects.
 */

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

/** Minimal Skia canvas interface used by the renderer. */
export interface SkCanvas {
  save(): void;
  restore(): void;
  translate(dx: number, dy: number): void;
  scale(sx: number, sy: number): void;
  rotate(degrees: number): void;
  concat(matrix: number[]): void;

  clipRect(x: number, y: number, width: number, height: number): void;
  clipRRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
  ): void;

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    paint: SkPaint,
  ): void;
  drawRRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
    paint: SkPaint,
  ): void;

  drawText(text: string, x: number, y: number, paint: SkPaint): void;
  drawImage(
    image: SkImage,
    x: number,
    y: number,
    width: number,
    height: number,
    paint?: SkPaint,
  ): void;

  saveLayerAlpha(
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number,
  ): void;

  clear(color: string): void;
}

// ---------------------------------------------------------------------------
// Paint
// ---------------------------------------------------------------------------

export type PaintStyle = "fill" | "stroke";

/** Minimal Skia paint interface. */
export interface SkPaint {
  setColor(color: string): void;
  setStyle(style: PaintStyle): void;
  setStrokeWidth(width: number): void;
  setAlpha(alpha: number): void;
  setImageFilter(filter: SkImageFilter | null): void;
  clone(): SkPaint;
}

// ---------------------------------------------------------------------------
// Image Filter
// ---------------------------------------------------------------------------

/** Minimal Skia image filter interface. */
export interface SkImageFilter {
  readonly _brand: "SkImageFilter";
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

/** Minimal Skia image interface. */
export interface SkImage {
  width(): number;
  height(): number;
}

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Minimal Skia surface interface. */
export interface SkSurface {
  getCanvas(): SkCanvas;
  width(): number;
  height(): number;
  flush(): void;
}

// ---------------------------------------------------------------------------
// Draw Commands (tagged union)
// ---------------------------------------------------------------------------

export type DrawCommand =
  | DrawRectCommand
  | DrawRRectCommand
  | DrawRRectStrokeCommand
  | DrawTextCommand
  | DrawImageCommand
  | DrawShadowCommand
  | ClipRRectCommand
  | SaveCommand
  | RestoreCommand
  | TranslateCommand
  | ClearCommand;

export interface DrawRectCommand {
  type: "drawRect";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface DrawRRectCommand {
  type: "drawRRect";
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
  color: string;
}

export interface DrawRRectStrokeCommand {
  type: "drawRRectStroke";
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
  color: string;
  strokeWidth: number;
}

export interface DrawTextCommand {
  type: "drawText";
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export interface DrawImageCommand {
  type: "drawImage";
  image: SkImage;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawShadowCommand {
  type: "drawShadow";
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
  color: string;
  offsetX: number;
  offsetY: number;
  blurRadius: number;
}

export interface ClipRRectCommand {
  type: "clipRRect";
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
}

export interface SaveCommand {
  type: "save";
}

export interface RestoreCommand {
  type: "restore";
}

export interface TranslateCommand {
  type: "translate";
  dx: number;
  dy: number;
}

export interface ClearCommand {
  type: "clear";
  color: string;
}
