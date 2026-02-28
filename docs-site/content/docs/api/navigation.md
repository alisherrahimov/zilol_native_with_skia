---
title: Navigation
description: Imperative stack navigation — push, pop, slide transitions, and swipe-back.
order: 14
---

## Overview

`createRouter` builds a zero-overhead navigator. Navigation state is a plain array — no signals, no effects, no reactive subscriptions. Only 4 animation signals exist (translateX × 2, opacity × 2) for smooth 60fps transitions driven by the C++ animation loop.

## Quick Start

```typescript
import { createRouter } from "@zilol-native/navigation";
import { runApp } from "@zilol-native/platform";

const router = createRouter({
  Home: HomeScreen,
  Details: DetailsScreen,
});

runApp(() => router.Navigator({ initialRoute: "Home" }).node);
```

## Defining Screens

A screen is a function that receives params and returns a `Component`:

```typescript
// Simple — just a function
const router = createRouter({
  Home: () =>
    View(Text("Home").fontSize(24).bold().color("#FFF"))
      .flex(1)
      .alignItems("center")
      .justifyContent("center"),
});

// With options — object with component + options
const router = createRouter({
  Home: {
    component: HomeScreen,
    options: {
      title: "Home",
      headerStyle: { backgroundColor: "#1E293B" },
      headerTintColor: "#FFF",
    },
  },
});
```

## Navigating

```typescript
// Push a screen
router.push("Details", { id: 42 });

// Pop back
router.pop();

// Pop all the way to root
router.popToRoot();

// Replace current screen (no animation)
router.replace("Settings");

// Check if back is possible
if (router.canGoBack()) { ... }

// Get current screen name
router.currentScreen(); // "Details"
```

## Screen Params

Params are passed to the screen function:

```typescript
function DetailsScreen(params: { id: number }) {
  return View(
    Text(`Item #${params.id}`).fontSize(24).color("#FFF"),
    Pressable(Text("Back").color("#FFF")).onPress(() => router.pop()),
  )
    .flex(1)
    .alignItems("center")
    .justifyContent("center");
}

router.push("Details", { id: 42 });
```

## Safe Area

Navigation screens automatically respect the notch and home indicator. `ScreenContainer` applies `safeArea("top")` to the header area and `safeArea("bottom")` to the content area — no extra code needed.

For custom layouts without the navigation header, use `.safeArea()` directly:

```typescript
View(content).flex(1).safeArea();
```

## Transitions

```typescript
const router = createRouter(screens, {
  transition: "slide", // "slide" | "fade" | "none"
  transitionDuration: 250, // ms (default: 250)
  gestureBack: true, // swipe-back from left edge
});
```

| Type    | Push                                                 | Pop          |
| ------- | ---------------------------------------------------- | ------------ |
| `slide` | New screen slides in from right, old shifts left 30% | Reverse      |
| `fade`  | New screen fades in, old fades out                   | Reverse      |
| `none`  | Instant swap                                         | Instant swap |

## Header Bar

Each screen can configure its header:

```typescript
const router = createRouter({
  Home: {
    component: HomeScreen,
    options: {
      title: "Home",
      headerShown: true, // default: true
      headerStyle: {
        backgroundColor: "#1E293B", // header background
      },
      headerTintColor: "#FFF", // title + back text color
      headerLeft: () => CustomButton(),
      headerRight: () => SettingsIcon(),
    },
  },
});
```

The back button appears automatically when `canGoBack()` is true.

## Swipe-Back Gesture

Swipe from the left edge to go back (iOS-style). The transition follows your finger and completes or cancels based on:

- **Progress > 30%** → completes pop
- **Velocity > 500px/s** → completes pop (fast swipe)
- Otherwise → springs back with cancel animation

Disable with `gestureBack: false`.

## API Reference

### `createRouter(screens, config?)`

| Param                       | Type                                                 | Description                               |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `screens`                   | `Record<string, ScreenFn \| { component, options }>` | Screen definitions                        |
| `config.transition`         | `"slide" \| "fade" \| "none"`                        | Transition type (default: `"slide"`)      |
| `config.transitionDuration` | `number`                                             | Animation duration in ms (default: `250`) |
| `config.gestureBack`        | `boolean`                                            | Enable swipe-back (default: `true`)       |

### Router Methods

| Method                     | Description                    |
| -------------------------- | ------------------------------ |
| `push(screen, params?)`    | Push a new screen              |
| `pop()`                    | Go back one screen             |
| `popToRoot()`              | Go back to the first screen    |
| `replace(screen, params?)` | Replace current (no animation) |
| `canGoBack()`              | `true` if stack depth > 1      |
| `currentScreen()`          | Name of the top screen         |
| `Navigator(opts?)`         | Build the navigator component  |

### Screen Options

| Option            | Type                  | Default     | Description             |
| ----------------- | --------------------- | ----------- | ----------------------- |
| `title`           | `string`              | Screen name | Header title            |
| `headerShown`     | `boolean`             | `true`      | Show/hide header        |
| `headerStyle`     | `{ backgroundColor }` | `#1E293B`   | Header styling          |
| `headerTintColor` | `string`              | `#F8FAFC`   | Title + back text color |
| `headerLeft`      | `() => Component`     | —           | Custom left element     |
| `headerRight`     | `() => Component`     | —           | Custom right element    |

## Architecture

```
push("Details", { id: 42 })
  │
  ├─ mountPrev(current)      mount current screen as prev layer
  ├─ stack.push(entry)        plain array, no signals
  ├─ mountCurrent(new)        build + appendChild + attachYoga
  └─ slideIn()                animate translateX (0→screenWidth, 250ms)
       │
       └─ onFinish
            ├─ unmountPrev()  removeChild + detachYoga (free memory)
            └─ animating = false

pop()
  │
  ├─ mountPrev(behind)        build behind screen in prev layer
  └─ slideOut()               animate current out to right
       │
       └─ onFinish
            ├─ stack.pop()
            ├─ move prev node → current layer  (no rebuild, no blink)
            └─ animating = false
```
