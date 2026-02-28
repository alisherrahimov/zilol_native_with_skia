/**
 * Router.ts — Imperative stack navigation.
 *
 * Architecture:
 * - Plain array stack (no signals for nav state)
 * - 4 animation signals total (translateX × 2, opacity × 2)
 * - Zero effects, zero reactive overhead
 * - Direct imperative push/pop/replace
 * - Yoga attach on mount, detach on unmount
 * - Cached screen width
 */

import { signal } from "@zilol-native/runtime";
import { View, Gesture, GestureDetector } from "@zilol-native/components";
import type { Component } from "@zilol-native/components";
import { animate, withTiming, withSpring } from "@zilol-native/animation";
import { getCurrentApp } from "@zilol-native/platform";
import { ScreenContainer } from "./ScreenContainer";
import type { SkiaNode } from "@zilol-native/nodes";
import type {
  ScreenMap,
  StackEntry,
  RouterScreenConfig,
  RouterConfig,
  TransitionType,
} from "./types";

// ---------------------------------------------------------------------------
// Yoga helpers
// ---------------------------------------------------------------------------

function attachToYoga(node: SkiaNode): void {
  const app = getCurrentApp();
  if (!app) return;
  const bridge = app.yogaBridge;
  bridge.attachNode(node);
  for (const child of node.children) {
    attachToYoga(child);
  }
}

function detachFromYoga(node: SkiaNode): void {
  const app = getCurrentApp();
  if (!app) return;
  const bridge = app.yogaBridge;
  // Detach children first (bottom-up)
  for (let i = node.children.length - 1; i >= 0; i--) {
    detachFromYoga(node.children[i]);
  }
  bridge.detachNode(node);
}

