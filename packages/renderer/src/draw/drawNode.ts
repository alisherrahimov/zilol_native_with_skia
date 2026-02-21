/**
 * drawNode.ts — Main draw dispatcher.
 *
 * Checks node type, handles opacity/transform wrapping, delegates
 * to the correct draw function, and recurses into children.
 */

import type { SkiaNode, Rect } from "@zilol-native/nodes";
import type { CommandExecutor } from "../pipeline/DisplayList";
import { intersects } from "../pipeline/DamageRect";
import { drawView } from "./drawView";
import { drawText } from "./drawText";
import { drawImage } from "./drawImage";
import { drawScroll } from "./drawScroll";

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
  const opacity = node.opacity;
  const needsOpacityLayer = opacity < 1 && opacity >= 0;

  if (needsOpacityLayer) {
    executor({ type: "save" });
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
}
