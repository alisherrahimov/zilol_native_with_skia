---
title: Text
description: Text element rendered via Skia Paragraph API with full typography support.
order: 8
---

## Overview

`Text` renders text using Skia's Paragraph API. It supports font styling, alignment, line clamping, and reactive content.

## Usage

```typescript
import { Text } from "@zilol-native/components";

// Static text
Text("Hello World").fontSize(24).color("#FFFFFF").fontWeight("bold");

// Reactive text
const name = signal("Alisher");
Text(() => `Hello, ${name.value}!`)
  .fontSize(18)
  .color("#E0F7FA");
```

## Builder API

```typescript
Text("Content")
  .fontSize(16)
  .fontWeight("600")
  .fontFamily("Inter")
  .color("#FFFFFF")
  .textAlign("center")
  .lineHeight(1.5)
  .letterSpacing(0.5)
  .maxLines(2)
  .ellipsis("...");
```

## Font Weights

```typescript
type FontWeight =
  | "normal"
  | "bold"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";
```

## Text Measurement

Text nodes automatically integrate with Yoga layout. The Skia Paragraph API measures text dimensions and feeds them back to Yoga's measure function, ensuring correct layout even with `alignItems: "center"` and other flexbox properties.
