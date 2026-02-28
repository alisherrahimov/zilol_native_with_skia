/**
 * ScreenContainer.ts — Full-screen wrapper for navigation screens.
 *
 * Wraps a screen's content in a full-size View with optional header.
 */

import { View } from "@zilol-native/components";
import type { Component } from "@zilol-native/components";
import { Header } from "./Header";
import type { ScreenOptions } from "./types";

export function ScreenContainer(
  content: Component,
  options: ScreenOptions,
  canGoBack: boolean,
  onBack: () => void,
): Component {
  const header = Header(options, canGoBack, onBack);

  return View(header, View(content).flex(1).safeArea("bottom"))
    .flex(1)
    .safeArea("top")
    .backgroundColor(options.headerStyle?.backgroundColor ?? "#0F172A");
}
