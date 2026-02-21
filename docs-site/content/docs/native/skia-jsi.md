---
title: Skia JSI API
description: Complete reference for all Skia functions exposed to JavaScript via JSI.
order: 2
---

## Surface

```typescript
// Get the main Skia surface (Metal on iOS, Vulkan/GL on Android)
declare function __skiaGetSurface(): SkiaSurfaceProxy;

// Flush all pending draw commands to the GPU
declare function __skiaFlushSurface(): void;

// Get surface dimensions
declare function __skiaGetSurfaceWidth(): number;
declare function __skiaGetSurfaceHeight(): number;
```

## Image Loading

```typescript
// Load image from bundle file path (synchronous)
declare function __skiaLoadImage(path: string): SkiaImageProxy | undefined;

// Load image from URL (asynchronous)
declare function __skiaLoadImageFromURL(
  url: string,
  callback: (image: SkiaImageProxy | undefined) => void,
): void;

interface SkiaImageProxy {
  width(): number;
  height(): number;
  isValid(): boolean;
}
```

## Canvas API

The canvas proxy is a JSI HostObject exposing the SkCanvas interface:

### State Management

```typescript
canvas.save(); // Save canvas state
canvas.restore(); // Restore canvas state
canvas.translate(dx, dy);
canvas.scale(sx, sy);
canvas.rotate(degrees);
canvas.concat(matrix); // 4x4 matrix
```

### Clipping

```typescript
canvas.clipRect(x, y, width, height);
canvas.clipRRect(x, y, width, height, rx, ry);
```

### Drawing Rectangles

```typescript
canvas.drawRect(x, y, width, height, color);
canvas.drawRRect(x, y, width, height, rx, ry, color);
canvas.drawRRectStroke(x, y, width, height, rx, ry, color, strokeWidth);
canvas.drawRRect4(x, y, w, h, tlx, tly, trx, try_, brx, bry, blx, bly, color);
```

### Drawing Text

```typescript
canvas.drawText(text, x, y, color, fontSize);
canvas.measureText(text, fontSize, maxWidth);
```

### Drawing Images

```typescript
canvas.drawImage(image, x, y, width, height);
```

### Effects

```typescript
canvas.drawShadow(x, y, w, h, rx, ry, color, offsetX, offsetY, blurRadius);
canvas.drawRectGradient(x, y, w, h, type, colors, positions);
canvas.drawBlurRect(x, y, w, h, blurRadius, color);
canvas.saveLayerAlpha(x, y, w, h, alpha);
canvas.clear(color);
```

## Text Measurement

```typescript
declare function __skiaMeasureText(
  text: string,
  fontSize: number,
  maxWidth: number,
): { width: number; height: number };

declare function __skiaRegisterFont(familyName: string, filePath: string): void;
```

## Frame Scheduling

```typescript
// Request callback on next vsync (CADisplayLink on iOS)
declare function __skiaRequestFrame(
  callback: (timestamp: number) => void,
): number;

// Cancel a frame request
declare function __skiaCancelFrame(id: number): void;
```

## Touch Events

```typescript
declare function __registerTouchHandler(
  handler: (
    phase: number, // 0=began, 1=moved, 2=ended, 3=cancelled
    x: number,
    y: number,
    pointerId: number,
  ) => void,
): void;
```

## Platform Info

```typescript
declare function __getScreenWidth(): number;
declare function __getScreenHeight(): number;
declare function __getPixelRatio(): number;
declare function __getSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
declare function __getStatusBarHeight(): number;
declare function __getBundleResourcePath(): string | undefined;
```
