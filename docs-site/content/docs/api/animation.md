---
title: Animation
order: 12
---

# Animation

Signal-driven animations running at 60fps. Animate any `Signal<number>` — no special types needed.

## Quick Start

```typescript
import { signal } from "@zilol-native/runtime";
import {
  animate,
  withTiming,
  withSpring,
  Easing,
} from "@zilol-native/animation";

const opacity = signal(0);
animate(opacity, withTiming(1, { duration: 300, easing: Easing.easeOut }));

View().opacity(() => opacity.value); // auto-updates as animation runs
```

## Drivers

### `withTiming` — Duration + Easing

```typescript
animate(
  opacity,
  withTiming(1, {
    duration: 300, // ms (default: 300)
    easing: Easing.easeOut, // easing function (default: easeInOut)
  }),
);
```

### `withSpring` — Physics Spring

```typescript
animate(
  scale,
  withSpring(1, {
    damping: 15, // friction — less bouncy (default: 15)
    stiffness: 120, // tension — faster (default: 120)
    mass: 1, // heavier = slower (default: 1)
    velocity: 0, // initial velocity (default: 0)
  }),
);
```

### `withDecay` — Momentum

```typescript
animate(
  scrollX,
  withDecay({
    velocity: gestureVelocity, // initial velocity
    deceleration: 0.998, // friction rate (default: 0.998)
  }),
);
```

## Easing Curves

```typescript
import { Easing } from "@zilol-native/animation";

Easing.linear; // constant velocity
Easing.easeIn; // accelerate
Easing.easeOut; // decelerate
Easing.easeInOut; // accelerate then decelerate
Easing.easeInCubic; // cubic ease in
Easing.easeOutCubic; // cubic ease out
Easing.easeInOutCubic; // cubic ease in-out
Easing.bezier(x1, y1, x2, y2); // CSS cubic-bezier
Easing.back(1.7); // overshoot then settle
Easing.elastic(1); // spring-like bounce
Easing.bounce; // bouncing ball
```

## Composing Animations

### Sequence — One After Another

```typescript
await sequence([
  () => animate(opacity, withTiming(1, { duration: 200 })),
  () => delay(100),
  () => animate(y, withSpring(0)),
]);
```

### Parallel — All At Once

```typescript
await parallel([
  () => animate(opacity, withTiming(1)),
  () => animate(y, withSpring(0)),
]);
```

### Loop — Repeat

```typescript
loop(() => animate(rotation, withTiming(360, { duration: 1000 })), 3); // 3 times
loop(() => animate(pulse, withSpring(1.2))); // infinite
```

## Cancellation

```typescript
const { cancel, finished } = animate(opacity, withTiming(1));

cancel(); // stops mid-animation

const completed = await finished; // false if cancelled, true if completed
```

## Auto-Cancel

Starting a new animation on the same signal automatically cancels the previous one:

```typescript
animate(opacity, withTiming(1)); // starts
animate(opacity, withTiming(0)); // cancels previous, starts new
```

## Full Example — Staggered Launch

```typescript
const headerOpacity = signal(0);
const headerY = signal(-30);
const contentOpacity = signal(0);
const contentY = signal(40);

async function launchAnimation() {
  // Header slides in
  await parallel([
    () => animate(headerOpacity, withTiming(1, { duration: 400 })),
    () => animate(headerY, withSpring(0, { damping: 18, stiffness: 150 })),
  ]);

  // Content follows
  await parallel([
    () => animate(contentOpacity, withTiming(1, { duration: 350 })),
    () => animate(contentY, withSpring(0, { damping: 14, stiffness: 100 })),
  ]);
}

launchAnimation();
```
