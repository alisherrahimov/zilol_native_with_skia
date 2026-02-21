# Zilol Native — Project Rules

## Project Overview

Zilol Native is a next-generation React Native rendering framework that replaces the VDOM reconciler and native view tree with fine-grained reactivity (signals) and Skia GPU rendering. The architecture is: `Signal Change → SkiaNode Mutation → Damage Rect → Skia GPU Redraw`.

This is a **runtime library** (~5-7K lines of TypeScript), not a compiler or language. It composes existing tools: SWC for TS compilation, Hermes for JS execution, Yoga for layout, and Skia for GPU rendering.

## Architecture References

Before making changes, read the relevant docs:
- `docs/zilol-native-architecture.md` — Full system architecture (layers, threading, render pipeline)
- `docs/zilol-native-structure.md` — Monorepo structure, build order, package dependencies
- `docs/zilol-native-api-reference-2.md` — Complete public API reference
- `docs/zilol-native-hot-reload.md` — HMR system design

## Code Quality Standards

### Production-Ready Code Only
- Write **battle-tested, production-grade** code — no quick hacks, no TODOs left behind.
- Every function must handle edge cases: null/undefined inputs, empty arrays, boundary values.
- Use defensive programming: validate inputs, guard against impossible states.
- No `any` type. Ever. Use `unknown` with type narrowing when the type is truly dynamic.
- Prefer explicit return types on all public functions.
- Zero runtime errors is the target. If something can fail, handle it explicitly.

### TypeScript Strictness
- `strict: true` is non-negotiable across all packages.
- Use `readonly` for properties and arrays that should not be mutated.
- Prefer `const` over `let`. Never use `var`.
- Use discriminated unions over optional fields when modeling state.
- Use branded types for IDs and type-safe identifiers where appropriate.
- Prefer `interface` for object shapes, `type` for unions/intersections/aliases.

### Performance First
- This is a rendering framework — **every microsecond counts**.
- Avoid allocations in hot paths (render loop, signal propagation, effect execution).
- Use object pools and recycling for frequently created/destroyed objects (SkiaNode, effects).
- Prefer `for` loops over `.forEach()/.map()/.filter()` in performance-critical code.
- Cache computed values aggressively. Avoid redundant work.
- Use bitwise flags and flat arrays over Maps/Sets in hot paths when benchmarks justify it.
- Profile before optimizing — don't prematurely optimize cold paths.
- Measure with `performance.now()` on real data sizes.

### Memory Management
- No memory leaks. Every `effect()` must have a corresponding dispose. Every subscription must be cleaned up.
- Use WeakRef/WeakMap for caches that shouldn't prevent garbage collection.
- Keep per-node memory under 200 bytes. Track allocations.
- Node recycling pool must be bounded (max 100 per type).

## Architecture Rules

### Package Dependency DAG (Strict — No Circular Deps)
```
runtime          → (none)
nodes            → runtime
layout           → nodes, yoga-layout
renderer         → nodes, layout
gestures         → nodes, runtime
animation        → runtime
platform         → nodes (+ native)
accessibility    → nodes (+ native)
image            → nodes, renderer
devtools         → runtime, nodes, renderer
components       → runtime, nodes, renderer, gestures, animation
navigation       → runtime, nodes, renderer, animation
```
Never introduce a dependency that violates this DAG. If you need something from a downstream package, refactor the shared code into the upstream package.

### Component Model
- Components are **plain functions that run exactly once**. They return a SkiaNode tree.
- State changes propagate through signals, NOT by re-running the component function.
- Distinguish static props (set once) from reactive props (function wrappers that create effects).
- Event handlers (`onPress`, `onLayout`, etc.) are never treated as reactive props.

### Reactive System
- Signals are the single source of truth for all mutable state.
- `computed()` values are lazy — they only recalculate when read AND dependencies changed.
- Effects run synchronously when dependencies change (unless inside `batch()`).
- The dependency graph must be glitch-free: topological ordering, no intermediate states visible.
- All reactive primitives created in a component must be tracked in a scope for auto-cleanup.

