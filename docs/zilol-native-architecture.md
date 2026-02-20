# Zilol Native — Full Architecture

## Vision

A next-generation rendering framework for React Native that replaces both the VDOM reconciler and the native view tree with two fundamentally better primitives: **fine-grained reactivity (signals)** for state propagation and **Skia** for rendering. The result is a system where a single value change propagates directly to a single draw command on a GPU canvas — no diffing, no native view creation, no bridge.

This is a **runtime library** (~5-7K lines of TypeScript), not a new compiler or language. It runs on existing tools: SWC for TypeScript compilation, Hermes for JS execution, Yoga for layout, and Skia for GPU rendering. You write standard TypeScript — no custom syntax, no build magic.

```
Signal Change → Direct SkiaNode Mutation → Damage Rect → Skia GPU Redraw
```

---

## 1. System Overview

### 1.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer API Layer                       │
│     Component functions, TypeScript, reactive primitives      │
├─────────────────────────────────────────────────────────────┤
│                   Reactive Runtime                           │
│        signal() / computed() / effect() / batch()            │
│        Fine-grained dependency graph                         │
├─────────────────────────────────────────────────────────────┤
│                   SkiaNode Tree                              │
│        Lightweight JS objects (~100-200 bytes each)          │
│        Reactive property bindings                            │
│        Dirty tracking + damage rect accumulation             │
├─────────────────────────────────────────────────────────────┤
│                   Layout Engine                              │
│        Yoga (C++ via JSI) — incremental layout               │
│        Only recalculates dirty subtrees                      │
├─────────────────────────────────────────────────────────────┤
│              Render Pipeline (UI Thread)                      │
│        Damage rect collection                                │
│        Display list generation                               │
│        Skia draw command execution                           │
├─────────────────────────────────────────────────────────────┤
│                  Skia GPU Backend                            │
│        Single SkSurface per window                           │
│        Metal (iOS) / Vulkan+OpenGL (Android)                 │
├──────────────┬──────────────────────────────────────────────┤
│  Platform    │         Native View Islands                   │
│  Bridge      │  TextInput, Maps, Video, WebView, Camera      │
│  (JSI)       │  Composited via platform view layer            │
└──────────────┴──────────────────────────────────────────────┘
```

### 1.2 Thread Model

```
JS Thread                    UI Thread                   GPU Thread
─────────                    ─────────                   ──────────
Component init               Render loop (vsync)         Skia flush
Signal updates               Yoga layout (dirty only)    Rasterization
Computed derivations         Hit testing                  Compositing
Event handlers               Gesture recognition
                             Skia draw commands
                             Animation drivers

Communication: SharedArrayBuffer for layout results
              Worklets for animation/gesture code
              Atomic flags for dirty signaling
```

---

## 2. Reactive Runtime

### 2.1 Core Primitives

```typescript
// === Signals: atomic reactive values ===
function signal<T>(initialValue: T): Signal<T>;

interface Signal<T> {
  get value(): T;      // read — auto-tracks dependency
  set value(v: T);     // write — notifies subscribers
  peek(): T;           // read without tracking
}

// === Computed: derived values, lazy + cached ===
function computed<T>(fn: () => T): Computed<T>;

interface Computed<T> {
  get value(): T;      // recalculates only if dependencies changed
}

// === Effect: side effects triggered by signal changes ===
function effect(fn: () => void | (() => void)): Disposer;

// === Batch: group multiple signal writes into one update ===
function batch(fn: () => void): void;

// === Untrack: read signals without creating dependencies ===
function untrack<T>(fn: () => T): T;
```

### 2.2 Dependency Graph

The reactive runtime maintains a directed acyclic graph (DAG) of dependencies:

```
signal(count)  ──→  computed(doubled)  ──→  effect(updateTextNode)
                                       ──→  effect(updateColorNode)
signal(name)   ──→  effect(updateNameNode)
```

Key properties:
- **Synchronous propagation**: signal write → all dependent effects run before next line
- **Glitch-free**: computed values are topologically sorted, no intermediate states visible
- **Lazy evaluation**: computed values only recalculate when read, not when dependencies change
- **Automatic cleanup**: when a component is removed, all its effects/computeds are disposed

### 2.3 Batching Strategy

```typescript
// Without batching: 3 separate updates, 3 potential redraws
firstName.value = "John";    // triggers effects
lastName.value = "Doe";      // triggers effects
age.value = 28;              // triggers effects

// With batching: 1 combined update, 1 redraw
batch(() => {
  firstName.value = "John";
  lastName.value = "Doe";
  age.value = 28;
});
// All effects run here, once
```

Batching integrates with the render loop — all signal writes within an event handler are auto-batched, and the Skia redraw happens on the next vsync.

### 2.4 Memory Management

```
Component Mount:
  - Create reactive scope (tracks all signals/effects in this component)
  - Effects register in this scope

Component Unmount:
  - Dispose reactive scope
  - All signals/computeds/effects in scope are freed
  - Dependency graph edges are cleaned up
  - SkiaNodes are released for recycling
```

No GC pressure from VDOM allocations — signals are long-lived objects, not recreated every render.

---

## 3. Component Model

### 3.1 Component Definition

Components are **plain functions that run exactly once**. They return a SkiaNode tree with reactive bindings — not a VDOM that gets re-executed on every state change.

```typescript
// Component runs ONCE. Reactive bindings handle updates.
function Counter() {
  const count = signal(0);
  const color = computed(() => count.value > 10 ? '#FF0000' : '#0066FF');

  return View({
    padding: 16,
    backgroundColor: color,  // reactive binding — updates when color changes
    children: [
      Text({
        text: () => `Count: ${count.value}`,  // reactive binding
        fontSize: 24,
        color: '#FFFFFF',
      }),
      Pressable({
        onPress: () => count.value++,
        child: Text({ text: 'Increment', fontSize: 18 }),
      }),
    ],
  });
}
```

### 3.2 Reactive vs Static Props

```typescript
// STATIC: set once, never changes — no overhead
Text({ fontSize: 24, color: '#000' })

