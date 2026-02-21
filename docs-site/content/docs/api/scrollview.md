---
title: ScrollView
description: Scrollable container with platform-specific physics and snapping.
order: 11
---

## Overview

`ScrollView` provides a scrollable container with platform-native physics — iOS rubber banding and Android overscroll glow.

## Usage

```typescript
import { ScrollView, View, Text } from "@zilol-native/components";

ScrollView().children(
  Array.from({ length: 50 }, (_, i) =>
    View()
      .padding(16)
      .margin(8)
      .backgroundColor("#0f2847")
      .borderRadius(8)
      .children([Text(`Item ${i + 1}`)]),
  ),
);
```

## Horizontal Scrolling

```typescript
ScrollView().horizontal(true).showsScrollIndicator(false).children([
  /* horizontal content */
]);
```

## Snapping

```typescript
ScrollView()
  .snapToInterval(300)
  .snapToAlignment("center")
  .decelerationRate("fast")
  .children([
    /* snap items */
  ]);
```

## Scroll Events

```typescript
const scrollOffset = signal({ x: 0, y: 0 });

ScrollView()
  .onScroll((offset) => {
    scrollOffset.value = offset;
  })
  .onScrollEnd((offset) => {
    console.log("Settled at:", offset);
  });
```

## Implementation

ScrollView is implemented as a `scroll` SkiaNode type. It maintains a scroll offset signal and clips its children to the viewport. The scroll physics (deceleration, rubber banding) are platform-specific implementations in the `gestures` package.
