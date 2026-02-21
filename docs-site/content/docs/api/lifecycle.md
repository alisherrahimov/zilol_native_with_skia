---
title: Lifecycle
description: Component lifecycle hooks — onMount, onCleanup, onLayout.
order: 6
---

## onMount

Runs after the component's SkiaNode is added to the tree and first paint has occurred. Return a cleanup function for unmount logic.

```typescript
function onMount(fn: () => void | (() => void)): void;
```

```typescript
function ChatScreen() {
  onMount(() => {
    const ws = new WebSocket("wss://...");

    return () => ws.close(); // cleanup on unmount
  });

  return View({
    /* ... */
  });
}
```

## onCleanup

Registers a cleanup function that runs when the component's scope is disposed.

```typescript
function onCleanup(fn: () => void): void;
```

```typescript
function Timer() {
  const count = signal(0);

  const id = setInterval(() => count.value++, 1000);
  onCleanup(() => clearInterval(id));

  return Text(() => `${count.value}s`);
}
```

## onLayout

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
function ResponsiveGrid() {
  const columns = signal(2);

  onLayout((layout) => {
    columns.value = layout.width > 600 ? 3 : 2;
  });

  return View().flexDirection("row").flexWrap("wrap").children([
    /* ... */
  ]);
}
```
