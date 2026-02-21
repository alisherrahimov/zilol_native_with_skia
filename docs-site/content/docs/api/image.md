---
title: Image
description: Display images from file paths or URLs with async loading and resize modes.
order: 9
---

## Overview

`Image` loads and renders bitmap images via Skia. Supports both synchronous file loading and async URL loading with automatic caching.

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
  .backgroundColor("#1a4a7a") // placeholder while loading
  .tintColor("#2196F3");
```

## Resize Modes

| Mode      | Description                             |
| --------- | --------------------------------------- |
| `cover`   | Scale to fill, crop if needed (default) |
| `contain` | Scale to fit, may show background       |
| `stretch` | Stretch to fill exactly                 |
| `center`  | Center at original size                 |

## How It Works

Under the hood, `Image` uses two native JSI functions:

- **`__skiaLoadImage(path)`** — Synchronous loading for bundled assets
- **`__skiaLoadImageFromURL(url, callback)`** — Async loading from network

When the image loads, it's set as a prop on the SkiaNode, which triggers a dirty mark and redraw on the next frame.
