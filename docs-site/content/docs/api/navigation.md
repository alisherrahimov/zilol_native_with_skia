---
title: Navigation
description: Native navigation with stack and tab navigators powered by UINavigationController and UITabBarController.
order: 14
---

## Overview

Zilol Native navigation uses **real native view controllers** under the hood — `UINavigationController` on iOS and their equivalents on Android. This ensures native gestures, transitions, and system integration.

## Stack Navigator

```typescript
import { createStackNavigator, useNavigation } from "@zilol-native/navigation";

const Stack = createStackNavigator();

function App() {
  return Stack.Navigator({
    screens: [
      Stack.Screen("Home", HomeScreen, {
        title: "Home",
      }),
      Stack.Screen("Details", DetailsScreen, {
        title: "Details",
      }),
    ],
  });
}
```

## Navigating

```typescript
function HomeScreen() {
  const nav = useNavigation();

  return View().children([
    Pressable(() => nav.push("Details", { id: 42 })).child(
      Text("Go to Details"),
    ),
  ]);
}
```

## Tab Navigator

```typescript
import { createBottomTabNavigator } from "@zilol-native/navigation";

const Tab = createBottomTabNavigator();

function App() {
  return Tab.Navigator({
    screens: [
      Tab.Screen("Home", HomeScreen, {
        tabBarIcon: "🏠",
        tabBarLabel: "Home",
      }),
      Tab.Screen("Profile", ProfileScreen, {
        tabBarIcon: "👤",
        tabBarLabel: "Profile",
      }),
    ],
  });
}
```

## Navigation Hooks

```typescript
// Get the navigation object
const nav = useNavigation();

// Get current route params
const route = useRoute<{ id: number }>();

// Run effect when screen is focused
useFocusEffect(() => {
  fetchData(route.params.id);
});
```

## How It Works

The navigation system uses the C++ JSI bridge to communicate with native view controllers:

- `__navigationPush(screenId, props)` — Push a new screen
- `__navigationPop()` — Pop the current screen
- `__navigationJumpTo(tabId)` — Switch tab

Each screen's Skia canvas is rendered inside its own native view controller, getting native transitions and gesture-driven back navigation for free.
