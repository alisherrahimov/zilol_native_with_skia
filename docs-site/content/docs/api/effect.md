---
title: effect()
description: Run side effects that automatically re-execute when their reactive dependencies change.
order: 3
---

## Overview

`effect()` runs a side-effect function whenever its dependencies change. It runs immediately on creation to establish dependencies, and returns a disposer to stop the effect.

## API

```typescript
function effect(fn: () => void | (() => void)): Disposer;
```

If `fn` returns a function, it's used as a cleanup function — it runs before re-execution and on dispose.

## Basic Usage

```typescript
import { signal, effect } from "@zilol-native/runtime";

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
```

## Cleanup Functions

Return a cleanup function for resource management:

```typescript
const count = signal(0);

const dispose = effect(() => {
  const id = setInterval(() => console.log(count.value), 1000);
  return () => clearInterval(id); // cleanup
});

// When effect re-runs or disposes,
// the interval is properly cleaned up
```

## Automatic Dependency Tracking

Effects track any signal or computed read during execution:

```typescript
const showDetails = signal(false);
const name = signal("Alisher");
const bio = signal("Developer");

effect(() => {
  console.log(name.value); // always tracked
  if (showDetails.value) {
    console.log(bio.value); // only tracked when showDetails is true
  }
});
```

Dependencies are re-established on each execution, so conditional reads are handled correctly.

## In Components

Effects are the bridge between signals and SkiaNode props:

```typescript
function MyComponent() {
  const color = signal("#2196F3");

  const node = createViewNode();

  // This effect runs whenever color changes,
  // updating only this specific SkiaNode prop
  effect(() => {
    node.setProp("backgroundColor", color.value);
  });

  return node;
}
```
