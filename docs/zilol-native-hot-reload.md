# Zilol Native — Hot Reload System

## The Problem

In React, hot reload is "easy" — re-run the component function, diff the VDOM, patch. Since components re-execute on every render anyway, hot reload is just another re-render.

In zilol-native, components run **once** and set up reactive bindings. There's no re-render. So how do you update a component when the developer changes its code?

---

## What Needs to Survive

```typescript
// Developer changes this file and saves:
function Counter() {
  const count = signal(0);          // ← state must SURVIVE reload
  const doubled = computed(() => count.value * 2);

  return View({
    backgroundColor: "#FF0000",     // ← developer changes to "#0000FF"
    children: [
      Text({ text: () => `${count.value}` }),  // ← must keep showing current count
      Pressable({
        onPress: () => count.value++,
        child: Text({ text: "Increment" }),
      }),
    ],
  });
}
```

After hot reload:
- `count` should still be `7` (or whatever it was)
- Background should change to blue
- Effects/computeds should use the new logic
- SkiaNode tree should reflect the new structure

---

## Strategy

```
File change detected
        │
        ▼
  SWC recompiles ONLY the changed file (~10ms)
        │
        ▼
  Runtime receives new component factory function
        │
        ▼
  For each INSTANCE of that component:
        │
        ├── 1. Snapshot signal values (preserve state)
        ├── 2. Dispose old reactive scope (kill effects, computeds)
        ├── 3. Detach old SkiaNode subtree
        ├── 4. Re-run component function with preserved signals
        ├── 5. Attach new SkiaNode subtree
        └── 6. Mark dirty → next frame redraws
```

---

## Component Registry

Every component is registered with a unique ID (derived from file path + function name). The runtime tracks all live instances.

```typescript
class ComponentRegistry {
  // componentId → factory function
  private factories: Map<string, ComponentFunction> = new Map();

  // componentId → all live instances
  private instances: Map<string, ComponentInstance[]> = new Map();

  register(id: string, factory: ComponentFunction) {
    this.factories.set(id, factory);
  }

  // Called by hot reload when a file changes
  update(id: string, newFactory: ComponentFunction) {
    this.factories.set(id, newFactory);

    const instances = this.instances.get(id) ?? [];
    for (const instance of instances) {
      this.remount(instance, newFactory);
    }
  }

  private remount(instance: ComponentInstance, newFactory: ComponentFunction) {
    // 1. Snapshot: extract all top-level signals and their values
    const signalSnapshot = instance.scope.getSignals();

    // 2. Dispose: kill all effects, computeds, cleanup functions
    instance.scope.dispose();

    // 3. Detach: remove old SkiaNode subtree from parent
    const parent = instance.rootNode.parent;
    const index = parent.children.indexOf(instance.rootNode);
    parent.removeChild(instance.rootNode);

    // 4. Re-run: execute new factory with preserved signals
    const newScope = scope(() => {
      injectSignals(signalSnapshot);
      instance.rootNode = newFactory(instance.props);
    });
    instance.scope = newScope;

    // 5. Attach: insert new subtree at same position
    parent.insertChild(instance.rootNode, index);

    // 6. Dirty: schedule redraw
    instance.rootNode.markDirty('children');
  }
}
```

---

## Signal Preservation

The tricky question: how does the runtime know which signals from the old code correspond to which signals in the new code?

### Variable Name Extraction (SWC Plugin)

The SWC plugin (~50 lines) reads variable names from the AST and injects stable IDs automatically. Zero effort from the developer.

```typescript
// What the developer writes:
function Counter() {
  const count = signal(0);
  const name = signal("Alisher");
}

// What the SWC transform outputs:
function Counter() {
  const count = signal(0, "Counter:count");
  const name = signal("Alisher", "Counter:name");
}
```

### Signal Factory with HMR Support

```typescript
function signal<T>(initialValue: T, _hmrId?: string): Signal<T> {
  if (__DEV__ && _hmrId) {
    // Check if a signal with this ID already exists in current scope
    const existing = currentScope?.getSignalById(_hmrId);
    if (existing) {
      // Reuse existing signal (preserve value)
      return existing as Signal<T>;
    }
  }

  // Create new signal
  const s = createSignal(initialValue);
  if (__DEV__ && _hmrId) {
    currentScope?.registerSignal(_hmrId, s);
  }
  return s;
}
```

In production builds, the `_hmrId` parameter and all HMR logic is stripped by dead code elimination since `__DEV__` is `false`.

---

## Reload Scenarios

### Scenario 1: Style change (most common)

```typescript
// BEFORE
View({ backgroundColor: "#FF0000", padding: 16 })

// AFTER
View({ backgroundColor: "#0000FF", padding: 24 })
```

Component re-runs, new SkiaNode tree has different props, signals preserved, instant visual update. **Fast — <16ms.**

### Scenario 2: Logic change

```typescript
// BEFORE
const doubled = computed(() => count.value * 2);

// AFTER
const doubled = computed(() => count.value * 3);
```

Old computed disposed, new computed created with new logic, reads current `count.value`, all effects that depend on `doubled` re-run. **Fast — <16ms.**

