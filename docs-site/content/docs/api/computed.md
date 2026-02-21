---
title: computed()
description: Create derived reactive values that lazily recalculate when dependencies change.
order: 2
---

## Overview

`computed()` creates a derived reactive value. It's lazy — only recalculates when read AND dependencies have changed. Cached — returns the same value if nothing changed.

## API

```typescript
function computed<T>(fn: () => T): Computed<T>;

interface Computed<T> {
  get value(): T; // recalculates if dirty, auto-tracks
  peek(): T; // read WITHOUT tracking
}
```

## Usage

```typescript
import { signal, computed } from "@zilol-native/runtime";

const count = signal(0);
const doubled = computed(() => count.value * 2);
const label = computed(() => `Count is ${doubled.value}`);

doubled.value; // 0
count.value = 5;
doubled.value; // 10
label.value; // "Count is 10"
```

## Lazy Evaluation

Computed values don't recalculate immediately when dependencies change — only when their `.value` is read:

```typescript
const count = signal(0);
const expensive = computed(() => {
  console.log("computing...");
  return heavyCalculation(count.value);
});

count.value = 1; // nothing happens yet
count.value = 2; // still nothing — computed is lazy
expensive.value; // NOW "computing..." logs, returns result for count=2
expensive.value; // cached — no recomputation
```

## Chaining

Computeds can depend on other computeds:

```typescript
const width = signal(100);
const height = signal(50);
const area = computed(() => width.value * height.value);
const label = computed(() => `Area: ${area.value}px²`);
```

The dependency graph is automatically maintained and topologically sorted to prevent glitches.
