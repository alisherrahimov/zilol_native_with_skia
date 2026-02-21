---
title: Pressable
description: Touchable wrapper with press, long press, and disabled states.
order: 10
---

## Overview

`Pressable` wraps a child element to handle touch interactions. It provides press, long press, and press-in/out callbacks with hit testing from Skia.

## Usage

```typescript
import { Pressable, Text } from "@zilol-native/components";

Pressable(() => console.log("Tapped!")).child(
  Text("Tap me").fontSize(18).color("#FFFFFF"),
);
```

## Builder API

```typescript
Pressable(() => handlePress())
  .onPressIn(() => animateDown())
  .onPressOut(() => animateUp())
  .onLongPress(() => showMenu())
  .disabled(() => isLoading.value)
  .hitSlop(10)
  .child(
    View()
      .padding(16)
      .backgroundColor("#2196F3")
      .borderRadius(8)
      .children([Text("Button")]),
  );
```

## Hit Testing

Pressable uses Skia-based hit testing. The touch point is tested against the SkiaNode's computed bounds (including border radius). Hit slop expands the touchable area without changing the visual size.

## Animated Press States

Combine with signals and spring animations for interactive press feedback:

```typescript
function AnimatedButton() {
  const scale = signal(1);

  return Pressable(() => doAction())
    .onPressIn(() => withSpring(scale, 0.95))
    .onPressOut(() => withSpring(scale, 1))
    .child(
      View()
        .transform(() => [{ scale: scale.value }])
        .padding(16)
        .backgroundColor("#2196F3")
        .children([Text("Press me")]),
    );
}
```
