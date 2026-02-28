---
title: Image
description: Display images from file paths or URLs with async loading, resize modes, and tint.
order: 9
---

## Overview

`Image` loads and renders bitmap images via Skia. Supports both synchronous file loading (bundled assets) and async URL loading with automatic re-render on load.

## Usage

```typescript
import { Image } from "@zilol-native/components";

// Load from URL (async)
Image("https://picsum.photos/200/200").size(200, 200).borderRadius(16);

// Load from bundle path (sync)
Image("/path/to/logo.png").size(100, 100);
```

## Builder API

```typescript
Image("https://example.com/photo.jpg")
  .size(300, 200)
  .resizeMode("cover")
  .borderRadius(12)
  .backgroundColor("#1E293B") // placeholder while loading
  .tintColor("#3B82F6");
```

## Resize Modes

| Mode      | Description                             |
| --------- | --------------------------------------- |
| `cover`   | Scale to fill, crop if needed (default) |
| `contain` | Scale to fit, may show background       |
| `stretch` | Stretch to fill exactly                 |
| `center`  | Center at original size                 |

## Avatar Example

```typescript
import { View, Image, Text } from "@zilol-native/components";

View(
  Image("https://i.pravatar.cc/100").size(48, 48).borderRadius(24), // perfect circle
  Text("John Doe").fontSize(16).bold().color("#FFF"),
)
  .row()
  .gap(12)
  .alignItems("center");
```

## Gallery Example

```typescript
View(
  Image("https://picsum.photos/300/200?1")
    .size(140, 100)
    .borderRadius(8)
    .resizeMode("cover"),
  Image("https://picsum.photos/300/200?2")
    .size(140, 100)
    .borderRadius(8)
    .resizeMode("cover"),
)
  .row()
  .gap(8);
```

## Full API

### Image-Specific

| Method                | Type                                            | Description                    |
| --------------------- | ----------------------------------------------- | ------------------------------ |
| `Image(src)`          | `string`                                        | Factory — file path or URL     |
| `.resizeMode(v)`      | `'cover' \| 'contain' \| 'stretch' \| 'center'` | How image fits bounds          |
| `.tintColor(v)`       | `string`                                        | Color overlay tint             |
| `.backgroundColor(v)` | `string`                                        | Placeholder / background color |
| `.borderRadius(v)`    | `number`                                        | Corner rounding                |

### Layout (inherited from ComponentBase)

All standard modifiers: `.width()`, `.height()`, `.size()`, `.padding()`, `.margin()`, `.flex()`, `.opacity()`, `.scale()`, `.rotate()`, etc.

## How It Works

Under the hood, `Image` uses two native JSI functions:

- **`__skiaLoadImage(path)`** — Synchronous loading for bundled assets
- **`__skiaLoadImageFromURL(url, callback)`** — Async loading from network

When the image loads, it's set as a `source` prop on the SkiaNode, which triggers a dirty mark and re-render on the next frame. URL detection is automatic — paths starting with `http://` or `https://` use async loading.
