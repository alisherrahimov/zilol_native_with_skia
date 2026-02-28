---
title: Pressable
description: Touchable wrapper with press, long press, and reactive press-state styling.
order: 10
---

## Overview

`Pressable` wraps child components to handle touch interactions. It provides chainable `.onPress()`, `.onPressIn()`, `.onPressOut()`, and `.onLongPress()` callbacks with C++ hit testing. Press state is exposed for reactive styling.

## Usage

```typescript
import { Pressable, Text } from "@zilol-native/components";

Pressable(Text("Tap me").fontSize(18).color("#FFFFFF"))
  .onPress(() => console.log("Tapped!"))
  .backgroundColor("#3B82F6")
  .borderRadius(12)
  .padding(16)
  .alignItems("center");
```

## Press Events

```typescript
Pressable(Text("Button").color("#FFF"))
  .onPress(() => {
    // Fired on release (short tap < 500ms)
  })
  .onPressIn(() => {
    // Fired when finger goes down
  })
  .onPressOut(() => {
    // Fired when finger lifts or moves out of bounds
  })
  .onLongPress(() => {
    // Fired on release after holding ≥ 500ms
  });
```

> **Note:** If a touch is held ≥ 500ms, `onLongPress` fires instead of `onPress` on release.

## Reactive Press-State Styling

Any visual prop can receive a `PressVal<T>` — a function `(pressed: boolean) => T` — to style based on press state:

```typescript
Pressable(Text("Submit").fontSize(16).bold().color("#FFF"))
  .onPress(() => submitForm())
  .backgroundColor((pressed) => (pressed ? "#1D4ED8" : "#3B82F6"))
  .opacity((pressed) => (pressed ? 0.8 : 1))
  .borderRadius(12)
  .padding(16)
  .alignItems("center");
```

## Counter Example

```typescript
import { Pressable, View, Text } from "@zilol-native/components";
import { signal } from "@zilol-native/runtime";

const counter = signal(0);

View(
  Text(() => `${counter.value}`)
    .fontSize(48)
    .bold()
    .color("#F8FAFC"),

  View(
    Pressable(Text("−").fontSize(28).bold().color("#FFF"))
      .onPress(() => {
        counter.value = Math.max(0, counter.value - 1);
      })
      .backgroundColor((p) => (p ? "#991B1B" : "#EF4444"))
      .borderRadius(14)
      .size(60, 60)
      .alignItems("center")
      .justifyContent("center"),

    Pressable(Text("+").fontSize(28).bold().color("#FFF"))
      .onPress(() => {
        counter.value = counter.value + 1;
      })
      .backgroundColor((p) => (p ? "#4338CA" : "#6366F1"))
      .borderRadius(14)
      .flex(1)
      .height(60)
      .alignItems("center")
      .justifyContent("center"),
  )
    .row()
    .gap(12),
);
```

## Full API

### Events

| Method             | Signature    | Description                      |
| ------------------ | ------------ | -------------------------------- |
| `.onPress(fn)`     | `() => void` | Short tap completed (< 500ms)    |
| `.onPressIn(fn)`   | `() => void` | Finger down on this element      |
| `.onPressOut(fn)`  | `() => void` | Finger up or moved out of bounds |
| `.onLongPress(fn)` | `() => void` | Released after holding ≥ 500ms   |

### Press-State Styling

| Method                | Type                            | Description      |
| --------------------- | ------------------------------- | ---------------- |
| `.backgroundColor(v)` | `string \| (pressed) => string` | Background color |
| `.opacity(v)`         | `number \| (pressed) => number` | Opacity          |
| `.borderColor(v)`     | `string \| (pressed) => string` | Border color     |
| `.borderWidth(v)`     | `number \| (pressed) => number` | Border width     |

### Layout (inherited from ComponentBase)

All standard layout modifiers: `.flex()`, `.width()`, `.height()`,
`.padding()`, `.margin()`, `.gap()`, `.alignItems()`, `.justifyContent()`, etc.

## Architecture

Touch events flow through C++ for performance:

```
Native touch → ZilolRuntime.onTouch()
  → TouchDispatcher.dispatchTouch()
    → hitTest() (C++ node tree traversal)
    → handleTouchBegan/Moved/Ended (state machine)
      → fire onPressIn/onPressOut/onPress/onLongPress (JSI → JS)
```