### Rendering Pipeline
- The render loop is vsync-driven. Never draw outside the frame lifecycle.
- Only dirty nodes regenerate their display list. Clean nodes replay cached commands.
- Damage rects must be merged to minimize draw calls.
- Transform animations (translate, scale, rotate, opacity) must NOT trigger Yoga layout.

## Testing Requirements

### Test Everything
- Every public API function needs unit tests.
- Test edge cases: empty inputs, single element, boundary values, rapid mutations.
- Test reactive behavior: dependency tracking, cleanup, batching, glitch-freedom.
- Test memory: ensure dispose actually frees resources, no leaked subscriptions.
- Use `vitest` for all tests. Use `describe/it/expect` pattern.

### Test Naming
```typescript
describe('signal', () => {
  it('should return initial value on first read', () => { ... });
  it('should notify subscribers when value changes', () => { ... });
  it('should not notify when set to same value', () => { ... });
});
```

## Package Manager & Runtime

- **Always use Bun** (`bun install`, `bun run`, `bun test`) — never npm, yarn, or pnpm.
- Use `bun add` / `bun add -d` for dependencies.
- Use `bunx` instead of `npx`.

## Library Versions (Latest Stable)

- **TypeScript**: ^5.4.0
- **Vitest**: ^1.6.0
- **Turbo**: ^2.0.0
- **yoga-layout**: ^3.0.0
- Target **ES2022** for modern features (at, structuredClone, error.cause, etc.)

## Code Style

### Naming Conventions
- Files: `PascalCase.ts` for classes/components, `camelCase.ts` for utility modules.
- Classes: `PascalCase` — e.g., `SkiaNode`, `NodePool`, `DirtyTracker`.
- Functions: `camelCase` — e.g., `signal()`, `computed()`, `createNavigation()`.
- Constants: `UPPER_SNAKE_CASE` for true compile-time constants.
- Types/Interfaces: `PascalCase` — e.g., `Signal<T>`, `SkiaNodeProps`.
- Private fields: prefix with underscore `_` if not using `#private`.

### File Structure
```typescript
// 1. Imports (external → internal → relative)
// 2. Types and interfaces
// 3. Constants
// 4. Main implementation
// 5. Helper functions (private)
// 6. Exports (prefer named, avoid default)
```

### Documentation
- JSDoc on all public APIs with `@param`, `@returns`, `@example`.
- Inline comments only for non-obvious logic. The code should be self-documenting.
- No commented-out code. If it's not needed, delete it.

## Git Conventions

- Commit messages: `type(scope): description` — e.g., `feat(runtime): implement signal primitive`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `chore`
- Scopes match package names: `runtime`, `nodes`, `layout`, `renderer`, `gestures`, `animation`

## Build Order (Follow Strictly)

Phase 1: `packages/runtime` (pure TS, zero deps)
Phase 2: `packages/nodes` (depends on runtime)
Phase 3: `packages/layout` + `packages/renderer` (needs Yoga + Skia)
Phase 4: `packages/gestures` + `packages/animation`
Phase 5: `packages/platform` + `packages/accessibility` + `packages/image` + `components` + `navigation`
Phase 6: `packages/devtools` + `benchmarks` + `docs`

Never skip ahead. Each phase must be complete and tested before starting the next.

## What NOT To Do

- Do NOT use React, React Native, or any VDOM library.
- Do NOT use `any` type. Use `unknown` and narrow.
- Do NOT use classes where a simple function + closure will do (except SkiaNode and pools).
- Do NOT create circular dependencies between packages.
- Do NOT allocate in the render loop hot path.
- Do NOT write code without tests.
- Do NOT leave `console.log` in production code (use `__DEV__` guard).
- Do NOT use default exports. Use named exports exclusively.


## Javascript or Typescript or package installer use BUN instead of npm!