// REACTIVE: function wrapper — creates effect that updates SkiaNode
Text({ fontSize: () => size.value, color: () => theme.value.textColor })

// The framework distinguishes at creation time:
function createSkiaNode(type, props) {
  const node = new SkiaNode(type);

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function' && key !== 'onPress' && key !== 'onLayout') {
      // Reactive prop — create effect
      effect(() => {
        node.setProp(key, value());
      });
    } else {
      // Static prop — set once
      node.setProp(key, value);
    }
  }

  return node;
}
```

### 3.3 Conditional Rendering

```typescript
function Show<T>(props: {
  when: () => T | null | undefined | false;
  fallback?: () => SkiaNode;
  children: (value: T) => SkiaNode;
}): SkiaNode;

// Usage
function UserProfile() {
  const user = signal<User | null>(null);

  return View({
    children: [
      Show({
        when: () => user.value,
        fallback: () => Text({ text: 'Loading...' }),
        children: (u) => Text({ text: () => u.name }),
      }),
    ],
  });
}
```

Implementation: `Show` creates a **marker node** in the SkiaNode tree. When the condition changes, it swaps the child subtree. This is the ONE place where structural changes happen — and it's explicit, not hidden behind a diffing algorithm.

### 3.4 List Rendering

```typescript
function For<T>(props: {
  each: () => T[];
  key: (item: T) => string | number;
  children: (item: () => T, index: () => number) => SkiaNode;
}): SkiaNode;

// Usage
function ChatMessages() {
  const messages = signal<Message[]>([]);

  return ScrollView({
    children: [
      For({
        each: () => messages.value,
        key: (msg) => msg.id,
        children: (msg, index) =>
          View({
            backgroundColor: () => index() % 2 === 0 ? '#F5F5F5' : '#FFFFFF',
            children: [
              Text({ text: () => msg().content }),
              Text({
                text: () => formatTime(msg().timestamp),
                fontSize: 12,
                color: '#999',
              }),
            ],
          }),
      }),
    ],
  });
}
```

Implementation: `For` uses a keyed reconciliation algorithm (similar to Solid's) but ONLY for structural changes (add/remove/reorder). Individual item updates flow through signals — no re-rendering of unchanged items.

### 3.5 Component Lifecycle

```typescript
function MyComponent() {
  // onMount — runs after SkiaNode is added to tree and first paint
  onMount(() => {
    console.log('mounted');

    // Return cleanup function (onUnmount)
    return () => {
      console.log('unmounted');
    };
  });

  // onLayout — runs after Yoga calculates layout
  onLayout((layout) => {
    console.log(layout.width, layout.height);
  });

  return View({ ... });
}
```

---

## 4. SkiaNode Tree

### 4.1 Node Types

```typescript
type SkiaNodeType =
  | 'view'       // Rectangle with bg, border, shadow, clip
  | 'text'       // Text with Skia Paragraph API
  | 'image'      // Bitmap/SVG rendering
  | 'scroll'     // Scrollable container with physics
  | 'canvas'     // Raw Skia canvas for custom drawing
  | 'marker'     // Invisible — used by Show/For for structural changes
  | 'platform'   // Native view island (TextInput, Maps, etc.)
```

### 4.2 SkiaNode Structure

```typescript
class SkiaNode {
  // Identity
  type: SkiaNodeType;
  key: string | null;

  // Tree
  parent: SkiaNode | null;
  children: SkiaNode[];
  depth: number;

  // Properties (style + content)
  props: SkiaNodeProps;

  // Layout (from Yoga)
  yogaNode: YogaNode;            // C++ Yoga node via JSI
  layout: {
    x: number; y: number;
    width: number; height: number;
    absoluteX: number; absoluteY: number;  // world coordinates
  };

  // Rendering
  dirty: boolean;
  dirtyRect: Rect | null;
  displayList: SkiaDisplayList | null;  // cached draw commands
  opacity: number;                       // computed absolute opacity
  transform: Matrix4;                    // computed absolute transform
  clipPath: SkPath | null;

  // Paint cache (avoid recreating every frame)
  backgroundPaint: SkPaint | null;
  borderPaint: SkPaint | null;
  shadowFilter: SkImageFilter | null;

  // Interaction
  touchable: boolean;
  hitTestPath: SkPath | null;

  // Memory ~100-200 bytes per node (vs ~1-2KB per native view)
}
```

### 4.3 Dirty Tracking

```typescript
class SkiaNode {
  markDirty(reason: 'prop' | 'layout' | 'children') {
    if (this.dirty) return;  // already dirty, no need to propagate
    this.dirty = true;

    // Accumulate damage rect
    if (this.layout) {
      this.dirtyRect = this.getWorldBounds();
    }

    // Invalidate display list cache
    this.displayList = null;

    // Propagate up — parent needs to know a descendant changed
    let node = this.parent;
    while (node) {
      if (node.hasDirtyDescendant) break;  // already marked
      node.hasDirtyDescendant = true;
      node = node.parent;
    }

    // If layout-affecting change, mark Yoga node dirty
    if (reason === 'layout') {
      this.yogaNode.markDirty();
    }

    // Schedule render on next vsync
    Renderer.scheduleFrame();
  }

