---
title: Animations
description: Signal-based animations with spring physics, timing, and gesture-driven motion.
order: 13
---

## Signal-Based Animations

Animations in Zilol Native are just signals that change over time on the UI thread:

```typescript
import { withSpring, withTiming } from "@zilol-native/animation";
import { signal } from "@zilol-native/runtime";

const scale = signal(1);
const translateY = signal(0);

// Spring animation
withSpring(scale, 0.95);

// Timing animation with easing
withTiming(translateY, -100, {
  duration: 300,
  easing: "easeInOut",
});
```

## Spring Animation

```typescript
function withSpring(target: number, config?: SpringConfig): Signal<number>;

interface SpringConfig {
  damping?: number; // default: 10
  stiffness?: number; // default: 100
  mass?: number; // default: 1
  velocity?: number; // initial velocity
  overshootClamping?: boolean;
}
```

## Timing Animation

```typescript
function withTiming(target: number, config?: TimingConfig): Signal<number>;

interface TimingConfig {
  duration?: number; // ms, default: 300
  easing?: EasingType;
}

type EasingType = "linear" | "easeIn" | "easeOut" | "easeInOut" | "spring";
```

## Gesture-Driven Animations

Combine gestures with signals for interactive animations:

```typescript
function SwipeableCard() {
  const translateX = signal(0);
  const opacity = computed(() => 1 - Math.abs(translateX.value) / 300);

  return GestureDetector({
    gesture: PanGesture({
      onUpdate: (e) => {
        translateX.value = e.translationX;
      },
      onEnd: (e) => {
        if (Math.abs(e.translationX) > 150) {
          withSpring(translateX, Math.sign(e.translationX) * 500);
        } else {
          withSpring(translateX, 0);
        }
      },
    }),
    child: View()
      .transform(() => [{ translateX: translateX.value }])
      .opacity(opacity)
      .children([
        /* card content */
      ]),
  });
}
```

## Why This Works Well

Because animations are just signal updates, they flow through the same reactive pipeline as any other state change. No special animation layer needed — the signal write directly marks SkiaNodes dirty and triggers a Skia redraw on the next vsync.