function requestLayout(): void {
  const app = getCurrentApp();
  if (!app) return;
  const { yogaBridge, screenDimensions } = app;
  yogaBridge.calculateLayout(screenDimensions.width, screenDimensions.height);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

let _nextKey = 1;

export interface Router {
  /** Push a new screen onto the stack. */
  push(screen: string, params?: any): void;
  /** Pop the top screen. No-op if at root. */
  pop(): void;
  /** Pop all screens back to the root. */
  popToRoot(): void;
  /** Replace the current screen without animation. */
  replace(screen: string, params?: any): void;
  /** Whether there's a screen to go back to. */
  canGoBack(): boolean;
  /** Name of the current screen. */
  currentScreen(): string;
  /** Build the Navigator component. Call once in runApp(). */
  Navigator(opts?: { initialRoute?: string }): Component;
}

export function createRouter(
  screens: ScreenMap,
  config: RouterConfig = {},
): Router {
  const transitionType = config.transition ?? "slide";
  const duration = config.transitionDuration ?? 250;
  const gestureBack = config.gestureBack ?? true;

  // Normalize screen registry
  const registry: Record<string, RouterScreenConfig> = {};
  for (const [name, value] of Object.entries(screens)) {
    registry[name] = typeof value === "function" ? { component: value } : value;
  }

  // ── State ────────────────────────────────────────
  const stack: StackEntry[] = [];
  let animating = false;
  let screenWidth = 390; // cached, set in Navigator()

  // ── Animation signals (only 4) ───────────────────
  const currentX = signal(0);
  const currentOpacity = signal(1);
  const prevX = signal(0);
  const prevOpacity = signal(0);

  // ── Layer nodes ──────────────────────────────────
  let prevLayer: Component | null = null;
  let currentLayer: Component | null = null;
  let currentScreenNode: SkiaNode | null = null;
  let prevScreenNode: SkiaNode | null = null;

  // ── Screen building ──────────────────────────────

  function buildScreen(
    name: string,
    params: any,
    canGoBack: boolean,
  ): SkiaNode {
    const entry = registry[name];
    if (!entry) return View().node;

    const content = entry.component(params);
    const options = entry.options ?? {};

    return ScreenContainer(
      content,
      { ...options, title: options.title ?? name },
      canGoBack,
      () => router.pop(),
    ).node;
  }

  function mountCurrent(name: string, params: any, canGoBack: boolean): void {
    const newNode = buildScreen(name, params, canGoBack);

    // Unmount old
    if (currentScreenNode && currentLayer) {
      currentLayer.node.removeChild(currentScreenNode);
      detachFromYoga(currentScreenNode);
    }

    // Mount new
    currentLayer!.node.appendChild(newNode);
    attachToYoga(newNode);
    currentScreenNode = newNode;
  }

  function mountPrev(name: string, params: any): void {
    const newNode = buildScreen(name, params, false);

    // Unmount old
    if (prevScreenNode && prevLayer) {
      prevLayer.node.removeChild(prevScreenNode);
      detachFromYoga(prevScreenNode);
    }

    // Mount new
    prevLayer!.node.appendChild(newNode);
    attachToYoga(newNode);
    prevScreenNode = newNode;
  }

  function unmountPrev(): void {
    if (prevScreenNode && prevLayer) {
      prevLayer.node.removeChild(prevScreenNode);
      detachFromYoga(prevScreenNode);
      prevScreenNode = null;
    }
  }

  // ── Transition helpers ───────────────────────────

  function slideIn(onDone: () => void): void {
    animating = true;
    currentX.value = screenWidth;
    currentOpacity.value = 1;
    prevX.value = 0;
    prevOpacity.value = 1;

    animate(currentX, withTiming(0, { duration }));
    animate(prevX, withTiming(-screenWidth * 0.3, { duration })).onFinish(
      () => {
        prevOpacity.value = 0;
        unmountPrev();
        animating = false;
        onDone();
      },
    );
  }

  function slideOut(onDone: () => void): void {
    animating = true;
    currentX.value = 0;
    currentOpacity.value = 1;
    prevX.value = -screenWidth * 0.3;
    prevOpacity.value = 1;

    animate(currentX, withTiming(screenWidth, { duration }));
    animate(prevX, withTiming(0, { duration })).onFinish(() => {
      animating = false;
      onDone();
    });
  }

  function fadeIn(onDone: () => void): void {
    animating = true;
    currentX.value = 0;
    currentOpacity.value = 0;
    prevOpacity.value = 1;

    animate(currentOpacity, withTiming(1, { duration }));
    animate(prevOpacity, withTiming(0, { duration })).onFinish(() => {
      unmountPrev();
      animating = false;
      onDone();
    });
  }

  function fadeOut(onDone: () => void): void {
    animating = true;
    currentOpacity.value = 1;
    prevX.value = 0;
    prevOpacity.value = 0;

    animate(currentOpacity, withTiming(0, { duration }));
    animate(prevOpacity, withTiming(1, { duration })).onFinish(() => {
      animating = false;
      onDone();
    });
  }

  function resetPositions(): void {
    currentX.value = 0;
    currentOpacity.value = 1;
    prevOpacity.value = 0;
    prevX.value = 0;
  }

  function finishPop(): void {
    stack.pop();
    resetPositions();

    // Move the prev screen node → current layer (no rebuild, no blink)
    if (prevScreenNode && prevLayer && currentLayer) {
      // Remove old current
      if (currentScreenNode) {
        currentLayer.node.removeChild(currentScreenNode);
        detachFromYoga(currentScreenNode);
      }

      // Move prev → current (node is already rendered + has Yoga layout)
      prevLayer.node.removeChild(prevScreenNode);
      currentLayer.node.appendChild(prevScreenNode);
      currentScreenNode = prevScreenNode;
      prevScreenNode = null;
    }
  }

  // ── Router API ───────────────────────────────────

  const router: Router = {
    push(screen: string, params: any = {}) {
      if (animating || !registry[screen]) return;

      // Show current as prev layer
      const top = stack[stack.length - 1];
      if (top) mountPrev(top.screen, top.params);

      // Push stack and build new current
      stack.push({ screen, params, key: _nextKey++ });
      mountCurrent(screen, params, true);

      // Transition
      if (transitionType === "slide") {
        slideIn(() => {});
      } else if (transitionType === "fade") {
        fadeIn(() => {});
      }
    },

    pop() {
      if (animating || stack.length <= 1) return;

      // Build the screen behind
      const behindEntry = stack[stack.length - 2];
      mountPrev(behindEntry.screen, behindEntry.params);

      // Transition
      if (transitionType === "slide") {
        slideOut(() => finishPop());
      } else if (transitionType === "fade") {
        fadeOut(() => finishPop());
      } else {
        finishPop();
      }
    },

    popToRoot() {
      if (animating || stack.length <= 1) return;
      const root = stack[0];
      stack.length = 1;
      resetPositions();
      mountCurrent(root.screen, root.params, false);
      unmountPrev();
    },

    replace(screen: string, params: any = {}) {
      if (animating || !registry[screen]) return;
      stack[stack.length - 1] = { screen, params, key: _nextKey++ };
      mountCurrent(screen, params, stack.length > 1);
    },

    canGoBack: () => stack.length > 1,

    currentScreen: () =>
      stack.length > 0 ? stack[stack.length - 1].screen : "",

    Navigator(opts: { initialRoute?: string } = {}) {
      const initialRoute = opts.initialRoute ?? Object.keys(screens)[0];

      // Cache screen width
      const app = getCurrentApp();
      if (app) screenWidth = app.screenDimensions.width;

      // Persistent layers — only created once
      prevLayer = View()
        .position("absolute")
        .top(0)
        .left(0)
        .right(0)
        .bottom(0)
        .translateX(() => prevX.value)
        .opacity(() => prevOpacity.value);

      currentLayer = View()
        .position("absolute")
        .top(0)
        .left(0)
        .right(0)
        .bottom(0)
        .translateX(() => currentX.value)
        .opacity(() => currentOpacity.value);

      // Mount initial screen
      stack.push({ screen: initialRoute, params: {}, key: _nextKey++ });
      const initialNode = buildScreen(initialRoute, {}, false);
      currentLayer.node.appendChild(initialNode);
      attachToYoga(initialNode);
      currentScreenNode = initialNode;

      // Container
      const container = View(prevLayer, currentLayer).flex(1);

      // Swipe-back gesture (left edge)
      if (gestureBack) {
        const panGesture = Gesture.Pan()
          .activationThreshold(15)
          .onStart(() => {
            if (animating || stack.length <= 1) return;
            const behindEntry = stack[stack.length - 2];
            mountPrev(behindEntry.screen, behindEntry.params);
            prevOpacity.value = 1;
          })
          .onUpdate((e: any) => {
            if (animating || stack.length <= 1) return;
            const tx = Math.max(0, e.translationX);
            const progress = tx / screenWidth;
            currentX.value = tx;
            prevX.value = -screenWidth * 0.3 * (1 - progress);
          })
          .onEnd((e: any) => {
            if (animating || stack.length <= 1) {
              currentX.value = 0;
              prevOpacity.value = 0;
              unmountPrev();
              return;
            }

            const progress = currentX.value / screenWidth;

            if (progress > 0.3 || e.velocityX > 500) {
              // Complete the pop
              animating = true;
              animate(currentX, withTiming(screenWidth, { duration: 200 }));
              animate(prevX, withTiming(0, { duration: 200 })).onFinish(() => {
                animating = false;
                finishPop();
              });
            } else {
              // Cancel — spring back
              animate(currentX, withSpring(0, { damping: 15, stiffness: 200 }));
              animate(
                prevX,
                withSpring(-screenWidth * 0.3, { damping: 15, stiffness: 200 }),
              ).onFinish(() => {
                prevOpacity.value = 0;
                unmountPrev();
              });
            }
          });

        return GestureDetector(container, panGesture).flex(1);
      }

      return container;
    },
  };

  return router;
}