### Scenario 3: New signal added

```typescript
// BEFORE
const count = signal(0);              // Counter:count

// AFTER
const count = signal(0);              // Counter:count → preserved
const color = signal("red");          // Counter:color → new, gets initial value
```

`count` preserved, `color` created fresh. **Works fine.**

### Scenario 4: Signal removed

```typescript
// BEFORE
const count = signal(0);              // Counter:count
const color = signal("red");          // Counter:color

// AFTER
const count = signal(0);              // Counter:count → preserved
// color removed
```

`count` preserved, old `color` signal gets garbage collected. **Works fine.**

### Scenario 5: Signal renamed

```typescript
// BEFORE
const count = signal(0);              // Counter:count

// AFTER
const total = signal(0);              // Counter:total → no match, gets initial value
```

`count` signal is lost because the variable name changed. `total` starts fresh at `0`. This is acceptable — renaming a variable is a semantic change, not just a style change. The developer expects a reset.

---

## Communication Channel

How the file change gets from the dev server to the runtime:

```
File saved
    │
    ▼
Metro/SWC watcher detects change
    │
    ▼
Recompile changed module (~10ms)
    │
    ▼
WebSocket message to app:
{
  type: "hmr_update",
  moduleId: "src/screens/Counter.ts",
  code: "...compiled JS...",
  componentIds: ["Counter"]
}
    │
    ▼
Runtime HMR client receives and applies update
```

### HMR Client

```typescript
class HMRClient {
  private ws: WebSocket;

  constructor(devServerUrl: string) {
    this.ws = new WebSocket(`${devServerUrl}/__hmr`);
    this.ws.onmessage = (event) => this.handleUpdate(JSON.parse(event.data));
  }

  private handleUpdate(update: HMRUpdate) {
    if (update.type === "hmr_update") {
      // Execute new module code
      const moduleExports = evalModule(update.code);

      // Update component registry
      for (const id of update.componentIds) {
        if (moduleExports[id]) {
          ComponentRegistry.update(id, moduleExports[id]);
        }
      }
    }

    if (update.type === "full_reload") {
      nativeReload();
    }
  }
}

interface HMRUpdate {
  type: "hmr_update" | "full_reload";
  moduleId: string;
  code: string;
  componentIds: string[];
}
```

---

## When Hot Reload Fails → Full Reload

Some changes can't be hot-reloaded:

| Change Type | Can Hot Reload? | Reason |
|---|---|---|
| Style prop change | ✅ Yes | New SkiaNode tree picks it up |
| Computed/effect logic | ✅ Yes | Old disposed, new created |
| Add/remove signal | ✅ Yes | Named matching handles it |
| Add/remove child node | ✅ Yes | New tree structure replaces old |
| Rename signal variable | ⚠️ Partial | Signal resets to initial value |
| Global signal stores | ❌ No | State shape changed outside component |
| New import added | ❌ No | Module graph needs update |
| Native code (Kotlin/Swift) | ❌ No | Needs full rebuild |
| Navigation structure | ❌ No | Screen tree changed |

On failure, fallback to full reload with a clear message:

```
[zilol-native] Cannot hot reload: module-level signal changed in store.ts
[zilol-native] Performing full reload...
```

---

## Full Pipeline

```
┌─────────────────────────────────────────────────┐
│  Developer saves file                            │
├─────────────────────────────────────────────────┤
│  SWC recompiles (~10ms)                          │
│  + injects signal IDs via plugin                 │
├─────────────────────────────────────────────────┤
│  WebSocket → app receives new code               │
├─────────────────────────────────────────────────┤
│  ComponentRegistry.update()                      │
│    │                                             │
│    ├── Snapshot signal values by ID              │
│    ├── Dispose old scope (effects, computeds)    │
│    ├── Detach old SkiaNode subtree               │
│    ├── Re-run component with preserved signals   │
│    ├── Attach new SkiaNode subtree               │
│    └── Mark dirty                                │
├─────────────────────────────────────────────────┤
│  Next vsync: Skia redraws changed area           │
├─────────────────────────────────────────────────┤
│  Total time: file save → pixels updated          │
│  ~30-80ms (imperceptible)                        │
└─────────────────────────────────────────────────┘
```

---

## Files Involved

```
packages/
├── runtime/src/
│   ├── hmr/
│   │   ├── ComponentRegistry.ts    # Component tracking + remount logic
│   │   ├── HMRClient.ts            # WebSocket client for dev server
│   │   ├── SignalSnapshot.ts       # Signal value preservation
│   │   └── index.ts
│   │
│   └── reactive/
│       └── signal.ts               # signal() with _hmrId support

swc-plugin/
└── src/
    └── signal_transform.rs         # ~50 lines — injects signal IDs
```

---

## Production Build

All HMR code is stripped in production:

- `__DEV__` is `false` → all HMR branches eliminated by dead code elimination
- `_hmrId` parameter still exists in signatures but unused → minifier strips it
- `ComponentRegistry`, `HMRClient`, `SignalSnapshot` → tree-shaken out
- Zero runtime cost in production