  clearDirty() {
    this.dirty = false;
    this.hasDirtyDescendant = false;
    this.dirtyRect = null;
  }
}
```

### 4.4 Node Recycling Pool

```typescript
class NodePool {
  private pools: Map<SkiaNodeType, SkiaNode[]> = new Map();

  acquire(type: SkiaNodeType): SkiaNode {
    const pool = this.pools.get(type);
    if (pool && pool.length > 0) {
      const node = pool.pop()!;
      node.reset();  // clear props, children, layout
      return node;
    }
    return new SkiaNode(type);
  }

  release(node: SkiaNode) {
    // Recursively release children
    for (const child of node.children) {
      this.release(child);
    }

    // Return to pool (keep pools bounded)
    const pool = this.pools.get(node.type) ?? [];
    if (pool.length < 100) {  // max pool size
      pool.push(node);
      this.pools.set(node.type, pool);
    }
  }
}
```

---

## 5. Layout Engine

### 5.1 Yoga Integration

Yoga runs in C++ via JSI. Each SkiaNode has a corresponding YogaNode.

```
SkiaNode Tree (JS)          Yoga Tree (C++)
─────────────────           ────────────────
SkiaNode(view)    ←──JSI──→  YogaNode
  SkiaNode(text)  ←──JSI──→    YogaNode
  SkiaNode(view)  ←──JSI──→    YogaNode
    SkiaNode(img) ←──JSI──→      YogaNode
```

### 5.2 Incremental Layout

Only dirty subtrees get recalculated:

```typescript
function calculateLayout(root: SkiaNode) {
  // Yoga's built-in dirty tracking handles this
  // Only nodes marked dirty (and their ancestors) are recalculated
  root.yogaNode.calculateLayout(
    screenWidth,   // available width
    screenHeight,  // available height
    Direction.LTR
  );

  // Sync layout results back to SkiaNodes
  syncLayoutResults(root);
}

function syncLayoutResults(node: SkiaNode) {
  if (!node.yogaNode.hasNewLayout) return;

  const layout = node.yogaNode.getComputedLayout();
  const oldLayout = node.layout;

  // Check if layout actually changed
  if (layoutChanged(oldLayout, layout)) {
    node.layout = {
      x: layout.left,
      y: layout.top,
      width: layout.width,
      height: layout.height,
      absoluteX: computeAbsoluteX(node),
      absoluteY: computeAbsoluteY(node),
    };
    node.markDirty('layout');
  }

  node.yogaNode.markLayoutSeen();

  // Recurse into children
  for (const child of node.children) {
    syncLayoutResults(child);
  }
}
```

### 5.3 Text Measurement

Skia's Paragraph API provides text measurement that feeds back into Yoga:

```typescript
function measureText(
  node: SkiaNode,
  width: number,
  widthMode: MeasureMode,
  height: number,
  heightMode: MeasureMode
): { width: number; height: number } {
  // Build Skia paragraph with current style
  const paragraph = buildParagraph(
    node.props.text,
    node.props.fontSize,
    node.props.fontFamily,
    node.props.fontWeight,
    node.props.lineHeight,
    node.props.maxLines
  );

  // Layout paragraph with available width
  const layoutWidth = widthMode === MeasureMode.Undefined
    ? Infinity
    : width;
  paragraph.layout(layoutWidth);

  return {
    width: paragraph.getMaxIntrinsicWidth(),
    height: paragraph.getHeight(),
  };
}

// Register custom measure function with Yoga
yogaNode.setMeasureFunc(measureText);
```

---

## 6. Render Pipeline

### 6.1 Frame Lifecycle

```
vsync signal
    │
    ▼
┌──────────────────────┐
│  1. Process Signals   │  JS Thread
│     (batched writes)  │  Reactive effects run, SkiaNodes updated
└───────────┬──────────┘
            ▼
┌──────────────────────┐
│  2. Layout Pass       │  UI Thread (via JSI)
│     (Yoga dirty only) │  Incremental layout calculation
└───────────┬──────────┘
            ▼
┌──────────────────────┐
│  3. Collect Damage    │  UI Thread
│     Rects             │  Union of all dirty node bounds
└───────────┬──────────┘
            ▼
┌──────────────────────┐
│  4. Generate Display  │  UI Thread
│     List              │  Walk dirty subtrees, emit draw commands
└───────────┬──────────┘
            ▼
┌──────────────────────┐
│  5. Execute on Skia   │  UI Thread → GPU
│     Canvas            │  Clip to damage rects, draw, flush
└───────────┬──────────┘
            ▼
┌──────────────────────┐
│  6. Composite         │  GPU Thread
│                       │  Skia surface + platform views
└──────────────────────┘
```

### 6.2 Display List

Instead of drawing directly on every frame, cache draw commands:

```typescript
class DisplayList {
  commands: DrawCommand[];

