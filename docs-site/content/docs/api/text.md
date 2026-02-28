---
title: Text
description: Text rendering via Skia Paragraph API with full typography, reactive content, and decorations.
order: 8
---

## Overview

`Text` renders text using Skia's Paragraph API. Content is passed directly to the factory — either as a static string or a reactive accessor. Text nodes are **leaf nodes** and do not accept children.

## Usage

```typescript
import { Text } from "@zilol-native/components";

// Static text
Text("Hello World").fontSize(24).bold().color("#FFFFFF");

// Reactive text
import { signal } from "@zilol-native/runtime";

const count = signal(0);
Text(() => `Count: ${count.value}`)
  .fontSize(18)
  .color("#E2E8F0");
```

## Typography

```typescript
Text("Styled Text")
  .fontSize(16)
  .fontWeight("600")
  .fontFamily("Inter")
  .color("#FFFFFF")
  .lineHeight(1.5)
  .letterSpacing(0.5)
  .textAlign("center");
```

## Text Overflow

```typescript
// Manual
Text("Long text that might overflow...").maxLines(2).textOverflow("ellipsis");

// Shorthand
Text("Long text that might overflow...").ellipsis(2); // maxLines(2) + textOverflow("ellipsis")
```

## Decorations

```typescript
Text("Underlined").underline();
Text("Strikethrough").strikethrough();
Text("Custom").textDecoration("line-through");
```

## Text Background

```typescript
Text("Highlighted").backgroundColor("#6366F1").borderRadius(4).color("#FFF");
```

## Full API

### Content

| Method     | Type                     | Description                |
| ---------- | ------------------------ | -------------------------- |
| `Text(v)`  | `string \| () => string` | Factory — set initial text |
| `.text(v)` | `string \| () => string` | Update text content        |

### Font

| Method           | Type         | Description              |
| ---------------- | ------------ | ------------------------ |
| `.fontSize(v)`   | `number`     | Font size in points      |
| `.fontFamily(v)` | `string`     | Font family name         |
| `.fontWeight(v)` | `FontWeight` | Weight (100–900 or name) |
| `.bold()`        | —            | Shorthand for bold       |
| `.color(v)`      | `string`     | Text fill color          |

### Text Layout

| Method              | Type                                         | Description            |
| ------------------- | -------------------------------------------- | ---------------------- |
| `.textAlign(v)`     | `'left' \| 'center' \| 'right' \| 'justify'` | Horizontal alignment   |
| `.lineHeight(v)`    | `number`                                     | Line height multiplier |
| `.letterSpacing(v)` | `number`                                     | Letter spacing in px   |
| `.maxLines(v)`      | `number`                                     | Maximum visible lines  |
| `.textOverflow(v)`  | `'clip' \| 'ellipsis'`                       | Overflow behavior      |
| `.ellipsis(n)`      | `number`                                     | maxLines + ellipsis    |

### Decoration

| Method               | Type                                                    | Description |
| -------------------- | ------------------------------------------------------- | ----------- |
| `.textDecoration(v)` | `'underline' \| 'line-through' \| 'overline' \| 'none'` | Decoration  |
| `.underline()`       | —                                                       | Shorthand   |
| `.strikethrough()`   | —                                                       | Shorthand   |

### Visual

| Method                | Type               | Description              |
| --------------------- | ------------------ | ------------------------ |
| `.backgroundColor(v)` | `string`           | Text background color    |
| `.borderRadius(v)`    | `number \| object` | Background corner radius |

### Font Weights

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

### Layout (inherited from ComponentBase)

All standard modifiers: `.width()`, `.height()`, `.padding()`, `.margin()`, `.flex()`, etc.

## How It Works

Text nodes integrate with Yoga layout. The Skia Paragraph API measures text dimensions and feeds them back to Yoga's measure function, ensuring correct layout with `alignItems: "center"` and other flexbox properties.
