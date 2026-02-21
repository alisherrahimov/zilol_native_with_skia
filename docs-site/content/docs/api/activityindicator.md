---
title: ActivityIndicator
order: 11
---

# ActivityIndicator

A spinning loading indicator drawn via Skia, animated at 60fps.

## Basic Usage

```typescript
import { ActivityIndicator } from "@zilol-native/components";

// Default white spinner (36px)
ActivityIndicator();

// Custom color and size
ActivityIndicator().color("#3B82F6").indicatorSize("large");
```

## Sizes

```typescript
// Small (20px) — inline loading
ActivityIndicator().indicatorSize("small");

// Large (36px) — default
ActivityIndicator().indicatorSize("large");

// Custom pixel size
ActivityIndicator().indicatorSize(48);
```

## Start / Stop

```typescript
import { signal } from "@zilol-native/runtime";

const loading = signal(true);

ActivityIndicator().animating(loading.value).hidesWhenStopped(true); // hides when not spinning (default)
```

## Full API

### Appearance

| Method              | Type                           | Default     | Description          |
| ------------------- | ------------------------------ | ----------- | -------------------- |
| `.color(c)`         | `string`                       | `"#FFFFFF"` | Spinner stroke color |
| `.indicatorSize(s)` | `"small" \| "large" \| number` | `36`        | Diameter in px       |

### Behavior

| Method                 | Type      | Default | Description                      |
| ---------------------- | --------- | ------- | -------------------------------- |
| `.animating(v)`        | `boolean` | `true`  | Start/stop the spinning          |
| `.hidesWhenStopped(v)` | `boolean` | `true`  | Hide indicator when not spinning |

### Layout (inherited from ComponentBase)

All standard layout modifiers: `.flex()`, `.width()`, `.height()`,
`.padding()`, `.margin()`, `.alignItems()`, etc.

## Architecture

```
┌──────────────────────────────────────┐
│   ActivityIndicatorBuilder           │ ← chainable API
├──────────────────────────────────────┤
│   __skiaRequestFrame animation loop  │ ← 360°/sec rotation
├──────────────────────────────────────┤
│   SkiaNode type="activityIndicator"  │ ← _rotationAngle prop
├──────────────────────────────────────┤
│   drawActivityIndicator (renderer)   │ ← save → rotate → drawArc → restore
│   SkCanvas::drawArc (C++ native)     │ ← stroked arc, round cap
└──────────────────────────────────────┘
```

## Rendering Details

Each frame, the animation loop increments `_rotationAngle` by `360 × dt`
degrees. The draw function emits:

```
save()
rotate(angle, cx, cy)      // pivot around center
drawArc(cx, cy, r, 0°, 270°, color, strokeWidth)
restore()
```

The arc uses a **round stroke cap** for smooth endpoints, matching iOS's
native `UIActivityIndicatorView` appearance.
