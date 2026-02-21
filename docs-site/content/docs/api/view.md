---
title: View
description: Container element — maps to a rounded rectangle with background, border, shadow, and clipping.
order: 7
---

## Overview

`View` is the fundamental container element in Zilol Native. It maps to a Skia rounded rectangle with optional background, border, shadow, and child clipping.

## Usage

```typescript
import { View } from "@zilol-native/components";

View().padding(16).backgroundColor("#FFFFFF").borderRadius(12).children([
  // child components
]);
```

## Builder API

View uses a **builder pattern** — each method returns `this` for chaining:

```typescript
View()
  .width(200)
  .height(100)
  .padding(16)
  .margin(8)
  .backgroundColor("#0f2847")
  .borderRadius(12)
  .borderWidth(1)
  .borderColor("rgba(33,150,243,0.2)")
  .shadow({
    color: "rgba(0,0,0,0.3)",
    offsetX: 0,
    offsetY: 4,
    blurRadius: 12,
    spreadRadius: 0,
  })
  .opacity(0.95)
  .children([Text("Hello World").fontSize(18)]);
```

## Reactive Props

Any prop can be reactive by passing a function:

```typescript
const theme = signal("dark");

View()
  .backgroundColor(() => (theme.value === "dark" ? "#0a1628" : "#FFFFFF"))
  .borderColor(() => (theme.value === "dark" ? "#1a4a7a" : "#E0E0E0"));
```

## Layout

View supports all flexbox layout properties via Yoga:

```typescript
View()
  .flexDirection("row")
  .alignItems("center")
  .justifyContent("space-between")
  .gap(12)
  .padding(16)
  .children([Text("Left"), Text("Right")]);
```

See [Styling](/docs/api/styling) for the full list of layout and style properties.
