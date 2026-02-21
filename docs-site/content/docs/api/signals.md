---
title: signal()
description: Create reactive values that automatically track dependencies and notify subscribers when changed.
order: 1
---

## Overview

`signal()` creates an atomic reactive value. Reading `.value` inside an `effect` or `computed` automatically tracks the dependency. Writing `.value` notifies all subscribers.

## API

```typescript
function signal<T>(initialValue: T): Signal<T>;

interface Signal<T> {
  get value(): T; // read — auto-tracks dependency
  set value(v: T); // write — notifies subscribers
  peek(): T; // read WITHOUT tracking
  subscribe(fn: (value: T) => void): Disposer;
}

type Disposer = () => void;
```

## Basic Usage

```typescript
import { signal } from "@zilol-native/runtime";

const count = signal(0);

// Reading
count.value; // 0 (tracks if inside effect/computed)
count.peek(); // 0 (never tracks)

// Writing
count.value = 5; // notifies all subscribers
count.value++; // read + write
```

## Manual Subscription

```typescript
const name = signal("Alisher");

const unsub = name.subscribe((newValue) => {
  console.log(`Name changed to: ${newValue}`);
});

name.value = "John"; // logs: "Name changed to: John"
unsub(); // stop listening
```

## Reactive Bindings

When used in component props, signals create efficient reactive bindings:

```typescript
const count = signal(0);

// STATIC: set once, never changes — no overhead
Text("Hello").fontSize(24);

// REACTIVE: function wrapper — creates effect that updates SkiaNode
Text(() => `Count: ${count.value}`).fontSize(24);
```

The framework distinguishes static vs reactive props at creation time. Only reactive props (function wrappers) create effects.

## Memory Management

Signals created inside a component scope are automatically cleaned up when the component unmounts:

```typescript
function MyComponent() {
  const count = signal(0); // cleaned up on unmount
  // ...
}
```

No manual cleanup needed — the reactive scope handles it.
