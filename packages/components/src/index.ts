/**
 * @module @zilol-native/components
 *
 * Zilol Native — UI Components (SwiftUI-style API)
 *
 * Component functions that create SkiaNodes with chainable modifiers.
 * Each modifier returns `this` for a fluent builder pattern.
 *
 * @example
 * ```ts
 * import { View, Text } from '@zilol-native/components';
 * import { signal } from '@zilol-native/runtime';
 *
 * const count = signal(0);
 *
 * const app = View(
 *   Text('Zilol Native')
 *     .fontSize(32)
 *     .bold()
 *     .color('#F8FAFC'),
 *
 *   Text(() => `Count: ${count.value}`)
 *     .fontSize(18)
 *     .color('#94A3B8'),
 *
 *   View(Text('+1').color('#FFF').textAlign('center'))
 *     .size(100, 44)
 *     .backgroundColor('#3B82F6')
 *     .borderRadius(8)
 *     .onPress(() => count.value++),
 * )
 *   .flex(1)
 *   .column()
 *   .alignItems('center')
 *   .justifyContent('center')
 *   .gap(16)
 *   .backgroundColor('#0F172A');
 * ```
 */

// Components
export { View, ViewBuilder } from "./View";
export { Text, TextBuilder } from "./Text";
export { Pressable, PressableBuilder } from "./Pressable";
export { Image, ImageBuilder } from "./Image";
export { ScrollView, ScrollViewBuilder } from "./ScrollView";
export {
  Gesture,
  GestureBuilder,
  PanGesture,
  PinchGesture,
  RotationGesture,
  TapGesture,
} from "./Gesture";
export type { GestureEvent, GestureCallback } from "./Gesture";
export { GestureDetector } from "./GestureDetector";
export {
  ActivityIndicator,
  ActivityIndicatorBuilder,
} from "./ActivityIndicator";

// Base class (for extending custom components)
export { ComponentBase } from "./ComponentBase";

// Types
export type { Component, ComponentChild } from "./types";
export { resolveNode } from "./types";
