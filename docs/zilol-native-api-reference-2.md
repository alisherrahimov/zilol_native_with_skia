# Zilol Native — API Reference

## Table of Contents

1. [Reactive Primitives](#1-reactive-primitives)
2. [Control Flow](#2-control-flow)
3. [Lifecycle](#3-lifecycle)
4. [Components](#4-components)
5. [Styling](#5-styling)
6. [Animations](#6-animations)
7. [Gestures](#7-gestures)
8. [Navigation](#8-navigation)
9. [Platform](#9-platform)
10. [DevTools](#10-devtools)

---

## 1. Reactive Primitives

### signal

Creates a reactive value. Reading `.value` inside an `effect` or `computed` automatically tracks the dependency. Writing `.value` notifies all subscribers.

```typescript
function signal<T>(initialValue: T): Signal<T>;

interface Signal<T> {
  get value(): T;           // read — auto-tracks dependency
  set value(v: T);          // write — notifies subscribers
  peek(): T;                // read WITHOUT tracking
  subscribe(fn: (value: T) => void): Disposer;  // manual subscription
}

type Disposer = () => void;
```

```typescript
// Usage
const count = signal(0);
count.value;                // 0 (tracks if inside effect/computed)
count.peek();               // 0 (never tracks)
count.value = 5;            // notifies all subscribers
count.value++;              // read + write

const unsub = count.subscribe((v) => console.log(v));
unsub();                    // stop listening
```

---

### computed

Creates a derived reactive value. Lazy — only recalculates when read AND dependencies have changed. Cached — returns same value if dependencies haven't changed.

```typescript
function computed<T>(fn: () => T): Computed<T>;

interface Computed<T> {
  get value(): T;           // read — recalculates if dirty, auto-tracks
  peek(): T;                // read WITHOUT tracking
}
```

```typescript
// Usage
const count = signal(0);
const doubled = computed(() => count.value * 2);
const label = computed(() => `Count is ${doubled.value}`);

doubled.value;              // 0
count.value = 5;
doubled.value;              // 10
label.value;                // "Count is 10"
```

---

### effect

Runs a side-effect function whenever its dependencies change. Returns a disposer to stop the effect. The function runs immediately on creation to establish dependencies.

```typescript
function effect(fn: () => void | (() => void)): Disposer;
```

- If `fn` returns a function, it's used as cleanup (runs before re-execution and on dispose).
- Dependencies are automatically tracked on each execution.
- Re-runs synchronously when dependencies change (unless inside `batch`).

```typescript
// Usage
const name = signal("Alisher");

const dispose = effect(() => {
  console.log(`Hello ${name.value}`);
  // logs immediately: "Hello Alisher"
});

name.value = "John";
// logs: "Hello John"

dispose();
name.value = "Jane";
// nothing — effect is disposed

// With cleanup
const timer = effect(() => {
  const id = setInterval(() => console.log(count.value), 1000);
  return () => clearInterval(id);  // cleanup
});
```

---

### batch

Groups multiple signal writes into a single update. Effects only run once after the batch completes.

```typescript
function batch(fn: () => void): void;
```

```typescript
// Usage
const first = signal("John");
const last = signal("Doe");
const full = computed(() => `${first.value} ${last.value}`);

effect(() => console.log(full.value));
// logs: "John Doe"

batch(() => {
  first.value = "Jane";
  last.value = "Smith";
});
// logs ONCE: "Jane Smith"
// without batch, would log twice: "Jane Doe" then "Jane Smith"
```

---

### untrack

Reads signals without creating dependencies. Useful when you need a value but don't want the effect to re-run when it changes.

```typescript
function untrack<T>(fn: () => T): T;
```

```typescript
// Usage
const count = signal(0);
const name = signal("Alisher");

effect(() => {
  const currentName = name.value;         // tracked — effect re-runs when name changes
  const currentCount = untrack(() => count.value);  // NOT tracked
  console.log(`${currentName}: ${currentCount}`);
});

count.value = 10;   // effect does NOT re-run
name.value = "John"; // effect re-runs, reads latest count
```

---

### scope

Creates a reactive scope that tracks all signals, computeds, and effects created within it. Disposing the scope cleans up everything.

```typescript
function scope(fn: () => void): Disposer;
function scope<T>(fn: () => T): { value: T; dispose: Disposer };
```

Used internally by component system — each component runs inside its own scope.

```typescript
// Usage
const dispose = scope(() => {
  const count = signal(0);
  const doubled = computed(() => count.value * 2);
  effect(() => console.log(doubled.value));
});

dispose();
// All signals, computeds, effects created inside are cleaned up
```

---

### on

Explicitly declare dependencies instead of auto-tracking. Useful for controlling exactly when an effect re-runs.

```typescript
function on<T>(
  deps: () => T,
  fn: (value: T, prev: T | undefined) => void | (() => void),
  options?: { defer?: boolean }
): Disposer;
```

```typescript
// Usage
const count = signal(0);
const name = signal("Alisher");

// Only re-runs when count changes, even if fn reads name
on(
  () => count.value,
  (current, prev) => {
    console.log(`count: ${prev} → ${current}, name: ${name.value}`);
  }
);
```

---

## 2. Control Flow

### Show

Conditional rendering. Mounts/unmounts child subtree when condition changes.

```typescript
function Show<T>(props: {
  when: () => T | null | undefined | false;
  fallback?: () => SkiaNode;
  children: (value: T) => SkiaNode;
}): SkiaNode;
```

```typescript
// Usage
const user = signal<User | null>(null);

Show({
  when: () => user.value,
  fallback: () => Text({ text: "Loading..." }),
  children: (u) => Text({ text: () => u.name }),
});
```

---

### For

Keyed list rendering. Efficiently handles add/remove/reorder without re-rendering unchanged items.

```typescript
function For<T>(props: {
  each: () => T[];
  key: (item: T, index: number) => string | number;
  children: (item: () => T, index: () => number) => SkiaNode;
  fallback?: () => SkiaNode;
}): SkiaNode;
```

- `item` is a signal — updates when the item's data changes
- `index` is a signal — updates when the item's position changes
- `key` must be unique and stable across renders

```typescript
// Usage
const todos = signal<Todo[]>([]);

For({
  each: () => todos.value,
  key: (todo) => todo.id,
  fallback: () => Text({ text: "No items" }),
  children: (todo, index) =>
    View({
      backgroundColor: () => index() % 2 === 0 ? "#F5F5F5" : "#FFFFFF",
      children: [
        Text({ text: () => todo().title }),
        Text({ text: () => `#${index() + 1}`, color: "#999" }),
      ],
    }),
});
```

---

### Switch / Match

Multi-condition rendering.

```typescript
function Switch<T>(props: {
  value: () => T;
  cases: Record<string, () => SkiaNode>;
  default?: () => SkiaNode;
}): SkiaNode;
```

```typescript
// Usage
const status = signal<"loading" | "success" | "error">("loading");

Switch({
  value: () => status.value,
  cases: {
    loading: () => Text({ text: "Loading..." }),
    success: () => Text({ text: "Done!", color: "#00AA00" }),
    error: () => Text({ text: "Failed", color: "#FF0000" }),
  },
  default: () => Text({ text: "Unknown" }),
});
```

---

### Portal

Renders children at a different position in the SkiaNode tree (e.g., modals, toasts, overlays).

```typescript
function Portal(props: {
  target?: string;          // named portal target, defaults to root overlay
  children: () => SkiaNode;
}): SkiaNode;
```

```typescript
// Usage
Portal({
  children: () =>
    View({
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      children: [
        View({
          backgroundColor: "#FFFFFF",
          padding: 24,
          borderRadius: 12,
          children: [Text({ text: "Modal content" })],
        }),
      ],
    }),
});
```

---

## 3. Lifecycle

### onMount

Runs after the component's SkiaNode is added to the tree and first paint has occurred. Return a cleanup function for unmount.

```typescript
function onMount(fn: () => void | (() => void)): void;
```

```typescript
// Usage
function ChatScreen() {
  onMount(() => {
    const ws = new WebSocket("wss://...");
    return () => ws.close();  // cleanup on unmount
  });

  return View({ ... });
}
```

---

### onCleanup

Registers a cleanup function that runs when the component's scope is disposed.

```typescript
function onCleanup(fn: () => void): void;
```

```typescript
// Usage
function Timer() {
  const count = signal(0);

  const id = setInterval(() => count.value++, 1000);
  onCleanup(() => clearInterval(id));

  return Text({ text: () => `${count.value}s` });
}
```

---

### onLayout

Runs after Yoga calculates layout for this component's root node.

```typescript
function onLayout(fn: (layout: Layout) => void): void;

interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
  absoluteX: number;
  absoluteY: number;
}
```

```typescript
// Usage
function ResponsiveGrid() {
  const columns = signal(2);

  onLayout((layout) => {
    columns.value = layout.width > 600 ? 3 : 2;
  });

  return View({
    flexDirection: "row",
    flexWrap: "wrap",
    children: [/* ... */],
  });
}
```

---

## 4. Components

All components are plain TypeScript functions that return a `SkiaNode`. They run exactly **once** — reactive bindings handle updates.

**Prop convention:**
- Static value: `fontSize: 24`
- Reactive value: `fontSize: () => size.value`
- Event handler: `onPress: () => count.value++`

---

### View

Container element. Maps to a rounded rectangle with optional background, border, shadow, and clipping.

```typescript
function View(props: ViewProps): SkiaNode;

interface ViewProps extends LayoutProps, StyleProps {
  children?: SkiaNode | SkiaNode[];
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
  accessible?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string | (() => string);
}
```

---

### Text

Text element. Uses Skia Paragraph API for rendering.

```typescript
function Text(props: TextProps): SkiaNode;

interface TextProps extends LayoutProps {
  text: string | (() => string);
  color?: string | (() => string);
  fontSize?: number | (() => number);
  fontFamily?: string;
  fontWeight?: FontWeight | (() => FontWeight);
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  maxLines?: number;
  ellipsis?: string;                    // default: "..."
  selectable?: boolean;
  accessibilityRole?: AccessibilityRole;
}

type FontWeight = "normal" | "bold" | "100" | "200" | "300" | "400"
               | "500" | "600" | "700" | "800" | "900";
```

---

### Image

Image element with async loading, caching, and resize modes.

```typescript
function Image(props: ImageProps): SkiaNode;

interface ImageProps extends LayoutProps, StyleProps {
  source: ImageSource | (() => ImageSource);
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  placeholder?: string;                 // color or blur hash
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fadeDuration?: number;                // ms, default: 300
}

type ImageSource =
  | { uri: string; headers?: Record<string, string> }
  | { require: number }                 // bundled asset
  | { skImage: SkImage };               // pre-decoded
```

---

### Pressable

Touchable wrapper with press states.

```typescript
function Pressable(props: PressableProps): SkiaNode;

interface PressableProps extends ViewProps {
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  disabled?: boolean | (() => boolean);
  hitSlop?: number | Insets;
  pressedStyle?: StyleProps;            // applied while pressed
  child: SkiaNode;
}

interface Insets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}
```

---

### ScrollView

Scrollable container with platform-specific physics.

```typescript
function ScrollView(props: ScrollViewProps): SkiaNode;

interface ScrollViewProps extends ViewProps {
  horizontal?: boolean;
  showsScrollIndicator?: boolean;
  bounces?: boolean;                    // iOS rubber band
  decelerationRate?: "normal" | "fast" | number;
  snapToInterval?: number;
  snapToAlignment?: "start" | "center" | "end";
  contentContainerStyle?: StyleProps;
  onScroll?: (offset: { x: number; y: number }) => void;
  onScrollEnd?: (offset: { x: number; y: number }) => void;
  scrollEnabled?: boolean | (() => boolean);
  initialScrollOffset?: { x?: number; y?: number };
  keyboardDismissMode?: "none" | "on-drag" | "interactive";
}
```

---

### FlatList

Virtualized list with recycling.

```typescript
function FlatList<T>(props: FlatListProps<T>): SkiaNode;

interface FlatListProps<T> extends ScrollViewProps {
  data: () => T[];
  renderItem: (item: () => T, index: () => number) => SkiaNode;
  keyExtractor: (item: T, index: number) => string;
  itemHeight: number | ((index: number) => number);
  overscan?: number;                    // extra items above/below viewport, default: 5
  onEndReached?: () => void;
  onEndReachedThreshold?: number;       // 0-1, default: 0.5
  ListHeaderComponent?: () => SkiaNode;
  ListFooterComponent?: () => SkiaNode;
  ListEmptyComponent?: () => SkiaNode;
  ItemSeparatorComponent?: () => SkiaNode;
  estimatedItemSize?: number;           // for variable height lists
}
```

---

### TextInput

Native text input (platform view island).

```typescript
function TextInput(props: TextInputProps): SkiaNode;

interface TextInputProps extends LayoutProps, StyleProps {
  value?: string | (() => string);
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  placeholderColor?: string;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad" | "url";
  returnKeyType?: "done" | "go" | "next" | "search" | "send";
  editable?: boolean | (() => boolean);
  selectTextOnFocus?: boolean;
}
```

---

### ActivityIndicator

Loading spinner drawn with Skia.

```typescript
function ActivityIndicator(props: ActivityIndicatorProps): SkiaNode;

interface ActivityIndicatorProps extends LayoutProps {
  size?: "small" | "large" | number;
  color?: string | (() => string);
  animating?: boolean | (() => boolean);
}
```

---

### Canvas

Raw Skia canvas for custom drawing.

```typescript
function Canvas(props: CanvasProps): SkiaNode;

interface CanvasProps extends LayoutProps {
  onDraw: (ctx: DrawContext, layout: Layout) => void;
  redrawTrigger?: () => any;            // reactive — redraws when this changes
}
```

```typescript
// Usage
const progress = signal(0.5);

Canvas({
  width: 200,
  height: 200,
  redrawTrigger: () => progress.value,
  onDraw: (ctx, layout) => {
    ctx.drawArc(
      0, 0, layout.width, layout.height,
      -90, 360 * progress.value,
      { color: "#0066FF" }
    );
  },
});
```

---

## 5. Styling

### LayoutProps

All layout properties mapped to Yoga.

```typescript
interface LayoutProps {
  // Dimensions
  width?: DimensionValue;
  height?: DimensionValue;
  minWidth?: DimensionValue;
  minHeight?: DimensionValue;
  maxWidth?: DimensionValue;
  maxHeight?: DimensionValue;

  // Flex
  flex?: number;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: DimensionValue;

  // Alignment
  alignItems?: AlignValue;
  alignSelf?: AlignValue;
  alignContent?: AlignValue;
  justifyContent?: "flex-start" | "flex-end" | "center"
                 | "space-between" | "space-around" | "space-evenly";

  // Spacing
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginHorizontal?: number;
  marginVertical?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  gap?: number;
  rowGap?: number;
  columnGap?: number;

  // Position
  position?: "relative" | "absolute";
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;

  // Overflow
  overflow?: "visible" | "hidden" | "scroll";

  // Aspect
  aspectRatio?: number;

  // Display
  display?: "flex" | "none";
}

type DimensionValue = number | `${number}%` | "auto";
type AlignValue = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
```

---

### StyleProps

Visual styling properties rendered by Skia.

```typescript
interface StyleProps {
  // Background
  backgroundColor?: string | (() => string);

  // Border
  borderWidth?: number | (() => number);
  borderColor?: string | (() => string);
  borderRadius?: number | (() => number);
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderStyle?: "solid" | "dashed" | "dotted";

  // Shadow
  shadowColor?: string | (() => string);
  shadowOffset?: { width: number; height: number };
  shadowRadius?: number | (() => number);
  shadowOpacity?: number | (() => number);
  elevation?: number | (() => number);

  // Transform
  transform?: TransformValue | (() => TransformValue);
  transformOrigin?: TransformOrigin;

  // Opacity
  opacity?: number | (() => number);

  // Gradient (Skia-specific)
  gradient?: GradientValue | (() => GradientValue);

  // Blur (Skia-specific)
  blur?: number | (() => number);
  backdropBlur?: number | (() => number);

  // Blend mode (Skia-specific)
  blendMode?: SkBlendMode;
}

type TransformValue = Array<
  | { translateX: number }
  | { translateY: number }
  | { scale: number }
  | { scaleX: number }
  | { scaleY: number }
  | { rotate: string }       // "45deg" or "0.785rad"
  | { skewX: string }
  | { skewY: string }
  | { matrix: number[] }     // 4x4 matrix
>;

type TransformOrigin = {
  x?: number | `${number}%`;   // default: "50%"
  y?: number | `${number}%`;   // default: "50%"
};

interface GradientValue {
  type: "linear" | "radial" | "sweep";
  colors: string[];
  positions?: number[];        // 0-1, must match colors.length
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  center?: { x: number; y: number };
  radius?: number;
}
```

---

## 6. Animations

All animation functions return a `Signal<number>` that updates on each frame.

### withSpring

Spring physics animation.

```typescript
function withSpring(
  target: Signal<number>,
  toValue: number,
  config?: SpringConfig
): AnimationHandle;

interface SpringConfig {
  damping?: number;             // default: 10
  mass?: number;                // default: 1
  stiffness?: number;           // default: 100
  overshootClamping?: boolean;  // default: false
  restDisplacementThreshold?: number;   // default: 0.01
  restSpeedThreshold?: number;          // default: 2
  velocity?: number;            // initial velocity
}

interface AnimationHandle {
  stop: () => void;
  finished: Promise<boolean>;   // true if completed, false if cancelled
}
```

```typescript
// Usage
const translateX = signal(0);
const handle = withSpring(translateX, 300, { damping: 15, stiffness: 120 });

// Later
handle.stop();

// Or await
const completed = await handle.finished;
```

---

### withTiming

Duration-based animation with easing.

```typescript
function withTiming(
  target: Signal<number>,
  toValue: number,
  config?: TimingConfig
): AnimationHandle;

interface TimingConfig {
  duration?: number;            // ms, default: 300
  easing?: EasingFunction;     // default: Easing.inOut(Easing.ease)
  delay?: number;               // ms, default: 0
}
```

---

### withDecay

Momentum-based decay animation (e.g., fling scroll).

```typescript
function withDecay(
  target: Signal<number>,
  config?: DecayConfig
): AnimationHandle;

interface DecayConfig {
  velocity: number;             // initial velocity (required)
  deceleration?: number;        // default: 0.998
  clamp?: [number, number];     // min/max bounds
}
```

---

### withSequence

Run animations in sequence.

```typescript
function withSequence(
  target: Signal<number>,
  animations: Array<{
    toValue: number;
    type: "spring" | "timing" | "decay";
    config?: SpringConfig | TimingConfig | DecayConfig;
  }>
): AnimationHandle;
```

```typescript
// Usage — bounce effect
withSequence(scale, [
  { toValue: 1.2, type: "timing", config: { duration: 100 } },
  { toValue: 0.9, type: "timing", config: { duration: 100 } },
  { toValue: 1.0, type: "spring", config: { damping: 8 } },
]);
```

---

### withRepeat

Repeat an animation.

```typescript
function withRepeat(
  target: Signal<number>,
  animation: { toValue: number; type: "spring" | "timing"; config?: any },
  config?: RepeatConfig
): AnimationHandle;

interface RepeatConfig {
  iterations?: number;          // default: Infinity
  reverse?: boolean;            // ping-pong, default: true
}
```

---

### interpolate

Map a signal value from one range to another.

```typescript
function interpolate(
  value: () => number,
  inputRange: number[],
  outputRange: number[],
  extrapolate?: ExtrapolateConfig
): Computed<number>;

interface ExtrapolateConfig {
  left?: "extend" | "clamp" | "identity";
  right?: "extend" | "clamp" | "identity";
}
```

```typescript
// Usage
const scrollY = signal(0);
const headerOpacity = interpolate(
  () => scrollY.value,
  [0, 100],
  [1, 0],
  { right: "clamp" }
);

View({ opacity: () => headerOpacity.value });
```

---

### Easing

Built-in easing functions.

```typescript
namespace Easing {
  const linear: EasingFunction;
  const ease: EasingFunction;
  const quad: EasingFunction;
  const cubic: EasingFunction;
  const sin: EasingFunction;
  const circle: EasingFunction;
  const exp: EasingFunction;
  const elastic: (bounciness?: number) => EasingFunction;
  const back: (overshoot?: number) => EasingFunction;
  const bounce: EasingFunction;
  const bezier: (x1: number, y1: number, x2: number, y2: number) => EasingFunction;

  function in(easing: EasingFunction): EasingFunction;
  function out(easing: EasingFunction): EasingFunction;
  function inOut(easing: EasingFunction): EasingFunction;
}

type EasingFunction = (t: number) => number;    // t: 0→1, returns 0→1
```

---

## 7. Gestures

### Gesture Recognizers

```typescript
// Tap
function tapGesture(config: TapConfig): GestureRecognizer;

interface TapConfig {
  onTap: (event: TapEvent) => void;
  numberOfTaps?: number;            // default: 1
  maxDuration?: number;             // ms
  maxDistance?: number;              // px movement tolerance
}

interface TapEvent {
  x: number;                        // local coordinates
  y: number;
  absoluteX: number;
  absoluteY: number;
}
```

```typescript
// Pan
function panGesture(config: PanConfig): GestureRecognizer;

interface PanConfig {
  onStart?: (event: PanEvent) => void;
  onUpdate: (event: PanEvent) => void;
  onEnd?: (event: PanEvent) => void;
  minDistance?: number;              // activation threshold, default: 10
  activeOffsetX?: number | [number, number];
  activeOffsetY?: number | [number, number];
  failOffsetX?: number | [number, number];
  failOffsetY?: number | [number, number];
  minPointers?: number;
  maxPointers?: number;
  enabled?: () => boolean;
}

interface PanEvent {
  translationX: number;
  translationY: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
  absoluteX: number;
  absoluteY: number;
}
```

```typescript
// Pinch
function pinchGesture(config: PinchConfig): GestureRecognizer;

interface PinchConfig {
  onStart?: (event: PinchEvent) => void;
  onUpdate: (event: PinchEvent) => void;
  onEnd?: (event: PinchEvent) => void;
}

interface PinchEvent {
  scale: number;
  focalX: number;
  focalY: number;
  velocity: number;
}
```

```typescript
// Rotation
function rotationGesture(config: RotationConfig): GestureRecognizer;

interface RotationConfig {
  onStart?: (event: RotationEvent) => void;
  onUpdate: (event: RotationEvent) => void;
  onEnd?: (event: RotationEvent) => void;
}

interface RotationEvent {
  rotation: number;                  // radians
  velocity: number;
  anchorX: number;
  anchorY: number;
}
```

```typescript
// Long Press
function longPressGesture(config: LongPressConfig): GestureRecognizer;

interface LongPressConfig {
  onStart: (event: TapEvent) => void;
  onEnd?: (event: TapEvent) => void;
  minDuration?: number;              // ms, default: 500
  maxDistance?: number;               // px movement tolerance
}
```

```typescript
// Fling
function flingGesture(config: FlingConfig): GestureRecognizer;

interface FlingConfig {
  onFling: (event: FlingEvent) => void;
  direction: "left" | "right" | "up" | "down";
  numberOfPointers?: number;
}

interface FlingEvent {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}
```

### Gesture Composition

```typescript
// Both gestures can be active at the same time
function simultaneousGesture(
  ...gestures: GestureRecognizer[]
): GestureRecognizer;

// First gesture that activates wins, others are cancelled
function exclusiveGesture(
  ...gestures: GestureRecognizer[]
): GestureRecognizer;

// Second gesture only starts after first succeeds
function sequentialGesture(
  first: GestureRecognizer,
  second: GestureRecognizer
): GestureRecognizer;
```

### GestureDetector

Attaches gesture recognizers to a SkiaNode.

```typescript
function GestureDetector(props: {
  gesture: GestureRecognizer;
  child: SkiaNode;
}): SkiaNode;
```

```typescript
// Usage — pinch to zoom + pan
const scale = signal(1);
const translateX = signal(0);
const translateY = signal(0);

const pinch = pinchGesture({
  onUpdate: (e) => scale.value = e.scale,
});

const pan = panGesture({
  onUpdate: (e) => {
    translateX.value = e.translationX;
    translateY.value = e.translationY;
  },
});

GestureDetector({
  gesture: simultaneousGesture(pinch, pan),
  child: Image({
    source: { uri: "https://..." },
    transform: () => [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }),
});
```

---

## 8. Navigation

### createNavigation

Creates a navigation container.

```typescript
function createNavigation(config: NavigationConfig): Navigation;

interface NavigationConfig {
  screens: Record<string, ComponentFunction>;
  initialScreen: string;
  screenOptions?: ScreenOptions;
}

interface ScreenOptions {
  transition?: "slide" | "fade" | "none";
  transitionDuration?: number;
  headerShown?: boolean;
  gestureEnabled?: boolean;        // swipe back on iOS
}

interface Navigation {
  push: (screen: string, params?: Record<string, any>) => void;
  pop: () => void;
  popToRoot: () => void;
  replace: (screen: string, params?: Record<string, any>) => void;
  navigate: (screen: string, params?: Record<string, any>) => void;
  currentScreen: Computed<string>;
  canGoBack: Computed<boolean>;
  params: <T>() => T;
}
```

```typescript
// Usage
const nav = createNavigation({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
  },
  initialScreen: "Home",
  screenOptions: {
    transition: "slide",
    gestureEnabled: true,
  },
});

// Inside a component
function HomeScreen() {
  return View({
    children: [
      Pressable({
        onPress: () => nav.push("Profile", { userId: "123" }),
        child: Text({ text: "Go to Profile" }),
      }),
    ],
  });
}

function ProfileScreen() {
  const params = nav.params<{ userId: string }>();

  return View({
    children: [
      Text({ text: () => `User: ${params.userId}` }),
      Pressable({
        onPress: () => nav.pop(),
        child: Text({ text: "Go back" }),
      }),
    ],
  });
}
```

---

### createTabNavigation

Tab-based navigation.

```typescript
function createTabNavigation(config: TabConfig): TabNavigation;

interface TabConfig {
  tabs: Record<string, {
    screen: ComponentFunction;
    icon: (active: () => boolean) => SkiaNode;
    label?: string;
  }>;
  initialTab: string;
  tabBarPosition?: "bottom" | "top";
  tabBarStyle?: StyleProps;
}

interface TabNavigation {
  switchTo: (tab: string) => void;
  currentTab: Computed<string>;
}
```

---

## 9. Platform

### Platform detection

```typescript
namespace Platform {
  const OS: "ios" | "android";
  const version: number;             // OS version number
  const isTV: boolean;

  function select<T>(specifics: {
    ios?: T;
    android?: T;
    default?: T;
  }): T;
}
```

---

### StatusBar

```typescript
function setStatusBar(config: StatusBarConfig): void;

interface StatusBarConfig {
  style?: "light" | "dark" | "auto";
  backgroundColor?: string;          // Android only
  hidden?: boolean;
  animated?: boolean;
  translucent?: boolean;             // Android only
}
```

---

### Dimensions

```typescript
namespace Dimensions {
  function get(): ScreenDimensions;
  function onChange(fn: (dims: ScreenDimensions) => void): Disposer;
}

interface ScreenDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}
```

---

### Keyboard

```typescript
namespace Keyboard {
  function onShow(fn: (height: number) => void): Disposer;
  function onHide(fn: () => void): Disposer;
  function dismiss(): void;
  const isVisible: Computed<boolean>;
  const height: Computed<number>;
}
```

---

### Clipboard

```typescript
namespace Clipboard {
  function getString(): Promise<string>;
  function setString(text: string): void;
  function hasString(): Promise<boolean>;
}
```

---

### Haptics

```typescript
namespace Haptics {
  function impact(style?: "light" | "medium" | "heavy"): void;
  function notification(type?: "success" | "warning" | "error"): void;
  function selection(): void;
}
```

---

## 10. DevTools

### enableDevTools

Enable the development overlay and inspector.

```typescript
function enableDevTools(config?: DevToolsConfig): void;

interface DevToolsConfig {
  showPerfOverlay?: boolean;        // FPS, frame time, node count
  showDamageRects?: boolean;        // red rectangles around redrawn areas
  showNodeBorders?: boolean;        // outline all SkiaNodes
  showSignalGraph?: boolean;        // signal dependency visualization
  logSignalUpdates?: boolean;       // console.log every signal write
  logEffectRuns?: boolean;          // console.log every effect execution
}
```

---

### inspect

Get runtime information about a SkiaNode.

```typescript
function inspect(node: SkiaNode): NodeInfo;

interface NodeInfo {
  type: string;
  props: Record<string, any>;
  layout: Layout;
  children: number;
  signalBindings: number;           // how many reactive props
  dirty: boolean;
  depth: number;
  memoryBytes: number;
}
```

---

### getStats

Get global framework statistics.

```typescript
function getStats(): FrameworkStats;

interface FrameworkStats {
  totalNodes: number;
  dirtyNodes: number;
  totalSignals: number;
  totalEffects: number;
  totalComputeds: number;
  frameTime: number;                // last frame total ms
  layoutTime: number;               // last frame Yoga ms
  drawTime: number;                 // last frame Skia ms
  damageRectCount: number;
  damageRectArea: number;           // total px²
  nodePoolSize: number;
  imagesCached: number;
  memoryUsage: number;              // estimated bytes
}
```

---

## Type Glossary

```typescript
// Core
type SkiaNode = { /* internal */ };
type ComponentFunction = (props?: any) => SkiaNode;
type Disposer = () => void;

// Accessibility
type AccessibilityRole =
  | "none" | "button" | "link" | "header" | "text"
  | "image" | "search" | "checkbox" | "radio"
  | "slider" | "tab" | "list" | "timer"
  | "adjustable" | "imagebutton" | "summary";

// Drawing (zilol-native's own abstraction — no Skia imports needed)
interface DrawContext {
  drawRect(x: number, y: number, w: number, h: number, style: DrawStyle): void;
  drawCircle(cx: number, cy: number, r: number, style: DrawStyle): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, style: DrawStyle): void;
  drawPath(path: Path, style: DrawStyle): void;
  drawArc(x: number, y: number, w: number, h: number,
          startAngle: number, sweepAngle: number, style: DrawStyle): void;
  drawText(text: string, x: number, y: number, style: TextDrawStyle): void;
  save(): void;
  restore(): void;
  clipRect(x: number, y: number, w: number, h: number): void;
  translate(x: number, y: number): void;
  rotate(degrees: number): void;
  scale(sx: number, sy: number): void;
}

interface DrawStyle {
  color: string;
  strokeWidth?: number;
  fill?: boolean;               // default: true
  opacity?: number;
  blendMode?: BlendMode;
}

interface TextDrawStyle {
  color: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
}

type BlendMode =
  | "srcOver" | "multiply" | "screen" | "overlay"
  | "darken" | "lighten" | "colorDodge" | "colorBurn"
  | "hardLight" | "softLight" | "difference" | "exclusion";
```
