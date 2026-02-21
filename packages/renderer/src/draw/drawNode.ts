/**
 * drawNode.ts — Main draw dispatcher.
 *
 * Checks node type, handles opacity/transform wrapping, delegates
 * to the correct draw function, and recurses into children.
 *
 * Debug mode: when enabled, draws colored overlays on dirty nodes
 * so you can see WHICH parts of the UI re-render on state changes.
 */

import type { SkiaNode, Rect, SkiaNodeProps } from "@zilol-native/nodes";
import type { CommandExecutor } from "../pipeline/DisplayList";
import { intersects } from "../pipeline/DamageRect";
import { drawView } from "./drawView";
import { drawText } from "./drawText";
import { drawImage } from "./drawImage";
import { drawScroll } from "./drawScroll";
import { drawActivityIndicator } from "./drawActivityIndicator";

// ---------------------------------------------------------------------------
// Debug overlay configuration
// ---------------------------------------------------------------------------

/** Enable to show colored overlays on dirty (re-rendered) nodes. */
let _showRedraws = false;

/** Rotating colors for debug overlays so consecutive redraws are distinguishable. */
const DEBUG_COLORS = [
  "rgba(255, 0, 0, 0.25)", // red
  "rgba(0, 200, 0, 0.25)", // green
  "rgba(0, 100, 255, 0.25)", // blue
  "rgba(255, 165, 0, 0.25)", // orange
  "rgba(200, 0, 255, 0.25)", // purple
  "rgba(0, 200, 200, 0.25)", // cyan
];
let _debugColorIndex = 0;

/**
 * Enable or disable the redraw debug overlay.
 * When enabled, dirty nodes are highlighted with a semi-transparent
 * colored rectangle so you can see exactly what re-renders.
 */
export function setShowRedraws(enabled: boolean): void {
  _showRedraws = enabled;
}

/** Advance to the next debug color (call once per frame). */
export function _advanceDebugColor(): void {
  _debugColorIndex = (_debugColorIndex + 1) % DEBUG_COLORS.length;
}

// ---------------------------------------------------------------------------
// Main draw dispatcher
// ---------------------------------------------------------------------------

/**
 * Draw a node and recursively draw its children.
 *
 * @param node - The SkiaNode to draw
 * @param damageRect - The damage rect to clip against (skip off-screen nodes)
 * @param executor - The command executor
 */
export function drawNode(
  node: SkiaNode,
  damageRect: Rect,
  executor: CommandExecutor,
): void {
  // Visibility check: skip display:none
  if (node.props.display === "none") return;

  // Bounds check: skip nodes outside the damage rect
  const bounds = node.getWorldBounds();
  if (
    bounds.width > 0 &&
    bounds.height > 0 &&
    !intersects(bounds, damageRect)
  ) {
    return;
  }

  // Handle opacity wrapping
  const opacity =
    node.props.opacity !== undefined ? (node.props.opacity as number) : 1;
  const needsOpacityLayer = opacity < 1 && opacity >= 0;

  if (needsOpacityLayer) {
    executor({
      type: "saveLayerAlpha",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      alpha: opacity,
    });
  }

  // Dispatch by node type
  switch (node.type) {
    case "view":
      drawView(node, damageRect, executor);
      break;
    case "text":
      drawText(node, damageRect, executor);
      break;
    case "image":
      drawImage(node, damageRect, executor);
      break;
    case "scroll":
      drawScroll(node, damageRect, executor);
      break;
    case "activityIndicator":
      drawActivityIndicator(node, damageRect, executor);
      break;
    case "canvas":
      // Custom drawing — the node's onDraw callback handles this.
      // We just provision the save/restore context.
      break;
    case "platform":
      // Native views — no Skia drawing needed. Compositor handles placement.
      break;
    case "marker":
      // Invisible node — skip drawing.
      break;
    default:
      // Unknown type — skip
      break;
  }

  // Recurse into children (unless scroll — it handles its own children)
  if (node.type !== "scroll") {
    for (let i = 0; i < node.children.length; i++) {
      drawNode(node.children[i], damageRect, executor);
    }
  }

  if (needsOpacityLayer) {
    executor({ type: "restore" });
  }

  // ── Debug overlay: highlight dirty nodes ──────────────────
  if (_showRedraws && node.dirty && bounds.width > 0 && bounds.height > 0) {
    const br =
      typeof node.props.borderRadius === "number"
        ? (node.props.borderRadius as number)
        : 0;
    // Draw a semi-transparent colored rectangle over the dirty node
    if (br > 0) {
      executor({
        type: "drawRRect",
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rx: br,
        ry: br,
        color: DEBUG_COLORS[_debugColorIndex],
      });
    } else {
      executor({
        type: "drawRect",
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        color: DEBUG_COLORS[_debugColorIndex],
      });
    }
    // Draw a bright border to make it easier to spot
    executor({
      type: "drawRRectStroke",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rx: br,
      ry: br,
      color: DEBUG_COLORS[_debugColorIndex].replace("0.25", "0.8"),
      strokeWidth: 2,
    });
  }
}
