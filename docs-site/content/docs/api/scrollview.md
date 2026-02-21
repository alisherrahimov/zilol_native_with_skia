---
title: ScrollView
order: 10
---

# ScrollView

Scrollable container with native-feel physics — rubber-band overscroll,
deceleration fling, snap-to-interval, and paging.

## Basic Usage

```typescript
import { ScrollView, View, Text } from "@zilol-native/components";

// Vertical scroll (default)
const list = ScrollView(
  ...items.map((item) =>
    View(Text(item.title).color("#FFF"))
      .padding(16)
      .backgroundColor("#1E293B")
      .borderRadius(8),
  ),
)
  .flex(1)
  .padding(16)
  .gap(8)
  .backgroundColor("#0A1628");
```

## Horizontal Carousel

```typescript
ScrollView(...cards)
  .horizontal()
  .showsScrollIndicator(false)
  .decelerationRate("fast")
  .snapToInterval(320);
```

## Paging

Snaps to viewport-sized pages — useful for onboarding or galleries.

```typescript
ScrollView(...pages)
  .horizontal()
  .pagingEnabled()
  .bounces(false);
```

## Scroll Events

```typescript
import { signal } from "@zilol-native/runtime";

const offset = signal({ x: 0, y: 0 });

ScrollView(...children)
  .flex(1)
  .onScroll((pos) => {
    offset.value = pos; // fires on every frame
  })
  .onScrollEnd((pos) => {
    console.log("Settled at", pos); // fires when momentum stops
  })
  .onScrollBeginDrag(() => {
    console.log("Started dragging");
  })
  .onScrollEndDrag(() => {
    console.log("Stopped dragging");
  });
```

## Programmatic Scrolling

```typescript
const sv = ScrollView(...children).flex(1);

// Animated spring to offset
sv.scrollTo(0, 500);

// Instant jump
sv.scrollTo(0, 500, false);

// Access controller for advanced use
sv.controller.scrollTo(100, 0, true);
```

## Scroll Physics

ScrollView uses iOS-style scroll physics implemented in pure TypeScript:

| Phase        | Behavior                                           |
| ------------ | -------------------------------------------------- |
| **Dragging** | 1:1 touch tracking; rubber-band when past boundary |
| **Fling**    | Exponential velocity decay (`v × rate^dt`)         |
| **Bounce**   | Critically-damped spring to boundary               |
| **Snap**     | Spring to nearest snap interval or page            |

### Deceleration Rates

| Value       | Constant | Use case                 |
| ----------- | -------- | ------------------------ |
| `'normal'`  | `0.998`  | Standard lists (default) |
| `'fast'`    | `0.99`   | Pickers, carousels       |
| `0.0 – 1.0` | Custom   | Fine-tuned behavior      |

## Full API

### Scroll Behavior

| Method                    | Type                           | Default    | Description                |
| ------------------------- | ------------------------------ | ---------- | -------------------------- |
| `.horizontal()`           | `boolean`                      | `false`    | Scroll on X axis           |
| `.bounces()`              | `boolean`                      | `true`     | iOS rubber-band overscroll |
| `.scrollEnabled()`        | `boolean`                      | `true`     | Enable/disable scroll      |
| `.showsScrollIndicator()` | `boolean`                      | `true`     | Show scroll bar            |
| `.pagingEnabled()`        | `boolean`                      | `false`    | Snap to viewport pages     |
| `.snapToInterval(px)`     | `number`                       | —          | Snap at multiples of `px`  |
| `.decelerationRate(r)`    | `'normal' \| 'fast' \| number` | `'normal'` | Fling friction             |
| `.scrollX(px)`            | `number`                       | `0`        | Set X offset               |
| `.scrollY(px)`            | `number`                       | `0`        | Set Y offset               |

### Events

