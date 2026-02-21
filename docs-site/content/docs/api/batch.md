---
title: batch()
description: Group multiple signal writes into a single update to avoid intermediate re-renders.
order: 4
---

## Overview

`batch()` groups multiple signal writes into a single update. Effects only run once after the batch completes — avoiding unnecessary intermediate updates and redraws.

## API

```typescript
function batch(fn: () => void): void;
```

## Usage

```typescript
import { signal, computed, effect, batch } from "@zilol-native/runtime";

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
// without batch, would log twice:
//   "Jane Doe" then "Jane Smith"
```

## Auto-Batching

Event handlers are automatically batched — all signal writes within a single event handler are grouped:

```typescript
function Counter() {
  const count = signal(0);
  const total = signal(0);

  // Inside onPress, both writes are auto-batched
  return Pressable(() => {
    count.value++;
    total.value += 2;
    // effects run ONCE after this handler completes
  });
}
```

## Nested Batches

Batches can be nested. Effects only run after the outermost batch completes:

```typescript
batch(() => {
  first.value = "Jane";
  batch(() => {
    last.value = "Smith";
    age.value = 30;
  });
  // effects haven't run yet
  city.value = "Tashkent";
});
// NOW all effects run once
```
