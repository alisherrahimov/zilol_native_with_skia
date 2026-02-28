---
title: ScrollView
description: Scrollable container with C++ physics — rubber-band overscroll, deceleration, snap, and paging.
order: 10
---

## Overview

`ScrollView` is a scrollable container backed by a **C++ ScrollEngine** that provides iOS-style scroll physics — rubber-band overscroll, velocity-based fling, snap-to-interval, and paging. Touch events and physics run in C++ for 60fps performance.

## Basic Usage

```typescript
import { ScrollView, View, Text } from "@zilol-native/components";

// Vertical scroll (default)
ScrollView(
  ...items.map((item) =>
    View(Text(item.title).color("#FFF"))
      .padding(16)
      .backgroundColor("#1E293B")
      .borderRadius(8),
  ),
)
  .flex(1)
  .padding(16)
  .gap(8)
  .backgroundColor("#0A1628");
```

## Horizontal Carousel

```typescript
ScrollView(...cards)
  .horizontal()
  .showsScrollIndicator(false)
  .decelerationRate("fast")
  .snapToInterval(320);
```

## Paging

Snaps to viewport-sized pages — useful for onboarding or galleries.

```typescript
ScrollView(...pages)
  .horizontal()
  .pagingEnabled()
  .bounces(false);
```

## Scroll Events

```typescript
import { signal } from "@zilol-native/runtime";

const offset = signal({ x: 0, y: 0 });

ScrollView(...children)
  .flex(1)
  .onScroll((pos) => {
    offset.value = pos; // fires on every frame
  })
  .onScrollEnd((pos) => {
    console.log("Settled at", pos); // fires when momentum stops
  })
  .onScrollBeginDrag(() => {
    console.log("Started dragging");
  })
  .onScrollEndDrag(() => {
    console.log("Stopped dragging");
  });
```

## Programmatic Scrolling

```typescript
const sv = ScrollView(...children).flex(1);

// Animated spring to offset
sv.scrollTo(0, 500);

// Instant jump
sv.scrollTo(0, 500, false);
```

## Scroll Physics

ScrollView uses iOS-style scroll physics implemented in the **C++ ScrollEngine**:

| Phase        | Behavior                                           |
| ------------ | -------------------------------------------------- |
| **Dragging** | 1:1 touch tracking; rubber-band when past boundary |
| **Fling**    | Exponential velocity decay (`v × rate^dt`)         |
| **Bounce**   | Critically-damped spring to boundary               |
| **Snap**     | Spring to nearest snap interval or page            |

### Deceleration Rates

| Value       | Constant | Use case                 |
| ----------- | -------- | ------------------------ |
| `'normal'`  | `0.998`  | Standard lists (default) |
| `'fast'`    | `0.99`   | Pickers, carousels       |
| `0.0 – 1.0` | Custom   | Fine-tuned behavior      |

## Full API

### Scroll Behavior

| Method                    | Type                           | Default    | Description                |
| ------------------------- | ------------------------------ | ---------- | -------------------------- |
| `.horizontal()`           | `boolean`                      | `false`    | Scroll on X axis           |
| `.bounces()`              | `boolean`                      | `true`     | iOS rubber-band overscroll |
| `.scrollEnabled()`        | `boolean`                      | `true`     | Enable/disable scroll      |
| `.showsScrollIndicator()` | `boolean`                      | `true`     | Show scroll bar            |
| `.pagingEnabled()`        | `boolean`                      | `false`    | Snap to viewport pages     |
| `.snapToInterval(px)`     | `number`                       | —          | Snap at multiples of `px`  |
| `.decelerationRate(r)`    | `'normal' \| 'fast' \| number` | `'normal'` | Fling friction             |
| `.scrollX(px)`            | `number`                       | `0`        | Set X offset               |
| `.scrollY(px)`            | `number`                       | `0`        | Set Y offset               |

### Events

| Method                   | Signature                  | Description         |
| ------------------------ | -------------------------- | ------------------- |
| `.onScroll(fn)`          | `(offset: {x, y}) => void` | Every offset change |
| `.onScrollEnd(fn)`       | `(offset: {x, y}) => void` | Momentum settled    |
| `.onScrollBeginDrag(fn)` | `() => void`               | User started drag   |
| `.onScrollEndDrag(fn)`   | `() => void`               | User lifted finger  |

### Programmatic

| Method                       | Description            |
| ---------------------------- | ---------------------- |
| `.scrollTo(x, y, animated?)` | Animate/jump to offset |

### Visual

| Method                | Type                     | Description                     |
| --------------------- | ------------------------ | ------------------------------- |
| `.backgroundColor(c)` | `string`                 | Container background            |
| `.borderRadius(r)`    | `number \| BorderRadius` | Corner rounding                 |
| `.border(w, c)`       | `number, string`         | Border width + color            |
| `.shadow(s)`          | `ShadowProps`            | Drop shadow                     |
| `.clip()`             | `boolean`                | Clip children (default: `true`) |

### Layout (inherited from ComponentBase)

All standard layout modifiers: `.flex()`, `.width()`, `.height()`,
`.padding()`, `.margin()`, `.gap()`, `.alignItems()`, `.justifyContent()`, etc.

## Architecture

```
┌───────────────────────────────────┐
│   ScrollViewBuilder (component)   │ ← chainable API
├───────────────────────────────────┤
│   Touch wiring (onTouchStart →)   │ ← forwards to C++ ScrollEngine
├───────────────────────────────────┤
│   C++ ScrollEngine (physics)      │ ← velocity tracking, spring, fling
│   ScrollEngine.h                  │ ← rubber-band, snap, deceleration
├───────────────────────────────────┤
│   SkiaNode type="scroll"          │ ← scrollX/scrollY props
├───────────────────────────────────┤
│   drawScroll (renderer)           │ ← save → clip → translate → cull → draw → restore
│   Yoga overflow:scroll (layout)   │ ← content sizing
└───────────────────────────────────┘
```

## Viewport Culling

The renderer uses **viewport culling** for performance — only children whose layout positions overlap the visible scroll window emit draw commands:

```
save()
clipRRect(viewport)             // GPU clip to scroll bounds
translate(-scrollX, -scrollY)   // shift children by offset
  for each child:
    if child outside viewport → skip   // JS-side viewport cull
    drawNode(child)                    // draw only visible children
restore()
```

| 100 items (no culling) | 100 items (viewport culling) |
| ---------------------- | ---------------------------- |
| ~33 FPS                | **60 FPS**                   |
| 100 draw calls/frame   | ~8-10 draw calls/frame       |
