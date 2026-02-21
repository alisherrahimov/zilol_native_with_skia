---
title: Architecture
description: Full architecture overview — from reactive runtime to GPU rendering pipeline.
order: 2
---

## System Overview

Zilol Native is organized in six layers, from developer API down to GPU:

```
┌──────────────────────────────────────────────────┐
│              Developer API Layer                  │
│    Component functions, TypeScript, signals        │
├──────────────────────────────────────────────────┤
│              Reactive Runtime                     │
│    signal() / computed() / effect() / batch()     │
├──────────────────────────────────────────────────┤
│              SkiaNode Tree                        │
│    Lightweight JS objects (~100-200 bytes each)   │
│    Dirty tracking + damage rect accumulation      │
├──────────────────────────────────────────────────┤
│              Layout Engine                        │
│    Yoga (C++ via JSI) — incremental layout        │
├──────────────────────────────────────────────────┤
│           Render Pipeline (UI Thread)             │
│    Display list generation + Skia draw commands   │
├──────────────────────────────────────────────────┤
│             Skia GPU Backend                      │
│    Metal (iOS) / Vulkan+OpenGL (Android)          │
└──────────────────────────────────────────────────┘
```

## Thread Model

```
JS Thread                UI Thread               GPU Thread
─────────                ─────────               ──────────
Component init           Render loop (vsync)     Skia flush
Signal updates           Yoga layout (dirty)     Rasterization
Computed derivations     Hit testing             Compositing
Event handlers           Gesture recognition
                         Skia draw commands
                         Animation drivers
```

Communication uses SharedArrayBuffer for layout results, worklets for animation/gesture code, and atomic flags for dirty signaling.

## Reactive Runtime

The reactive runtime maintains a directed acyclic graph (DAG) of dependencies:

```
signal(count)  ──→  computed(doubled)  ──→  effect(updateText)
                                       ──→  effect(updateColor)
signal(name)   ──→  effect(updateName)
```

Key properties:

- **Synchronous propagation** — signal write → all dependent effects run before next line
- **Glitch-free** — computed values are topologically sorted, no intermediate states visible
- **Lazy evaluation** — computed values only recalculate when read
- **Automatic cleanup** — when a component is removed, all its effects/computeds are disposed

## SkiaNode Tree

Instead of native views, Zilol Native uses lightweight JavaScript objects called **SkiaNodes**:

- `view` — Rectangle with background, border, shadow, clip
- `text` — Text via Skia Paragraph API
- `image` — Bitmap/SVG rendering
- `scroll` — Scrollable container with physics
- `canvas` — Raw Skia canvas for custom drawing
- `marker` — Invisible, used by Show/For for structural changes
- `platform` — Native view island (TextInput, Maps, etc.)

Each SkiaNode is ~100-200 bytes vs ~1-2KB per native view. They support dirty tracking, display list caching, and node recycling pools.

## Render Pipeline

Each frame follows this lifecycle:

1. **Process Signals** — Batched signal writes, reactive effects run
2. **Layout Pass** — Yoga calculates layout for dirty subtrees only
3. **Collect Damage Rects** — Union of all dirty node bounds
4. **Generate Display List** — Walk dirty subtrees, emit draw commands
5. **Execute on Skia Canvas** — Clip to damage rects, draw, flush
6. **Composite** — Skia surface + platform views

Display lists are cached per-node and only regenerated when the node is dirty. Clean nodes replay their cached display list.

## Package Dependencies

```
runtime          → (none — zero dependencies)
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
