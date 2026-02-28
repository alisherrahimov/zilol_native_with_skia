/**
 * GestureDetector.ts — Wrapper that attaches gestures to a child.
 *
 * @example
 * ```ts
 * const pan = Gesture.Pan()
 *   .onUpdate((e) => { x.value = e.translationX; });
 *
 * GestureDetector(
 *   View().size(100, 100).backgroundColor("red"),
 *   pan,
 * );
 * ```
 */

import { ViewBuilder } from "./View";
import type { GestureBuilder } from "./Gesture";
import type { Component } from "./types";

/**
 * Attach one or more gesture recognizers to a child component.
 * Returns a ViewBuilder wrapping the child.
 */
export function GestureDetector(
  child: Component,
  ...gestures: GestureBuilder[]
): ViewBuilder {
  // Wrap in a view and mark touchable
  const wrapper = new ViewBuilder([child]);
  wrapper.node.setProp("touchable" as any, true);

  // Attach gestures after C++ node is created
  const cppNodeId = wrapper.node.cppNodeId;
  if (cppNodeId) {
    for (const gesture of gestures) {
      gesture._attach(cppNodeId);
    }
  }

  return wrapper;
}
