---
title: Control Flow
description: Primitives for conditional rendering, list rendering, and multi-condition matching.
order: 5
---

## Show

Conditional rendering. Mounts/unmounts the child subtree when the condition changes.

```typescript
function Show<T>(props: {
  when: () => T | null | undefined | false;
  fallback?: () => SkiaNode;
  children: (value: T) => SkiaNode;
}): SkiaNode;
```

```typescript
const user = signal<User | null>(null);

Show({
  when: () => user.value,
  fallback: () => Text("Loading..."),
  children: (u) => Text(() => u.name),
});
```

`Show` creates a **marker node** in the SkiaNode tree. When the condition changes, it swaps the child subtree. This is explicit — not hidden behind a diffing algorithm.

## For

Keyed list rendering. Efficiently handles add/remove/reorder without re-rendering unchanged items.

```typescript
function For<T>(props: {
  each: () => T[];
  key: (item: T, index: number) => string | number;
  children: (item: () => T, index: () => number) => SkiaNode;
  fallback?: () => SkiaNode;
}): SkiaNode;
```

```typescript
const todos = signal<Todo[]>([]);

For({
  each: () => todos.value,
  key: (todo) => todo.id,
  fallback: () => Text("No items"),
  children: (todo, index) =>
    View()
      .backgroundColor(() => (index() % 2 === 0 ? "#F5F5F5" : "#FFFFFF"))
      .children([
        Text(() => todo().title),
        Text(() => `#${index() + 1}`).color("#999"),
      ]),
});
```

- `item` is a signal — updates when the item data changes
- `index` is a signal — updates when the item position changes
- `key` must be unique and stable

## Switch

Multi-condition rendering.

```typescript
function Switch<T>(props: {
  value: () => T;
  cases: Record<string, () => SkiaNode>;
  default?: () => SkiaNode;
}): SkiaNode;
```

```typescript
const status = signal<"loading" | "success" | "error">("loading");

Switch({
  value: () => status.value,
  cases: {
    loading: () => Text("Loading..."),
    success: () => Text("Done!").color("#00AA00"),
    error: () => Text("Failed").color("#FF0000"),
  },
  default: () => Text("Unknown"),
});
```

## Portal

Renders children at a different position in the SkiaNode tree — useful for modals, toasts, and overlays.

```typescript
function Portal(props: { target?: string; children: () => SkiaNode }): SkiaNode;
```

```typescript
Portal({
  children: () =>
    View()
      .position("absolute")
      .inset(0)
      .backgroundColor("rgba(0,0,0,0.5)")
      .children([
        View()
          .backgroundColor("#FFFFFF")
          .padding(24)
          .borderRadius(12)
          .children([Text("Modal content")]),
      ]),
});
```
