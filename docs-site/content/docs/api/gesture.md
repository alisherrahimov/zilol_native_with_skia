---
title: Gesture Handler
description: Composable gesture recognizers — Pan, Pinch, Rotation, and Tap with C++ recognition engine.
order: 11
---

## Overview

The Gesture Handler provides composable gesture recognizers that run their recognition logic in **C++ for performance** and fire JS callbacks with event data. Gestures attach to any component via `GestureDetector`.

```typescript
import { Gesture, GestureDetector, View } from "@zilol-native/components";
```

## GestureDetector

Wraps a child component and attaches one or more gesture recognizers:

```typescript
GestureDetector(
  child, // any component
  gesture1, // first gesture
  gesture2, // second gesture (simultaneous)
);
```

## Pan Gesture

Tracks single-finger drag with translation and velocity data.

```typescript
import { signal } from "@zilol-native/runtime";
import { animate, withSpring } from "@zilol-native/animation";

const x = signal(0);
const y = signal(0);

GestureDetector(
  View()
    .size(100, 100)
    .backgroundColor("#6366F1")
    .borderRadius(16)
    .translateX(() => x.value)
    .translateY(() => y.value),
  Gesture.Pan()
    .onStart((e) => {
      // Finger down, exceeds activation threshold
    })
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      // Spring back to origin
      animate(x, withSpring(0));
      animate(y, withSpring(0));
    }),
);
```

### Pan Event Data

| Field          | Type     | Description            |
| -------------- | -------- | ---------------------- |
| `translationX` | `number` | Total X drag distance  |
| `translationY` | `number` | Total Y drag distance  |
| `velocityX`    | `number` | X velocity (px/sec)    |
| `velocityY`    | `number` | Y velocity (px/sec)    |
| `x`, `y`       | `number` | Current touch position |

### Pan Configuration

```typescript
Gesture.Pan().activationThreshold(20); // pixels before pan activates (default: 10)
```

## Tap Gesture

Detects single or multi-tap sequences.

```typescript
// Single tap
GestureDetector(
  myButton,
  Gesture.Tap().onEnd(() => {
    console.log("Tapped!");
  }),
);

// Double tap
GestureDetector(
  myButton,
  Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      console.log("Double tapped!");
    }),
);
```

### Tap Configuration

```typescript
Gesture.Tap()
  .numberOfTaps(2) // taps required (default: 1)
  .maxDistance(20); // max movement during tap in px (default: 15)
```

## Pinch Gesture

Tracks two-finger pinch for scale and focal point. Requires 2 simultaneous touches.

```typescript
const scale = signal(1);

GestureDetector(
  View()
    .size(200, 200)
    .backgroundColor("#10B981")
    .scale(() => scale.value),
  Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = e.scale; // scale factor relative to initial
    })
    .onEnd(() => {
      animate(scale, withSpring(1));
    }),
);
```

### Pinch Event Data

| Field    | Type     | Description                    |
| -------- | -------- | ------------------------------ |
| `scale`  | `number` | Scale factor (1 = no change)   |
| `focalX` | `number` | Midpoint X between two touches |
| `focalY` | `number` | Midpoint Y between two touches |

## Rotation Gesture

Tracks two-finger rotation. Requires 2 simultaneous touches.

```typescript
const rotation = signal(0);

GestureDetector(
  View()
    .size(200, 200)
    .backgroundColor("#F59E0B")
    .rotate(() => rotation.value * (180 / Math.PI)),
  Gesture.Rotation()
    .onUpdate((e) => {
      rotation.value = e.rotation; // radians from initial angle
    })
    .onEnd(() => {
      animate(rotation, withSpring(0));
    }),
);
```

### Rotation Event Data

| Field      | Type     | Description                    |
| ---------- | -------- | ------------------------------ |
| `rotation` | `number` | Rotation in radians            |
| `focalX`   | `number` | Midpoint X between two touches |
| `focalY`   | `number` | Midpoint Y between two touches |

## Combining Gestures

Multiple gestures can be attached to the same `GestureDetector` for simultaneous recognition:

```typescript
const x = signal(0);
const y = signal(0);
const scale = signal(1);

GestureDetector(
  View()
    .size(200, 200)
    .backgroundColor("#8B5CF6")
    .translateX(() => x.value)
    .translateY(() => y.value)
    .scale(() => scale.value),
  Gesture.Pan().onUpdate((e) => {
    x.value = e.translationX;
    y.value = e.translationY;
  }),
  Gesture.Pinch().onUpdate((e) => {
    scale.value = e.scale;
  }),
);
```

## Gesture + Animation

Gestures pair naturally with the animation system for physics-based interactions:

```typescript
import { animate, withSpring, withDecay } from "@zilol-native/animation";

Gesture.Pan().onEnd((e) => {
  // Fling with velocity
  animate(x, withDecay({ velocity: e.velocityX }));
  // Or spring back
  animate(y, withSpring(0, { damping: 12, stiffness: 180 }));
});
```

## Gesture State Machine

Each recognizer follows a state machine:

```
Possible → Began → Changed → Ended
                            → Cancelled
                            → Failed
```

| State       | Description                                        |
| ----------- | -------------------------------------------------- |
| `Possible`  | Waiting for enough data to recognize               |
| `Began`     | Gesture recognized — `onStart` fires               |
| `Changed`   | Ongoing updates — `onUpdate` fires                 |
| `Ended`     | Completed successfully — `onEnd` fires             |
| `Cancelled` | Interrupted (e.g. touch cancelled)                 |
| `Failed`    | Did not meet criteria (e.g. moved too far for tap) |

## Architecture

Gesture recognition runs entirely in C++ for minimal overhead:

```
Native touch → ZilolRuntime.onTouch()
  → TouchDispatcher.dispatchTouch()
    → hitTest() → find node with attached gestures
    → route touch to GestureRecognizer subclass
      → PanRecognizer / PinchRecognizer / RotationRecognizer / TapRecognizer
        → state machine transitions
          → fire onStart/onUpdate/onEnd (JSI → JS)
```
