---
title: Bridge Overview
description: How the C++ core connects JavaScript to native Skia, Yoga, and platform APIs via JSI.
order: 1
---

## Architecture

Zilol Native's bridge is fundamentally different from React Native's traditional bridge. Instead of asynchronous JSON message passing, it uses **synchronous C++ function calls** via JSI (JavaScript Interface).

```
JavaScript (Hermes)
      │
      │  Direct C++ function calls (JSI)
      │  Zero serialization, zero async
      ▼
C++ Shared Core
      │
      ├── Skia (GPU rendering)
      ├── Yoga (layout engine)
      └── Platform APIs
```

## Why JSI?

| Feature       | Old Bridge                      | JSI Bridge            |
| ------------- | ------------------------------- | --------------------- |
| Communication | Async JSON batches              | Synchronous C++ calls |
| Overhead      | Serialize → queue → deserialize | Direct function call  |
| Latency       | 1-5ms per batch                 | ~0.001ms per call     |
| Threading     | Cross-thread messaging          | Same-thread execution |
| Data types    | JSON only                       | Native C++ types      |

## How It Works

During app startup, the C++ layer registers functions directly on JavaScript's global object via JSI:

```cpp
// C++ registers a global function
runtime.global().setProperty(
  runtime,
  "__skiaGetSurface",
  jsi::Function::createFromHostFunction(
    runtime,
    jsi::PropNameID::forAscii(runtime, "__skiaGetSurface"),
    0,
    [](jsi::Runtime& rt, const jsi::Value&,
       const jsi::Value*, size_t) -> jsi::Value {
      return createSurfaceProxy(rt);
    }
  )
);
```

TypeScript then calls these functions directly:

```typescript
const surface = __skiaGetSurface();
const canvas = surface.getCanvas();
canvas.drawRect(0, 0, 100, 50, "#2196F3");
surface.flush();
```

No bridge, no serialization, no async — just a direct C++ function call.

## Global Functions

All native functions are prefixed with `__` and registered on `globalThis`:

- **Skia**: `__skiaGetSurface`, `__skiaFlushSurface`, `__skiaLoadImage`, `__skiaLoadImageFromURL`
- **Text**: `__skiaMeasureText`, `__skiaRegisterFont`
- **Frame**: `__skiaRequestFrame`, `__skiaCancelFrame`
- **Touch**: `__registerTouchHandler`
- **Platform**: `__getScreenWidth`, `__getScreenHeight`, `__getPixelRatio`, `__getSafeAreaInsets`
- **Timers**: `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`

See [Skia JSI API](/docs/native/skia-jsi) for the complete reference.