  static generate(node: SkiaNode): DisplayList {
    const list = new DisplayList();

    // Background
    if (node.props.backgroundColor) {
      list.push({
        type: 'drawRRect',
        rrect: makeRRect(node.layout, node.props.borderRadius),
        paint: node.backgroundPaint,
      });
    }

    // Shadow (drawn BEFORE background)
    if (node.props.shadow) {
      list.push({
        type: 'drawShadow',
        path: makeRRectPath(node.layout, node.props.borderRadius),
        elevation: node.props.shadow.elevation,
        color: node.props.shadow.color,
      });
    }

    // Border
    if (node.props.borderWidth) {
      list.push({
        type: 'drawRRectStroke',
        rrect: makeRRect(node.layout, node.props.borderRadius),
        paint: node.borderPaint,
      });
    }

    // Clip children
    if (node.props.overflow === 'hidden') {
      list.push({
        type: 'clipRRect',
        rrect: makeRRect(node.layout, node.props.borderRadius),
      });
    }

    return list;
  }
}
```

Display lists are cached per-node and only regenerated when the node is dirty. Clean nodes replay their cached display list.

### 6.3 Drawing

```typescript
function drawNode(canvas: SkCanvas, node: SkiaNode, damageRect: Rect) {
  // Early exit: node is completely outside damage rect
  if (!intersects(node.getWorldBounds(), damageRect)) return;

  // Early exit: node is fully transparent
  if (node.computedOpacity <= 0) return;

  canvas.save();

  // Apply transform
  if (node.props.transform) {
    canvas.concat(node.computedTransformMatrix);
  }

  // Apply opacity
  if (node.computedOpacity < 1) {
    canvas.saveLayerAlpha(node.getLocalBounds(), node.computedOpacity * 255);
  }

  // Draw self (from display list cache)
  if (!node.displayList) {
    node.displayList = DisplayList.generate(node);
  }
  node.displayList.execute(canvas);

  // Draw children (back to front, painter's algorithm)
  for (const child of node.children) {
    drawNode(canvas, child, damageRect);
  }

  // Restore clip/transform
  if (node.computedOpacity < 1) canvas.restore();
  canvas.restore();
}
```

### 6.4 Damage Rect Optimization

```typescript
function collectDamageRects(root: SkiaNode): Rect[] {
  const rects: Rect[] = [];

  function walk(node: SkiaNode) {
    if (node.dirty && node.dirtyRect) {
      rects.push(node.dirtyRect);

      // Also include OLD position if node moved
      if (node.previousBounds && !rectsEqual(node.previousBounds, node.dirtyRect)) {
        rects.push(node.previousBounds);
      }
    }
    if (node.hasDirtyDescendant) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);

  // Merge overlapping rects to reduce draw calls
  return mergeRects(rects);
}

// On each frame:
function renderFrame(surface: SkSurface, root: SkiaNode) {
  if (!root.hasDirtyDescendant && !root.dirty) return;

  // 1. Layout
  calculateLayout(root);

  // 2. Damage rects
  const damageRects = collectDamageRects(root);

  // 3. Draw
  const canvas = surface.getCanvas();
  for (const rect of damageRects) {
    canvas.save();
    canvas.clipRect(rect);
    drawNode(canvas, root, rect);
    canvas.restore();
  }

  // 4. Clear dirty flags
  clearAllDirty(root);

  // 5. Flush to GPU
  surface.flush();
}
```

---

## 7. Animation System

### 7.1 Signal-Based Animations

Animations are just signals that change over time on the UI thread:

```typescript
function withSpring(
  target: number,
  config?: SpringConfig
): Signal<number> {
  const value = signal(target);

  // Animation driver runs on UI thread via worklet
  runOnUI(() => {
    const spring = new SpringSimulation(config);
    spring.setTarget(target);

    const frameCallback = (timestamp: number) => {
      const result = spring.advance(timestamp);
      value.value = result.value;

      if (!result.done) {
        requestAnimationFrame(frameCallback);
      }
    };

    requestAnimationFrame(frameCallback);
  });

  return value;
}

// Usage — animation updates flow through signals directly
function AnimatedCard() {
  const scale = signal(1);
  const translateY = signal(0);

  function onPressIn() {
    withSpring(scale, 0.95);
    withSpring(translateY, -4);
  }

  function onPressOut() {
    withSpring(scale, 1);
    withSpring(translateY, 0);
  }

  return Pressable({
    onPressIn,
    onPressOut,
    child: View({
      transform: () => [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
      shadow: () => ({
        elevation: translateY.value < 0 ? 8 : 2,
        color: 'rgba(0,0,0,0.15)',
      }),
      children: [ /* card content */ ],
    }),
  });
}
```

### 7.2 Gesture-Driven Animations

```typescript
function SwipeableCard() {
  const translateX = signal(0);
  const opacity = computed(() => 1 - Math.abs(translateX.value) / 300);

  const gesture = panGesture({
    onUpdate: (event) => {
      translateX.value = event.translationX;
    },
    onEnd: (event) => {
      if (Math.abs(event.translationX) > 150) {
        // Swipe away
        const direction = event.translationX > 0 ? 300 : -300;
        withTiming(translateX, direction, { duration: 200 });
      } else {
        // Snap back
        withSpring(translateX, 0);
      }
    },
  });

  return GestureDetector({
    gesture,
    child: View({
      transform: () => [{ translateX: translateX.value }],
      opacity: opacity,
      children: [ /* content */ ],
    }),
  });
}
```

### 7.3 Why This Is Fast

Current RN animation path:
```
Reanimated SharedValue → worklet → native view.setNativeProps → native layout → GPU
```

Signal + Skia animation path:
```
Signal change → SkiaNode.transform update → dirty rect → canvas.concat(matrix) → GPU
```

Transform animations (translate, scale, rotate, opacity) don't trigger Yoga layout at all. They only modify the canvas transform matrix, which is essentially free.

---

## 8. Event System

### 8.1 Hit Testing

With no native views, the framework must handle all touch dispatch:

```typescript
class HitTester {
  // Reverse tree walk — front-to-back
  hitTest(root: SkiaNode, point: Point): SkiaNode | null {
    return this.hitTestNode(root, point);
  }

  private hitTestNode(node: SkiaNode, point: Point): SkiaNode | null {
    // Skip non-touchable, invisible, or pointer-events: none
    if (!node.visible || node.props.pointerEvents === 'none') return null;

    // Transform point into node's local coordinate space
    const localPoint = node.worldToLocal(point);

    // Check if point is within node's clip bounds
    if (node.props.overflow === 'hidden' && !node.containsLocalPoint(localPoint)) {
      return null;
    }

    // Check children in reverse order (front to back)
    if (node.props.pointerEvents !== 'box-only') {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const hit = this.hitTestNode(node.children[i], point);
        if (hit) return hit;
      }
    }

    // Check self
    if (node.touchable && node.containsLocalPoint(localPoint)) {
      return node;
    }

    // Pass through (pointerEvents: 'box-none')
    return null;
  }
}
```

### 8.2 Gesture Recognition

```typescript
class GestureSystem {
  private recognizers: Map<SkiaNode, GestureRecognizer[]> = new Map();
  private activeGestures: Set<GestureRecognizer> = new Set();

