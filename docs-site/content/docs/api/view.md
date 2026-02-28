---
title: View
description: Container element with background, border, shadow, gradient, and flexbox layout.
order: 7
---

## Overview

`View` is the fundamental container element in Zilol Native. It renders as a Skia rounded rectangle with optional background, border, shadow, gradient, and child clipping. Children are passed directly to the factory function.

## Usage

```typescript
import { View, Text } from "@zilol-native/components";

View(Text("Hello World").fontSize(18).color("#FFF"))
  .padding(16)
  .backgroundColor("#1E293B")
  .borderRadius(12);
```

## Builder API

Every method returns `this` for chaining:

```typescript
View(
  Text("Card Title").fontSize(20).bold().color("#FFF"),
  Text("Subtitle").fontSize(14).color("#94A3B8"),
)
  .width(300)
  .height(200)
  .padding(20)
  .margin(8)
  .backgroundColor("#0F172A")
  .borderRadius(16)
  .border(1, "rgba(99,102,241,0.3)")
  .shadow({
    color: "rgba(0,0,0,0.3)",
    offsetX: 0,
    offsetY: 4,
    blurRadius: 12,
    spreadRadius: 0,
  })
  .opacity(0.95);
```

## Reactive Props

Any prop can be reactive by passing a function:

```typescript
import { signal } from "@zilol-native/runtime";

const theme = signal("dark");

View()
  .backgroundColor(() => (theme.value === "dark" ? "#0F172A" : "#FFFFFF"))
  .borderColor(() => (theme.value === "dark" ? "#1a4a7a" : "#E0E0E0"));
```

## Layout

View supports all flexbox layout properties via Yoga:

```typescript
View(Text("Left").color("#FFF"), Text("Right").color("#FFF"))
  .row()
  .alignItems("center")
  .justifyContent("space-between")
  .gap(12)
  .padding(16);
```

## Gradient

```typescript
View()
  .linearGradient(["#6366F1", "#8B5CF6", "#EC4899"], "toBottomRight")
  .size(200, 200)
  .borderRadius(16);
```

Gradient directions: `toBottom`, `toRight`, `toTop`, `toLeft`, `toTopRight`, `toBottomRight`.

## Safe Area

Automatically pad content to avoid the notch, home indicator, and status bar:

```typescript
// All edges
View(...children)
  .flex(1)
  .safeArea()
  .backgroundColor("#0F172A");

// Specific edges
View(...children)
  .safeArea("top") // status bar only
  .safeArea("bottom"); // home indicator only

// Multiple calls chain
View(...children)
  .safeArea("horizontal") // left + right
  .safeArea("vertical"); // top + bottom
```

Edges: `"all"` (default), `"top"`, `"bottom"`, `"left"`, `"right"`, `"horizontal"`, `"vertical"`.

> [!TIP]
> Navigation screens automatically apply `safeArea("top")` and `safeArea("bottom")` via `ScreenContainer`.

## Touch Events

```typescript
View(Text("Tap me").color("#FFF"))
  .onPress(() => console.log("Tapped"))
  .onPressIn(() => console.log("Finger down"))
  .onPressOut(() => console.log("Finger up"))
  .onLongPress(() => console.log("Long press"))
  .touchable(true);
```

## Full API

### Visual

| Method                 | Type                     | Description              |
| ---------------------- | ------------------------ | ------------------------ |
| `.backgroundColor(v)`  | `string`                 | Background fill color    |
| `.borderRadius(v)`     | `number \| BorderRadius` | Corner rounding          |
| `.borderWidth(v)`      | `number`                 | Border width             |
| `.borderColor(v)`      | `string`                 | Border color             |
| `.border(w, c)`        | `number, string`         | Shorthand: width + color |
| `.shadow(v)`           | `ShadowProps`            | Drop shadow              |
| `.clip()`              | `boolean`                | Clip children to bounds  |
| `.opacity(v)`          | `number`                 | Opacity (0–1)            |
| `.linearGradient(c,d)` | `string[], direction`    | Gradient background      |

### Layout (inherited from ComponentBase)

| Method                   | Type                                 | Description              |
| ------------------------ | ------------------------------------ | ------------------------ |
| `.width(v)`              | `number \| string`                   | Width                    |
| `.height(v)`             | `number \| string`                   | Height                   |
| `.size(w, h)`            | `number, number`                     | Width + height shorthand |
| `.flex(v)`               | `number`                             | Flex grow/shrink         |
| `.flexDirection(v)`      | `'row' \| 'column' \| ...`           | Main axis direction      |
| `.row()`                 | —                                    | Shorthand for row        |
| `.column()`              | —                                    | Shorthand for column     |
| `.justifyContent(v)`     | `'center' \| 'space-between' \| ...` | Main axis alignment      |
| `.alignItems(v)`         | `'center' \| 'stretch' \| ...`       | Cross axis alignment     |
| `.gap(v)`                | `number`                             | Gap between children     |
| `.padding(v)`            | `number`                             | All-side padding         |
| `.paddingHorizontal(v)`  | `number`                             | Left + right padding     |
| `.paddingVertical(v)`    | `number`                             | Top + bottom padding     |
| `.margin(v)`             | `number`                             | All-side margin          |
| `.position(v)`           | `'relative' \| 'absolute'`           | Position mode            |
| `.absolute()`            | —                                    | Shorthand for absolute   |
| `.top(v)` `.left(v)` etc | `number`                             | Position offsets         |
| `.safeArea(edges?)`      | `string`                             | Safe area padding        |

### Transform

| Method           | Type     | Description        |
| ---------------- | -------- | ------------------ |
| `.translateX(v)` | `number` | X translation      |
| `.translateY(v)` | `number` | Y translation      |
| `.scale(v)`      | `number` | Uniform scale      |
| `.rotate(v)`     | `number` | Rotation (degrees) |

See [Styling](/docs/api/styling) for the full list of inherited properties.
