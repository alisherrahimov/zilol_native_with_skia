/**
 * Header.ts — Navigation header bar.
 *
 * Renders a horizontal bar with optional back button, title, and actions.
 */

import { View, Text, Pressable } from "@zilol-native/components";
import type { Component } from "@zilol-native/components";
import type { ScreenOptions } from "./types";

const HEADER_HEIGHT = 56;

export function Header(
  options: ScreenOptions,
  canGoBack: boolean,
  onBack: () => void,
): Component {
  const shown = options.headerShown !== false;
  if (!shown) {
    return View().height(0);
  }

  const bgColor = options.headerStyle?.backgroundColor ?? "#1E293B";
  const tintColor = options.headerTintColor ?? "#F8FAFC";
  const title = options.title ?? "";

  return View(
    // Left section
    View(
      canGoBack
        ? Pressable(Text("‹ Back").fontSize(16).color(tintColor))
            .onPress(onBack)
            .paddingHorizontal(4)
            .height(HEADER_HEIGHT)
            .justifyContent("center")
        : options.headerLeft
          ? options.headerLeft()
          : View(),
    )
      .width(80)
      .justifyContent("center"),

    // Title
    View(Text(title).fontSize(17).bold().color(tintColor).textAlign("center"))
      .flex(1)
      .justifyContent("center")
      .alignItems("center"),

    // Right section
    View(options.headerRight ? options.headerRight() : View())
      .width(80)
      .justifyContent("center")
      .alignItems("flex-end"),
  )
    .row()
    .height(HEADER_HEIGHT)
    .paddingHorizontal(12)
    .backgroundColor(bgColor)
    .alignItems("center");
}
