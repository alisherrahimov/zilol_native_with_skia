---
title: Introduction
description: Get started with Zilol Native — a next-generation rendering framework that replaces the VDOM with fine-grained reactivity and Skia GPU rendering.
order: 1
---

## What is Zilol Native?

Zilol Native is a next-generation rendering framework that replaces both the VDOM reconciler and the native view tree with two fundamentally better primitives: **fine-grained reactivity (signals)** for state propagation and **Skia** for rendering.

The result is a system where a single value change propagates directly to a single draw command on a GPU canvas — no diffing, no native view creation, no bridge overhead.

```
Signal Change → Direct SkiaNode Mutation → Damage Rect → Skia GPU Redraw
```

## Why Zilol Native?

| Feature     | React Native             | Zilol Native                |
| ----------- | ------------------------ | --------------------------- |
| Rendering   | Native views via bridge  | Skia GPU canvas             |
| State → UI  | VDOM diff → patch        | Signal → direct draw        |
| Update cost | O(tree) reconciliation   | O(1) signal propagation     |
| Node weight | ~1-2KB per native view   | ~100-200 bytes per SkiaNode |
| Bridge      | Async JSON serialization | Synchronous C++ JSI         |
| Animation   | JS → bridge → native     | Signal → GPU (same frame)   |

## Core Principles

- **Components run once.** No re-rendering. Reactive bindings handle all updates.
- **Signals, not state.** Fine-grained dependency tracking replaces top-down re-rendering.
- **GPU-first.** Every pixel is drawn by Skia on Metal (iOS) or Vulkan (Android).
- **Zero overhead.** No VDOM allocations, no bridge serialization, no native view creation.

## Quick Example

```typescript
import { signal, computed } from "@zilol-native/runtime";
import { View, Text, Pressable } from "@zilol-native/components";

function Counter() {
  const count = signal(0);
  const color = computed(() => (count.value > 10 ? "#FF6B6B" : "#2196F3"));

  return View()
    .padding(16)
    .backgroundColor(color)
    .children([
      Text(() => `Count: ${count.value}`)
        .fontSize(24)
        .color("#FFFFFF"),
      Pressable(() => count.value++).child(Text("Increment").fontSize(18)),
    ]);
}
```

This component runs **once**. When `count.value` changes:

1. The `computed` for `color` recalculates (if read)
2. The Text node's text prop updates via its reactive binding
3. Only the affected SkiaNodes are marked dirty
4. On the next vsync, only the damaged rectangle is redrawn

## What's Next?

- Read the [Architecture](/docs/architecture) to understand the full system
- Learn about [Signals](/docs/api/signals) — the foundation of reactivity
- Explore the [Component API](/docs/api/view) for building UIs