  handleTouchDown(point: Point, pointerId: number) {
    const target = hitTester.hitTest(root, point);
    if (!target) return;

    // Walk up from target — collect all gesture recognizers
    let node: SkiaNode | null = target;
    const candidates: GestureRecognizer[] = [];

    while (node) {
      const recognizers = this.recognizers.get(node);
      if (recognizers) candidates.push(...recognizers);
      node = node.parent;
    }

    // Arena: let recognizers compete
    for (const recognizer of candidates) {
      recognizer.addPointer(pointerId, point);
    }
  }

  handleTouchMove(point: Point, pointerId: number) {
    for (const gesture of this.activeGestures) {
      gesture.handleMove(pointerId, point);
    }
  }

  handleTouchUp(point: Point, pointerId: number) {
    for (const gesture of this.activeGestures) {
      gesture.handleUp(pointerId, point);
    }
  }
}
```

### 8.3 Supported Gestures

```typescript
// Tap
tapGesture({ onTap, numberOfTaps?, maxDuration? })

// Pan / Drag
panGesture({ onStart, onUpdate, onEnd, minDistance?, activeOffsetX?, activeOffsetY? })

// Pinch
pinchGesture({ onStart, onUpdate, onEnd })

// Rotation
rotationGesture({ onStart, onUpdate, onEnd })

// Long Press
longPressGesture({ onStart, onEnd, minDuration? })

// Fling
flingGesture({ onStart, direction, numberOfPointers? })

// Composable
simultaneousGesture(gesture1, gesture2)
exclusiveGesture(gesture1, gesture2)
sequentialGesture(gesture1, gesture2)
```

---

## 9. Scrolling

### 9.1 ScrollView Implementation

ScrollView is a special SkiaNode that manages its own scroll offset and physics:

```typescript
class ScrollViewNode extends SkiaNode {
  scrollOffset: Signal<{ x: number; y: number }>;
  contentSize: { width: number; height: number };
  physics: ScrollPhysics;

  draw(canvas: SkCanvas) {
    // Clip to scroll bounds
    canvas.save();
    canvas.clipRect(this.getLocalBounds());

    // Translate by scroll offset
    const offset = this.scrollOffset.value;
    canvas.translate(-offset.x, -offset.y);

    // Draw children
    for (const child of this.children) {
      // Hybrid visibility culling — skip children fully outside viewport
      if (child.layout.y + child.layout.height < offset.y) continue;
      if (child.layout.y > offset.y + this.layout.height) continue;

      drawNode(canvas, child, this.getViewportRect());
    }

    canvas.restore();

    // Draw scrollbar indicators
    this.drawScrollIndicators(canvas);
  }
}
```

### 9.2 Scroll Physics

```typescript
interface ScrollPhysics {
  // Platform-specific behavior
  type: 'ios' | 'android';

  // Overscroll / bounce
  overscrollBehavior: 'bounce' | 'clamp' | 'glow';

  // Deceleration
  decelerationRate: number;

  // Snap points
  snapPoints?: number[];
  snapAlignment?: 'start' | 'center' | 'end';
}

// iOS bouncy physics
class IOSScrollPhysics implements ScrollPhysics {
  type = 'ios' as const;
  overscrollBehavior = 'bounce' as const;
  decelerationRate = 0.998;

  // Rubber band formula: offset = (1 - (1 / ((distance * 0.55 / limit) + 1))) * limit
  rubberBand(distance: number, limit: number): number {
    return (1 - 1 / (distance * 0.55 / limit + 1)) * limit;
  }
}
```

### 9.3 Virtualized Lists

```typescript
function VirtualList<T>(props: {
  data: () => T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: () => T, index: () => number) => SkiaNode;
  overscan?: number;  // extra items rendered above/below viewport
}) {
  const scrollOffset = signal(0);
  const viewportHeight = signal(0);

  // Compute visible range
  const visibleRange = computed(() => {
    const offset = scrollOffset.value;
    const height = viewportHeight.value;
    const overscan = props.overscan ?? 5;

    const startIndex = Math.max(0, Math.floor(offset / props.itemHeight) - overscan);
    const endIndex = Math.min(
      props.data().length - 1,
      Math.ceil((offset + height) / props.itemHeight) + overscan
    );

    return { startIndex, endIndex };
  });

  // Only create/destroy nodes when visible range changes
  // Items WITHIN the range update through their own signals (no re-render)
  return ScrollView({
    onScroll: (offset) => scrollOffset.value = offset.y,
    onLayout: (layout) => viewportHeight.value = layout.height,
    contentHeight: () => props.data().length * props.itemHeight,
    children: [
      For({
        each: () => {
          const { startIndex, endIndex } = visibleRange.value;
          return props.data().slice(startIndex, endIndex + 1);
        },
        key: (item) => item.id,
        children: props.renderItem,
      }),
    ],
  });
}
```

---

## 10. Text Rendering

### 10.1 Skia Paragraph API

```typescript
class TextNode extends SkiaNode {
  private paragraph: SkParagraph | null = null;
  private paragraphDirty = true;

