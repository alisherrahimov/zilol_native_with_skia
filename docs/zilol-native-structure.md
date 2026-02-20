# Zilol Native — Project Structure

```
zilol-native/
├── README.md
├── LICENSE
├── package.json
├── tsconfig.json
├── turbo.json                          # monorepo task runner
│
├── packages/
│   │
│   ├── runtime/                        # Core reactive runtime (Step 1)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                # Public API exports
│   │   │   │
│   │   │   ├── reactive/               # Signal system
│   │   │   │   ├── signal.ts           # signal() — atomic reactive value
│   │   │   │   ├── computed.ts         # computed() — derived value
│   │   │   │   ├── effect.ts           # effect() — side effect runner
│   │   │   │   ├── batch.ts            # batch() — group updates
│   │   │   │   ├── untrack.ts          # untrack() — read without tracking
│   │   │   │   ├── scope.ts            # reactive scope for auto-cleanup
│   │   │   │   ├── graph.ts            # dependency graph internals
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── primitives/             # Control flow primitives
│   │   │   │   ├── show.ts             # Show() — conditional rendering
│   │   │   │   ├── for.ts              # For() — keyed list rendering
│   │   │   │   ├── switch.ts           # Switch() — multi-condition
│   │   │   │   ├── portal.ts           # Portal() — render outside tree
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── lifecycle/              # Component lifecycle
│   │   │       ├── mount.ts            # onMount()
│   │   │       ├── cleanup.ts          # onCleanup()
│   │   │       ├── layout.ts           # onLayout()
│   │   │       └── index.ts
│   │   │
│   │   └── __tests__/
│   │       ├── signal.test.ts
│   │       ├── computed.test.ts
│   │       ├── effect.test.ts
│   │       ├── batch.test.ts
│   │       ├── scope.test.ts
│   │       ├── show.test.ts
│   │       └── for.test.ts
│   │
│   ├── nodes/                          # SkiaNode tree (Step 2)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   │
│   │   │   ├── core/
│   │   │   │   ├── SkiaNode.ts         # Base node class
│   │   │   │   ├── NodePool.ts         # Node recycling pool
│   │   │   │   ├── DirtyTracker.ts     # Dirty flag propagation
│   │   │   │   ├── types.ts            # Shared types
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── elements/               # Built-in node types
│   │   │   │   ├── ViewNode.ts         # View — rectangle, bg, border, shadow, clip
│   │   │   │   ├── TextNode.ts         # Text — Skia Paragraph API
│   │   │   │   ├── ImageNode.ts        # Image — bitmap rendering
│   │   │   │   ├── ScrollNode.ts       # ScrollView — scroll offset + clip
│   │   │   │   ├── CanvasNode.ts       # Canvas — raw Skia drawing
│   │   │   │   ├── MarkerNode.ts       # Marker — invisible, used by Show/For
│   │   │   │   ├── PlatformNode.ts     # Platform — native view island
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── props/
│   │   │       ├── binding.ts          # Wire reactive props to nodes
│   │   │       ├── style.ts            # Style prop normalization
│   │   │       └── index.ts
│   │   │
│   │   └── __tests__/
│   │       ├── SkiaNode.test.ts
│   │       ├── NodePool.test.ts
│   │       ├── DirtyTracker.test.ts
│   │       └── binding.test.ts
│   │
│   ├── layout/                         # Yoga layout bridge (Step 4)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── YogaBridge.ts           # SkiaNode ↔ YogaNode sync
│   │   │   ├── YogaConfig.ts           # Default yoga configuration
│   │   │   ├── TextMeasure.ts          # Skia paragraph → Yoga measure func
│   │   │   ├── LayoutSync.ts           # Read computed layout back to nodes
│   │   │   └── constants.ts            # Flex direction, align, justify maps
│   │   │
│   │   └── __tests__/
│   │       ├── YogaBridge.test.ts
│   │       └── TextMeasure.test.ts
│   │
│   ├── renderer/                       # Skia render pipeline (Step 5)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   │
│   │   │   ├── pipeline/
│   │   │   │   ├── RenderLoop.ts       # vsync-driven frame loop
│   │   │   │   ├── DamageRect.ts       # Damage rect collection + merging
│   │   │   │   ├── DisplayList.ts      # Cached draw commands per node
│   │   │   │   ├── Compositor.ts       # Skia surface + platform view compositing
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── draw/
│   │   │   │   ├── drawView.ts         # Background, border, shadow, clip
│   │   │   │   ├── drawText.ts         # Skia Paragraph rendering
│   │   │   │   ├── drawImage.ts        # Image rect with resize modes
│   │   │   │   ├── drawScroll.ts       # Scroll offset + viewport culling
│   │   │   │   ├── drawNode.ts         # Main draw dispatcher
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── paint/
│   │   │       ├── PaintCache.ts       # Reusable SkPaint objects
│   │   │       ├── ShadowFactory.ts    # Drop shadow image filters
│   │   │       └── index.ts
│   │   │
│   │   └── __tests__/
│   │       ├── DamageRect.test.ts
│   │       └── DisplayList.test.ts
│   │
│   ├── gestures/                       # Event system + gestures
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   │
│   │   │   ├── hit/
│   │   │   │   ├── HitTester.ts        # Point → SkiaNode resolution
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── recognizers/
│   │   │   │   ├── TapGesture.ts
│   │   │   │   ├── PanGesture.ts
│   │   │   │   ├── PinchGesture.ts
│   │   │   │   ├── LongPressGesture.ts
│   │   │   │   ├── FlingGesture.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── arena/
│   │   │   │   ├── GestureArena.ts     # Gesture competition resolution
│   │   │   │   ├── Compositor.ts       # simultaneous / exclusive / sequential
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── scroll/
│   │   │       ├── ScrollPhysics.ts    # Base scroll physics
│   │   │       ├── IOSPhysics.ts       # iOS rubber band + deceleration
│   │   │       ├── AndroidPhysics.ts   # Android overscroll glow
│   │   │       └── index.ts
│   │   │
│   │   └── __tests__/
│   │       ├── HitTester.test.ts
│   │       └── GestureArena.test.ts
│   │
│   ├── animation/                      # Animation drivers
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── withSpring.ts           # Spring animation
│   │   │   ├── withTiming.ts           # Timing animation (easing)
│   │   │   ├── withDecay.ts            # Momentum-based decay
│   │   │   ├── interpolate.ts          # Value interpolation
│   │   │   ├── Spring.ts              # Spring simulation math
│   │   │   ├── Easing.ts              # Easing functions
│   │   │   └── FrameDriver.ts          # requestAnimationFrame loop
│   │   │
│   │   └── __tests__/
│   │       ├── withSpring.test.ts
│   │       └── interpolate.test.ts
│   │
│   ├── platform/                       # Native view islands
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── PlatformView.ts         # Base native view bridge
│   │   │   ├── TextInputBridge.ts      # Native TextInput overlay
│   │   │   ├── FrameSync.ts            # Sync native view position with SkiaNode
│   │   │   └── types.ts
│   │   │
│   │   ├── android/
│   │   │   ├── src/main/java/com/zilolnative/
│   │   │   │   ├── PlatformViewManager.kt
│   │   │   │   └── TextInputManager.kt
│   │   │   └── build.gradle
│   │   │
│   │   └── ios/
│   │       ├── PlatformViewManager.swift
│   │       └── TextInputManager.swift
│   │
│   ├── accessibility/                  # Shadow accessibility tree
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── A11yManager.ts          # Sync SkiaNode tree → native a11y tree
│   │   │   ├── A11yNode.ts             # Accessibility node wrapper
│   │   │   ├── A11yProps.ts            # Accessibility prop types
│   │   │   └── types.ts
│   │   │
│   │   ├── android/
│   │   │   └── src/main/java/com/zilolnative/
│   │   │       └── A11yBridge.kt
│   │   │
│   │   └── ios/
│   │       └── A11yBridge.swift
│   │
│   ├── image/                          # Image loading + caching
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── ImageLoader.ts          # Async fetch + decode
│   │   │   ├── ImageCache.ts           # L1 memory / L2 disk cache
│   │   │   ├── ImageDecoder.ts         # Background thread decode to SkImage
│   │   │   └── types.ts
│   │   │
│   │   └── __tests__/
│   │       └── ImageCache.test.ts
│   │
│   └── devtools/                       # Developer tools
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── PerfOverlay.ts          # On-screen performance metrics
│       │   ├── NodeInspector.ts        # SkiaNode tree inspector
│       │   ├── SignalDebugger.ts       # Signal dependency graph viewer
│       │   └── DamageRectOverlay.ts    # Visualize damage rects
│       │
│       └── __tests__/
│           └── PerfOverlay.test.ts
│
├── components/                         # Built-in components
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── View.ts                     # View()
│   │   ├── Text.ts                     # Text()
│   │   ├── Image.ts                    # Image()
│   │   ├── Pressable.ts               # Pressable()
│   │   ├── ScrollView.ts              # ScrollView()
│   │   ├── TextInput.ts               # TextInput() — native island
│   │   ├── FlatList.ts                # FlatList() — virtualized list
│   │   └── ActivityIndicator.ts       # ActivityIndicator()
│   │
│   └── __tests__/
│       └── View.test.ts
│
├── navigation/                         # Navigation system
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── ScreenStack.ts             # Stack navigation
│   │   ├── TabNavigator.ts            # Tab navigation
│   │   ├── ScreenCache.ts             # Inactive screen caching
│   │   ├── Transitions.ts             # Screen transition animations
│   │   └── types.ts
│   │
│   └── __tests__/
│       └── ScreenStack.test.ts
│
├── example/                            # Demo app
│   ├── package.json
│   ├── tsconfig.json
│   ├── metro.config.js
│   ├── android/
│   ├── ios/
│   ├── src/
│   │   ├── App.ts                      # Entry point
│   │   ├── screens/
│   │   │   ├── CounterDemo.ts          # Basic signals + rendering
│   │   │   ├── ListDemo.ts             # For() + ScrollView
│   │   │   ├── AnimationDemo.ts        # Spring + gesture animations
│   │   │   ├── ChatDemo.ts             # Real-world chat UI
│   │   │   └── BenchmarkDemo.ts        # Performance comparison vs RN
│   │   └── components/
│   │       ├── Card.ts
│   │       ├── Button.ts
│   │       └── Avatar.ts
│   │
│   └── __tests__/
│       └── App.test.ts
│
├── benchmarks/                         # Performance benchmarks
│   ├── package.json
│   ├── src/
│   │   ├── signal-propagation.ts       # Signal update → effect timing
│   │   ├── node-creation.ts            # SkiaNode vs native view creation
│   │   ├── render-throughput.ts        # Frames per second under load
│   │   ├── memory-usage.ts             # Memory per component comparison
│   │   └── list-scroll.ts             # Scroll performance with 10K items
│   │
│   └── results/
│       └── .gitkeep
│
└── docs/                               # Documentation
    ├── getting-started.md
    ├── architecture.md                 # The full architecture doc
    ├── api/
    │   ├── signals.md
    │   ├── components.md
    │   ├── animations.md
    │   ├── gestures.md
    │   └── navigation.md
    └── guides/
        ├── why-zilol-native.md
        ├── signals-vs-vdom.md
        └── migration-from-rn.md
```

## Build Order

```
Phase 1 — Foundation (no native code needed)
──────────────────────────────────────────────
  packages/runtime/          ← START HERE
  packages/runtime/__tests__/

Phase 2 — Node tree (still pure TypeScript)
──────────────────────────────────────────────
  packages/nodes/
  packages/nodes/__tests__/

Phase 3 — First pixels (needs RN + Skia)
──────────────────────────────────────────────
  packages/layout/
  packages/renderer/
  example/                   ← CounterDemo.ts

Phase 4 — Interaction
──────────────────────────────────────────────
  packages/gestures/
  packages/animation/
  example/                   ← AnimationDemo.ts

Phase 5 — Production ready
──────────────────────────────────────────────
  packages/platform/
  packages/accessibility/
  packages/image/
  components/
  navigation/
  example/                   ← ChatDemo.ts

Phase 6 — Polish
──────────────────────────────────────────────
  packages/devtools/
  benchmarks/
  docs/
```

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
devtools         → runtime, nodes, renderer
components       → runtime, nodes, renderer, gestures, animation
navigation       → runtime, nodes, renderer, animation
```
