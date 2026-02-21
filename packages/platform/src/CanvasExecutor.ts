/**
 * CanvasExecutor.ts — Bridges renderer DrawCommands to Skia JSI canvas.
 *
 * The renderer produces abstract DrawCommand objects. This module
 * executes them by calling the corresponding methods on the native
 * Skia canvas proxy (SkiaCanvasProxy from JSI).
 *
 * This is the CommandExecutor implementation used in production.
 */

import type { DrawCommand } from "@zilol-native/renderer";

// ---------------------------------------------------------------------------
// CanvasExecutor
// ---------------------------------------------------------------------------

/**
 * Create a CommandExecutor that draws to a Skia canvas proxy.
 *
 * @param canvas - The SkiaCanvasProxy from JSI
 * @returns A function that accepts DrawCommands and executes them
 */
export function createCanvasExecutor(
  canvas: SkiaCanvasProxy,
): (command: DrawCommand) => void {
  return (command: DrawCommand): void => {
    switch (command.type) {
      case "drawRect":
        canvas.drawRect(
          command.x,
          command.y,
          command.width,
          command.height,
          command.color,
        );
        break;

      case "drawRRect":
        canvas.drawRRect(
          command.x,
          command.y,
          command.width,
          command.height,
          command.rx,
          command.ry,
          command.color,
        );
        break;

      case "drawRRectStroke":
        canvas.drawRRectStroke(
          command.x,
          command.y,
          command.width,
          command.height,
          command.rx,
          command.ry,
          command.color,
          command.strokeWidth,
        );
        break;

      case "drawText":
        canvas.drawText(
          command.text,
          command.x,
          command.y,
          command.color,
          command.fontSize,
        );
        break;

      case "drawShadow":
        canvas.drawShadow(
          command.x,
          command.y,
          command.width,
          command.height,
          command.rx,
          command.ry,
          command.color,
          command.offsetX,
          command.offsetY,
          command.blurRadius,
        );
        break;

      case "clipRRect":
        canvas.clipRRect(
          command.x,
          command.y,
          command.width,
          command.height,
          command.rx,
          command.ry,
        );
        break;

      case "save":
        canvas.save();
        break;

      case "restore":
        canvas.restore();
        break;

      case "translate":
        canvas.translate(command.dx, command.dy);
        break;

      case "clear":
        canvas.clear(command.color);
        break;

      case "drawImage":
        // Image drawing is handled separately by the platform layer
        // since it requires async image loading and SkImage management.
        break;

      default: {
        // Exhaustive check — if a new command type is added,
        // TypeScript will flag this as an error.
        const _exhaustive: never = command;
        void _exhaustive;
      }
    }
  };
}