  buildParagraph(): SkParagraph {
    if (!this.paragraphDirty && this.paragraph) return this.paragraph;

    const builder = ParagraphBuilder.Make(
      ParagraphStyle({
        textStyle: {
          fontSize: this.props.fontSize,
          fontFamilies: [this.props.fontFamily ?? 'System'],
          color: SkColor(this.props.color),
          fontWeight: mapFontWeight(this.props.fontWeight),
          letterSpacing: this.props.letterSpacing,
          height: this.props.lineHeight ? this.props.lineHeight / this.props.fontSize : undefined,
        },
        textAlign: mapTextAlign(this.props.textAlign),
        maxLines: this.props.maxLines,
        ellipsis: this.props.maxLines ? '...' : undefined,
      }),
      FontManager
    );

    builder.addText(this.props.text);
    this.paragraph = builder.build();
    this.paragraphDirty = false;
    return this.paragraph;
  }

  draw(canvas: SkCanvas) {
    const paragraph = this.buildParagraph();
    paragraph.layout(this.layout.width);
    canvas.drawParagraph(paragraph, this.layout.x, this.layout.y);
  }
}
```

### 10.2 Rich Text / Attributed Strings

```typescript
function RichText(props: {
  children: (TextSpan | string)[];
}) {
  // Maps to multiple pushStyle/addText/pop calls on ParagraphBuilder
  return TextNode({
    spans: props.children.map((child) => {
      if (typeof child === 'string') return { text: child };
      return child;
    }),
  });
}

// Usage
RichText({
  children: [
    'Hello ',
    TextSpan({ text: 'world', fontWeight: 'bold', color: '#FF0000' }),
    ' from ',
    TextSpan({ text: () => name.value, fontStyle: 'italic' }),
  ],
});
```

---

## 11. Image Handling

### 11.1 Async Image Loading

```typescript
class ImageNode extends SkiaNode {
  private skImage: SkImage | null = null;
  private loadingState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';

  async loadImage(uri: string) {
    this.loadingState = 'loading';

    try {
      // Check memory cache
      let data = ImageCache.get(uri);

      if (!data) {
        // Check disk cache, then network
        data = await ImageLoader.load(uri);
        ImageCache.set(uri, data);
      }

      // Decode on background thread
      this.skImage = await SkImage.MakeFromEncodedAsync(data);
      this.loadingState = 'loaded';
      this.markDirty('prop');
    } catch (e) {
      this.loadingState = 'error';
      if (this.props.onError) this.props.onError(e);
    }
  }

  draw(canvas: SkCanvas) {
    if (!this.skImage) {
      // Draw placeholder
      if (this.props.placeholder) {
        canvas.drawColor(SkColor(this.props.placeholder));
      }
      return;
    }

    // Draw with proper aspect ratio handling
    const src = SkRect.MakeWH(this.skImage.width(), this.skImage.height());
    const dst = computeDestRect(src, this.layout, this.props.resizeMode);

    canvas.drawImageRect(this.skImage, src, dst, this.imagePaint);
  }
}
```

### 11.2 Image Cache Strategy

```
L1: In-memory SkImage cache (decoded, GPU-ready)
    - Bounded by total pixel count (e.g., 50MB of decoded images)
    - LRU eviction

L2: In-memory encoded data cache
    - Raw bytes before decoding
    - Faster than disk read

L3: Disk cache
    - Persistent across app launches
    - Content-addressable (hash of URL)

L4: Network
    - HTTP cache headers respected
    - Progressive loading for large images
```

---

## 12. Accessibility

### 12.1 Shadow Accessibility Tree

Since Skia renders to a single canvas, native accessibility services can't inspect individual elements. The solution is a parallel, invisible native view hierarchy:

```
Skia Canvas (what user sees)        Accessibility Tree (what screen reader sees)
────────────────────────────        ──────────────────────────────────────────
SkiaNode(view)                      AccessibilityNode(role: 'none')
  SkiaNode(text: "Hello")            AccessibilityNode(role: 'text', label: 'Hello')
  SkiaNode(pressable)                AccessibilityNode(role: 'button', label: 'Submit')
    SkiaNode(text: "Submit")
  SkiaNode(image)                    AccessibilityNode(role: 'image', label: 'Profile photo')
```

### 12.2 Implementation

```typescript
class AccessibilityManager {
  // Maintain parallel native view tree for accessibility
  private nativeAccessibilityViews: Map<SkiaNode, NativeAccessibilityView> = new Map();

  syncAccessibilityTree(root: SkiaNode) {
    this.walkAndSync(root);
  }

