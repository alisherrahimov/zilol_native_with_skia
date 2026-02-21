/**
 * adapter.ts — Platform adapter bridging TS renderer to C++ JSI.
 *
 * Implements the renderer's opaque SkCanvas / SkPaint / SkSurface
 * interfaces by wrapping the JSI canvas globals exposed by
 * SkiaCanvasHostObject.
 *
 * Also provides a CommandExecutor that maps DrawCommand tagged unions
 * to JSI canvas method calls.
 */

import type {
  SkCanvas,
  SkPaint,
  SkSurface,
  SkImage,
  SkImageFilter,
  PaintStyle,
  DrawCommand,
} from "@zilol-native/renderer";
import type { CommandExecutor } from "@zilol-native/renderer";

// ---------------------------------------------------------------------------
// JSI globals (declared by C++ runtime — available at runtime)
// ---------------------------------------------------------------------------

declare const __skiaGetSurface: () => any;
declare const __skiaFlushSurface: () => void;
declare const __skiaGetSurfaceWidth: () => number;
declare const __skiaGetSurfaceHeight: () => number;
declare const __skiaRequestFrame: (cb: (ts: number) => void) => void;
declare const __getScreenWidth: () => number;
declare const __getScreenHeight: () => number;
declare const __getPixelRatio: () => number;
declare const __getSafeAreaInsets: () => {
  top: number;
  bottom: number;
  left: number;
  right: number;
};
declare const __getNativeFPS: () => number;
declare const __getVsyncRate: () => number;

// ---------------------------------------------------------------------------
// JSIPaint — implements SkPaint by storing state in-memory
// ---------------------------------------------------------------------------

class JSIPaint implements SkPaint {
  private _color: string = "#000000";
  private _style: PaintStyle = "fill";
  private _strokeWidth: number = 1;
  private _alpha: number = 1;
  private _imageFilter: SkImageFilter | null = null;

  setColor(color: string): void {
    this._color = color;
  }
  setStyle(style: PaintStyle): void {
    this._style = style;
  }
  setStrokeWidth(width: number): void {
    this._strokeWidth = width;
  }
  setAlpha(alpha: number): void {
    this._alpha = alpha;
  }
  setImageFilter(filter: SkImageFilter | null): void {
    this._imageFilter = filter;
  }
  clone(): SkPaint {
    const p = new JSIPaint();
    p._color = this._color;
    p._style = this._style;
    p._strokeWidth = this._strokeWidth;
    p._alpha = this._alpha;
    p._imageFilter = this._imageFilter;
    return p;
  }

  get color(): string {
    return this._color;
  }
  get style(): PaintStyle {
    return this._style;
  }
  get strokeWidth(): number {
    return this._strokeWidth;
  }
  get alpha(): number {
    return this._alpha;
  }
}

// ---------------------------------------------------------------------------
// JSISurface — wraps JSI surface globals
// ---------------------------------------------------------------------------

class JSISurface implements SkSurface {
  private _jsiSurface: any;

  constructor() {
    this._jsiSurface = __skiaGetSurface();
  }

  getCanvas(): SkCanvas {
    // The JSI surface.getCanvas() returns a SkiaCanvasHostObject
    // We wrap it as SkCanvas — but our CommandExecutor bypasses this
    // and calls the native canvas methods directly
    return this._jsiSurface.getCanvas();
  }

  width(): number {
    return __skiaGetSurfaceWidth();
  }

  height(): number {
    return __skiaGetSurfaceHeight();
  }

  flush(): void {
    __skiaFlushSurface();
  }
}

// ---------------------------------------------------------------------------
// CommandExecutor — maps DrawCommand → JSI canvas calls
// ---------------------------------------------------------------------------

/**
 * Create a CommandExecutor that dispatches DrawCommands to a JSI canvas.
 *
 * The JSI canvas methods accept inline color strings (not Paint objects),
 * so we extract color from each command directly.
 */
export function createCommandExecutor(canvas: any): CommandExecutor {
  return (command: DrawCommand): void => {
    switch (command.type) {
      case "drawRect":
        canvas.drawRect(
          command.x,
          command.y,
          command.width,
          command.height,
          command.color,
        );
        break;

      case "drawRRect":
        canvas.drawRRect(
          command.x,
          command.y,
          command.width,
          command.height,
          command.rx,
          command.ry,
          command.color,
        );
        break;

      case "drawRRectStroke":
        canvas.drawRRectStroke(
          command.x,
          command.y,
          command.width,
          command.height,
          command.rx,
          command.ry,
          command.color,
          command.strokeWidth,
        );
        break;

      case "drawText":
        canvas.drawText(
          command.text,
          command.x,
          command.y,
          command.color,
          command.fontSize,
        );
        break;

      case "drawImage":
        // TODO: image drawing requires SkImage host object
        break;

      case "drawShadow":
        canvas.drawShadow(
          command.x,
          command.y,
          command.width,
          command.height,
          command.rx,
          command.ry,
          command.color,
          command.offsetX,
          command.offsetY,
          command.blurRadius,
        );
        break;

      case "clipRRect":
        canvas.clipRRect(
          command.x,
          command.y,
          command.width,
          command.height,
          command.rx,
          command.ry,
        );
        break;

      case "save":
        canvas.save();
        break;

      case "restore":
        canvas.restore();
        break;

      case "translate":
        canvas.translate(command.dx, command.dy);
        break;

      case "clear":
        canvas.clear(command.color);
        break;
    }
  };
}

// ---------------------------------------------------------------------------
// Platform helpers
// ---------------------------------------------------------------------------

/** Create a JSISurface wrapping the native Metal surface. */
export function createSurface(): JSISurface {
  return new JSISurface();
}

/** Request a frame callback via the native display link. */
export function requestFrame(callback: (timestamp: number) => void): void {
  __skiaRequestFrame(callback);
}

/** Get screen dimensions in points. */
export function getScreenInfo() {
  return {
    width: __getScreenWidth(),
    height: __getScreenHeight(),
    pixelRatio: __getPixelRatio(),
    safeArea: __getSafeAreaInsets(),
  };
}

/** Get performance metrics. */
export function getPerformanceMetrics() {
  return {
    renderFps: __getNativeFPS(),
    vsyncRate: __getVsyncRate(),
  };
}
