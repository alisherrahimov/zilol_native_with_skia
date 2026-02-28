/**
 * types.ts — Navigation type definitions.
 */

import type { Component } from "@zilol-native/components";

// ---------------------------------------------------------------------------
// Screen definition
// ---------------------------------------------------------------------------

/** A screen function receives params and returns a Component. */
export type ScreenFn<P = any> = (params: P) => Component;

/** An entry in the navigation stack. */
export interface StackEntry {
  screen: string;
  params: any;
  key: number;
}

// ---------------------------------------------------------------------------
// Screen options (header configuration)
// ---------------------------------------------------------------------------

export interface ScreenOptions {
  title?: string;
  headerShown?: boolean;
  headerStyle?: { backgroundColor?: string };
  headerTintColor?: string;
  headerLeft?: () => Component;
  headerRight?: () => Component;
}

// ---------------------------------------------------------------------------
// Transition config
// ---------------------------------------------------------------------------

export type TransitionType = "slide" | "fade" | "none";

export interface TransitionConfig {
  type: TransitionType;
  duration: number;
}

// ---------------------------------------------------------------------------
// Router config
// ---------------------------------------------------------------------------

export interface RouterScreenConfig {
  component: ScreenFn;
  options?: ScreenOptions;
}

export type ScreenMap = Record<string, ScreenFn | RouterScreenConfig>;

export interface RouterConfig {
  transition?: TransitionType;
  transitionDuration?: number;
  gestureBack?: boolean;
}