  private walkAndSync(node: SkiaNode) {
    if (node.props.accessible !== false && node.props.accessibilityRole) {
      let nativeView = this.nativeAccessibilityViews.get(node);

      if (!nativeView) {
        // Create invisible native view positioned over the SkiaNode
        nativeView = NativeAccessibilityBridge.createView();
        this.nativeAccessibilityViews.set(node, nativeView);
      }

      // Sync position and properties
      nativeView.setFrame(node.layout.absoluteX, node.layout.absoluteY,
                          node.layout.width, node.layout.height);
      nativeView.setRole(node.props.accessibilityRole);
      nativeView.setLabel(node.props.accessibilityLabel);
      nativeView.setHint(node.props.accessibilityHint);
      nativeView.setActions(node.props.accessibilityActions);
    }

    for (const child of node.children) {
      this.walkAndSync(child);
    }
  }
}
```

### 12.3 Accessibility Props

```typescript
interface AccessibilityProps {
  accessible?: boolean;
  accessibilityRole?: 'button' | 'link' | 'header' | 'text' | 'image'
                     | 'search' | 'checkbox' | 'radio' | 'slider' | 'tab';
  accessibilityLabel?: string | (() => string);  // reactive
  accessibilityHint?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    expanded?: boolean;
    busy?: boolean;
  };
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessibilityActions?: AccessibilityAction[];
  onAccessibilityAction?: (action: AccessibilityAction) => void;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
}
```

---

## 13. Native View Islands

### 13.1 Platform View Architecture

Some components MUST be native — TextInput (IME), Maps, Video, WebView, Camera. These are composited on top of or embedded within the Skia surface.

```
┌──────────────────────────────────────────┐
│              Native View Layer            │  ← TextInput, Maps, etc.
├──────────────────────────────────────────┤
│              Skia Surface                 │  ← Everything else
└──────────────────────────────────────────┘
```

### 13.2 Compositing Modes

**Overlay mode** (simpler): native view is placed on top of Skia canvas at correct position.
  - Pros: simple, no performance cost
  - Cons: native view always on top — can't have Skia content above it

**Hybrid texture mode** (complex): Skia renders to multiple layers, native view sandwiched between.
  - Pros: correct z-ordering
  - Cons: multiple Skia surfaces = more memory, compositing cost

```typescript
class PlatformViewNode extends SkiaNode {
  private nativeView: NativeView;

  // Sync native view position with Skia layout
  syncFrame() {
    this.nativeView.setFrame(
      this.layout.absoluteX,
      this.layout.absoluteY,
      this.layout.width,
      this.layout.height
    );
  }

  draw(canvas: SkCanvas) {
    // Draw placeholder rect where native view will be
    // (helps with damage rect calculation)
    canvas.drawRect(this.getLocalBounds(), transparentPaint);
  }
}
```

### 13.3 TextInput Special Handling

```typescript
function TextInput(props: TextInputProps) {
  const displayText = signal(props.defaultValue ?? '');
  const isFocused = signal(false);

  return PlatformView({
    type: 'textInput',
    // When not focused: render text with Skia (looks identical, but consistent)
    // When focused: show native TextInput (for IME, selection, autocomplete)
    nativeProps: {
      text: displayText,
      onChangeText: (text: string) => {
        displayText.value = text;
        props.onChangeText?.(text);
      },
      onFocus: () => isFocused.value = true,
      onBlur: () => isFocused.value = false,
      ...props,
    },
  });
}
```

---

## 14. Navigation

### 14.1 Screen Stack

```typescript
const navigation = createNavigation({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
  },
});

// Each screen is a separate SkiaNode subtree
// Navigation manages which subtrees are mounted and transitions between them

class ScreenStack {
  screens: Map<string, {
    node: SkiaNode;
    state: 'active' | 'transitioning' | 'cached';
  }>;

  // Transition: animate current screen out, new screen in
  push(screenName: string, params: any) {
    const newScreen = this.createScreen(screenName, params);
    const currentScreen = this.activeScreen;

    // Animate simultaneously
    const progress = signal(0);
    withSpring(progress, 1, { damping: 20 });

    // Current screen slides left
    currentScreen.node.bindProp('transform', () => [
      { translateX: -screenWidth * 0.3 * progress.value },
    ]);

    // New screen slides in from right
    newScreen.node.bindProp('transform', () => [
      { translateX: screenWidth * (1 - progress.value) },
    ]);
  }
}
```

### 14.2 Screen Caching

```typescript
// Keep inactive screens in memory but stop their render updates
class ScreenCache {
  cache: Map<string, SkiaNode> = new Map();

  deactivate(screenName: string, node: SkiaNode) {
    // Suspend all reactive subscriptions for this screen
    node.suspendReactiveScope();
    // Keep node in cache
    this.cache.set(screenName, node);
  }

  reactivate(screenName: string): SkiaNode | null {
    const node = this.cache.get(screenName);
    if (node) {
      // Resume reactive subscriptions
      node.resumeReactiveScope();
      this.cache.delete(screenName);
    }
    return node;
  }
}
```

---

## 15. Developer Experience

### 15.1 DevTools

```
┌─────────────────────────────────────────────┐
│  Zilol Native DevTools                       │
├─────────────────────────────────────────────┤
│                                              │
│  [SkiaNode Tree]  [Signal Graph]  [Perf]     │
│                                              │
│  ▼ View (root)                               │
│    ▼ ScrollView                              │
│      ▼ For (messages, 47 items)              │
│        ▶ View (msg-1) ●                      │
│        ▶ View (msg-2)                        │
│        ▶ View (msg-3) ●                      │
│                                              │
│  ● = dirty this frame                        │
│                                              │
│  Signals: 234 active                         │
│  Effects: 189 active                         │
│  SkiaNodes: 1,247                            │
│  Frame time: 2.3ms (draw: 0.8ms)            │
│  Damage rects: 2 (total: 340x60px)          │
│                                              │
└─────────────────────────────────────────────┘
```

### 15.2 Hot Reload

```
File change detected
    │
    ▼
Compile changed component function
    │
    ▼
Replace component factory in registry
    │
    ▼
For each instance of that component:
  - Preserve signal values (state survives reload)
  - Dispose old effects
  - Re-run component function (creates new bindings)
  - Swap SkiaNode subtree
    │
    ▼
