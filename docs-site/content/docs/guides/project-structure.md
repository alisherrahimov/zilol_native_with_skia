---
title: Project Structure
description: Monorepo organization plus build order and package dependencies.
order: 2
---

## Monorepo Layout

```
zilol-native/
├── packages/
│   ├── runtime/         # Reactive runtime (signals, effects, etc.)
│   ├── nodes/           # SkiaNode tree (lightweight GPU-ready nodes)
│   ├── layout/          # Yoga layout bridge
│   ├── renderer/        # Skia render pipeline
│   ├── gestures/        # Event system + gesture recognizers
│   ├── animation/       # Spring, timing, decay animations
│   ├── platform/        # Native view islands (TextInput, etc.)
│   ├── accessibility/   # Shadow accessibility tree
│   ├── image/           # Image loading + caching
│   ├── components/      # Built-in UI components
│   ├── navigation/      # Stack + tab navigation
│   ├── devtools/        # Performance overlay + inspectors
│   └── cpp/             # Shared C++ core
│       ├── skia/        # Skia canvas, surface, image host objects
│       ├── yoga/        # Yoga layout bridge
│       ├── runtime/     # Hermes integration
│       └── platform/    # Platform info (screen, safe area)
├── example/             # Demo app
├── benchmarks/          # Performance benchmarks
└── docs/                # Documentation source
```

## Build Phases

### Phase 1 — Foundation (Pure TypeScript)

```
packages/runtime/        ← Start here. Zero dependencies.
```

Reactive primitives: `signal()`, `computed()`, `effect()`, `batch()`, `untrack()`, `scope()`, plus control flow (`Show`, `For`, `Switch`, `Portal`) and lifecycle (`onMount`, `onCleanup`, `onLayout`).

### Phase 2 — Node Tree (Pure TypeScript)

```
packages/nodes/          ← Depends on: runtime
```

`SkiaNode` base class, dirty tracking, node pool, and element types (View, Text, Image, Scroll, Canvas, Marker, Platform).

### Phase 3 — First Pixels (Needs Skia + Yoga)

```
packages/layout/         ← Depends on: nodes, yoga-layout
packages/renderer/       ← Depends on: nodes, layout, skia
```

Yoga layout bridge, text measurement, render loop, damage rects, display lists, and draw functions.

### Phase 4 — Interaction

```
packages/gestures/       ← Depends on: nodes, runtime
packages/animation/      ← Depends on: runtime
```

Hit testing, gesture recognizers (tap, pan, pinch, long press), gesture arena, scroll physics, spring/timing/decay animations.

### Phase 5 — Production Ready

```
packages/platform/       ← Native view islands
packages/components/     ← Built-in components
packages/navigation/     ← Screen management
```

### Phase 6 — Polish

```
packages/devtools/       ← Performance overlay, node inspector
packages/accessibility/  ← Shadow a11y tree
benchmarks/
```

## Package Dependencies

```
runtime          → (none)
nodes            → runtime
layout           → nodes, yoga-layout
renderer         → nodes, layout, @shopify/react-native-skia
gestures         → nodes, runtime
animation        → runtime
platform         → nodes (+ native kotlin/swift)
accessibility    → nodes (+ native kotlin/swift)
image            → nodes, renderer
components       → runtime, nodes, renderer, gestures, animation
navigation       → runtime, nodes, renderer, animation
```
