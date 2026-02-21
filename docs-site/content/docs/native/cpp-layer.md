---
title: C++ Layer
description: Architecture of the shared C++ core that powers Skia rendering, Yoga layout, and platform integration.
order: 3
---

## Overview

The C++ layer is the shared core of Zilol Native. It lives in `packages/cpp/` and provides platform-agnostic implementations that are compiled for both iOS and Android.

## Directory Structure

```
packages/cpp/
├── skia/
│   ├── SkiaCanvasHostObject.h    # JSI proxy for SkCanvas
│   ├── SkiaSurfaceHostObject.h   # JSI proxy for SkSurface
│   ├── SkiaHostFunctions.cpp     # Global function registration
│   ├── SkiaHostFunctions.h
│   ├── SkiaImageHostObject.h     # JSI proxy for SkImage
│   ├── SkiaImageManager.h        # Async image loading
│   ├── SkiaRenderer.h            # Render loop driver
│   ├── SkiaTextRenderer.h        # Skia Paragraph text rendering
│   ├── SkiaGradient.h            # Gradient shader creation
│   └── ColorParser.h             # CSS color string → SkColor
├── yoga/
│   └── YogaBridge.h              # Yoga node management via JSI
├── runtime/
│   └── ZilolRuntime.h            # Hermes integration + timer APIs
└── platform/
    └── PlatformBridge.h          # Screen info, safe area, etc.
```

## SkiaCanvasHostObject

The canvas host object is the most complex piece. It wraps a Skia `SkCanvas` pointer and exposes drawing methods to JavaScript via JSI:

```cpp
class SkiaCanvasHostObject : public jsi::HostObject {
  SkCanvas* canvas_;

  jsi::Value drawRect(jsi::Runtime& rt, const jsi::Value* args) {
    float x = args[0].asNumber();
    float y = args[1].asNumber();
    float w = args[2].asNumber();
    float h = args[3].asNumber();
    std::string color = args[4].asString(rt).utf8(rt);

    SkPaint paint;
    paint.setColor(parseColor(color));
    paint.setAntiAlias(true);
    canvas_->drawRect(SkRect::MakeXYWH(x, y, w, h), paint);

    return jsi::Value::undefined();
  }
};
```

Each drawing method:

1. Extracts arguments from JSI values
2. Creates or reuses Skia paint objects
3. Calls the corresponding SkCanvas method
4. Returns undefined (void)

## SkiaHostFunctions

This file registers all global `__skia*` functions during app initialization:

```cpp
void SkiaHostFunctions::install(jsi::Runtime& runtime) {
  // Surface
  registerFunction(runtime, "__skiaGetSurface", ...);
  registerFunction(runtime, "__skiaFlushSurface", ...);

  // Image loading
  registerFunction(runtime, "__skiaLoadImage", ...);
  registerFunction(runtime, "__skiaLoadImageFromURL", ...);

  // Text
  registerFunction(runtime, "__skiaMeasureText", ...);

  // Frame scheduling
  registerFunction(runtime, "__skiaRequestFrame", ...);
  registerFunction(runtime, "__skiaCancelFrame", ...);
}
```

## ColorParser

Converts CSS color strings to Skia `SkColor4f`:

- Named colors: `"red"`, `"blue"`, `"transparent"`
- Hex: `"#FF0000"`, `"#F00"`, `"#FF000080"`
- RGB/RGBA: `"rgb(255,0,0)"`, `"rgba(255,0,0,0.5)"`
- HSL: `"hsl(0,100%,50%)"`

## Key Design Decisions

- **Host Objects over plain objects** — SkCanvas, SkSurface, SkImage are JSI HostObjects, meaning method calls go directly to C++ without serialization
- **Paint caching** — Frequently used paints (background, border) are cached and reused
- **Async image loading** — Uses platform dispatch (GCD on iOS, Looper on Android) to decode images off the JS thread
- **Zero-copy color parsing** — Colors are parsed once and cached as `SkColor4f`