Next frame redraws affected subtrees
```

Because components run once and signals are separate from the render function, hot reload can preserve state naturally — just re-run the component function with the same signals.

### 15.3 Performance Overlay

```typescript
// Built-in performance metrics drawn directly on Skia canvas
class PerfOverlay {
  draw(canvas: SkCanvas) {
    // Frame time graph
    drawFrameTimeGraph(canvas, this.frameTimes);

    // Stats
    drawText(canvas, 10, 30, [
      `JS: ${this.jsThreadTime.toFixed(1)}ms`,
      `Layout: ${this.layoutTime.toFixed(1)}ms`,
      `Draw: ${this.drawTime.toFixed(1)}ms`,
      `Nodes: ${this.totalNodes} (dirty: ${this.dirtyNodes})`,
      `Signals: ${this.totalSignals}`,
      `Damage: ${this.damageArea}px²`,
    ].join(' | '));
  }
}
```

---

## 16. Build Pipeline

### 16.1 Philosophy: Don't Reinvent, Compose

Building a TypeScript parser or type checker from scratch is years of work (TypeScript's own
compiler is ~1.5M lines of code). Instead, this framework stands on top of existing, battle-tested
tools and focuses only on what's new — the reactive runtime and Skia rendering.

**Don't build:**
- TypeScript parser (SWC/OXC already handles 100% of TS)
- Type checker (use `tsc` in IDE, not at bundle time)
- Bundler (use SWC/esbuild)
- JS engine (Hermes exists)
- Layout engine (Yoga exists)
- GPU rendering (Skia exists)

**Do build (~5,000-7,000 lines total):**
- Reactive runtime: `signal`, `computed`, `effect`, `batch` (~500-1,000 lines)
- SkiaNode tree: node types, dirty tracking, recycling (~2,000-3,000 lines)
- Render loop: damage rects, Skia draw calls (~500 lines)
- Layout bridge: Yoga ↔ SkiaNode sync via JSI (~300 lines)
- Gesture system and hit testing (~800 lines)
- SWC plugin for optimizations (~500 lines, **optional**)

### 16.2 Actual Pipeline (V1 — No Custom Compiler)

```
Source (TypeScript)
        │
        ▼
  SWC (parse + bundle)              ← already exists, handles all TS
        │
        ▼
  JS Bundle
        │
        ▼
  Hermes                             ← already exists
        │
        ▼
  Your Runtime Library               ← THIS is what you build
  (signals + SkiaNodes + Yoga + Skia draw)
```

In practice, the dev command is just:

```bash
npx swc ./src --out-dir ./dist
# or
npx esbuild ./src/index.ts --bundle --outfile=dist/bundle.js
```

SWC strips TypeScript types and bundles. Hermes runs the JS. All the rendering
magic happens in the runtime library, not in the compiler.

### 16.3 Optional SWC Plugin (V2 — Performance Optimization)

The framework works perfectly without this. The plugin is a future optimization
that does static analysis at compile time to reduce runtime work:

```typescript
// WHAT YOU WRITE:
function Card(title: string, subtitle: string): SkiaNode {
  return View({
    padding: 16,                    // static — never changes
    backgroundColor: '#FFFFFF',     // static
    borderRadius: 8,                // static
    children: [
      Text({ text: title, fontSize: 18, fontWeight: 'bold' }),
      Text({ text: subtitle, fontSize: 14, color: '#666' }),
    ],
  });
}

// WITHOUT PLUGIN — runtime figures out static vs reactive:
// Every prop goes through a typeof check at component creation time.
// Works fine, costs ~0.01ms per component. Negligible.

// WITH SWC PLUGIN — compiler pre-analyzes:
// 1. Marks padding, backgroundColor, borderRadius as static (skip effect() wrapper)
// 2. Pre-computes paint objects at module load
// 3. Pre-allocates node with known child count
// Net savings: ~0.005ms per component. Only matters at scale (1000+ components).
```

The plugin is ~500 lines of Rust using SWC's visitor API. It walks the AST,
detects `signal()`, `computed()`, `View()`, `Text()` calls, and annotates
static vs reactive props. Nothing more.

### 16.4 Future Pipeline (V3 — AOT Native)

Only worth exploring after V1 and V2 are proven and working:

```
Source (TypeScript)
        │
        ▼
  SWC (parse + bundle)
        │
        ▼
  Static Hermes (when ready)
        │  - Compiles JS → native using type annotations
        │  - Typed bytecode for hot paths
        │  - Interpreter fallback for untyped npm code
        ▼
  Native binary + Hermes bytecode
```

This depends on Static Hermes maturing to support the full JS feature set.
Don't plan around this for V1 — treat it as a future bonus.

### 16.5 Development Workflow

```
Developer writes TypeScript
        │
        ▼
  File watcher (SWC in watch mode)
        │  - Recompiles changed file in ~10ms
        ▼
  Hot reload
        │  - Replace component function in registry
        │  - Preserve signal values (state survives)
        │  - Dispose old effects, re-run component
        │  - Swap SkiaNode subtree
        ▼
  Next frame redraws affected area only
```

### 16.6 What You Ship

```
App Bundle
├── index.bundle.js          ← Your app code (SWC compiled)
├── zilol-native-runtime.js   ← The framework runtime (~5-7K lines)
├── libskia.so / Skia.framework  ← Skia binary (~2-3MB)
├── libyoga.so               ← Yoga (already in RN)
└── libhermes.so             ← Hermes (already in RN)
```

The only new binary dependency is Skia itself (~2-3MB). Everything else
is either your JS runtime code or already present in React Native.