| Method                   | Signature                  | Description         |
| ------------------------ | -------------------------- | ------------------- |
| `.onScroll(fn)`          | `(offset: {x, y}) => void` | Every offset change |
| `.onScrollEnd(fn)`       | `(offset: {x, y}) => void` | Momentum settled    |
| `.onScrollBeginDrag(fn)` | `() => void`               | User started drag   |
| `.onScrollEndDrag(fn)`   | `() => void`               | User lifted finger  |

### Programmatic

| Method                       | Description                        |
| ---------------------------- | ---------------------------------- |
| `.scrollTo(x, y, animated?)` | Animate/jump to offset             |
| `.controller`                | Access `ScrollController` instance |

### Visual

| Method                | Type                     | Description                     |
| --------------------- | ------------------------ | ------------------------------- |
| `.backgroundColor(c)` | `string`                 | Container background            |
| `.borderRadius(r)`    | `number \| BorderRadius` | Corner rounding                 |
| `.border(w, c)`       | `number, string`         | Border width + color            |
| `.shadow(s)`          | `ShadowProps`            | Drop shadow                     |
| `.clip()`             | `boolean`                | Clip children (default: `true`) |

### Layout (inherited from ComponentBase)

All standard layout modifiers: `.flex()`, `.width()`, `.height()`,
`.padding()`, `.margin()`, `.gap()`, `.alignItems()`, `.justifyContent()`, etc.

## Architecture

```
┌───────────────────────────────────┐
│   ScrollViewBuilder (component)   │ ← chainable API
├───────────────────────────────────┤
│   Touch wiring (onTouchStart →)   │ ← EventDispatch bubbles → ScrollController
├───────────────────────────────────┤
│   ScrollController (gestures)     │ ← touch → physics lifecycle
├───────────────────────────────────┤
│   ScrollPhysics (pure math)       │ ← deceleration, spring, rubber-band
│   VelocityTracker (estimation)    │ ← rolling-window weighted velocity
├───────────────────────────────────┤
│   SkiaNode type="scroll"          │ ← scrollX/scrollY props
├───────────────────────────────────┤
│   drawScroll (renderer)           │ ← save → clip → translate → cull → draw → restore
│   Yoga overflow:scroll (layout)   │ ← content sizing
└───────────────────────────────────┘
```

## Internal Details

### Touch Event Wiring

Scroll nodes receive touch events via the `EventDispatch` bubbling system:

1. Native sends raw touch → `EventDispatcher.handleTouch()`
2. `HitTest` finds frontmost touchable node (scroll nodes are touchable via `type === "scroll"` check)
3. Events fire on the hit target, then **bubble up** through ancestors
4. When they reach the scroll node, `onTouchStart` / `onTouchMove` / `onTouchEnd` handlers forward to `ScrollController`
5. `ScrollController` converts touches into scroll physics

### ScrollController Lifecycle

1. **Touch began** → cancel any animation, enter `Dragging` phase
2. **Touch moved** → compute delta, apply rubber-band if overscrolling, update `scrollX`/`scrollY`
3. **Touch ended** → compute fling velocity from `VelocityTracker`
   - If overscrolled → `Bouncing` (spring to boundary)
   - If paging enabled → `Snapping` (spring to nearest page)
   - If snap interval → `Snapping` (spring to nearest interval)
   - Otherwise → `Decelerating` (friction fling)
4. **Frame loop** → apply physics step per `__skiaRequestFrame` (vsync)
5. **Settled** → fire `onScrollEnd`, return to `Idle`

### Rendering & Viewport Culling

The `drawScroll` function uses **viewport culling** for performance — only children whose layout positions overlap the visible scroll window emit draw commands:

```
save()
clipRRect(viewport)             // GPU clip to scroll bounds
translate(-scrollX, -scrollY)   // shift children by offset
  for each child:
    if child outside viewport → skip   // JS-side viewport cull
    drawNode(child)                    // draw only visible children
restore()
```

| 100 items (no culling) | 100 items (viewport culling) |
| ---------------------- | ---------------------------- |
| ~33 FPS                | **60 FPS**                   |
| 100 draw calls/frame   | ~8-10 draw calls/frame       |
