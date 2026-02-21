---
title: Hot Reload
description: How Zilol Native preserves state during hot reload — signal-aware HMR with ~30-80ms update times.
order: 1
---

## The Challenge

In React, hot reload is straightforward — re-run the component function, diff the VDOM, patch. Since components re-execute on every render anyway, hot reload is just another re-render.

In Zilol Native, components run **once** and set up reactive bindings. There's no re-render. So how do you update a component when the developer changes its code?

## Strategy

```
File saves → SWC recompiles (~10ms)
  → Runtime receives new component factory
  → For each instance:
    1. Snapshot signal values
    2. Dispose old reactive scope
    3. Detach old SkiaNode subtree
    4. Re-run component with preserved signals
    5. Attach new SkiaNode subtree
    6. Mark dirty → next frame redraws
```

## Signal Preservation

The SWC plugin injects stable IDs into signal calls based on variable names:

```typescript
// What you write:
const count = signal(0);
const name = signal("Alisher");

// What SWC outputs:
const count = signal(0, "Counter:count");
const name = signal("Alisher", "Counter:name");
```

During hot reload, signals with matching IDs preserve their values. New signals get their initial value. Removed signals are cleaned up.

## What Can Hot Reload?

| Change Type            | Hot Reload? | Notes                     |
| ---------------------- | ----------- | ------------------------- |
| Style prop change      | ✅ Yes      | New tree picks it up      |
| Computed/effect logic  | ✅ Yes      | Old disposed, new created |
| Add/remove signal      | ✅ Yes      | Named matching handles it |
| Add/remove child node  | ✅ Yes      | New tree structure        |
| Rename signal variable | ⚠️ Partial  | Signal resets to initial  |
| Global signal stores   | ❌ No       | Full reload needed        |
| Native code changes    | ❌ No       | Full rebuild needed       |

## Performance

The full pipeline from file save to pixels updated takes **~30-80ms** — imperceptible to the developer:

- SWC recompilation: ~10ms
- WebSocket transfer: ~5ms
- ComponentRegistry.update: ~5-15ms
- Skia redraw: ~1-2ms (next vsync)

In production builds, all HMR code is stripped via dead code elimination (`__DEV__` is `false`). Zero runtime cost.
