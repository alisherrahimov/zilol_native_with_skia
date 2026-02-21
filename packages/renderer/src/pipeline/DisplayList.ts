/**
 * DisplayList.ts — Cached draw commands per node.
 *
 * Instead of drawing directly to the Skia canvas on every frame,
 * we generate a list of draw commands that can be cached and replayed.
 * Only regenerated when the node is dirty.
 */

import type { SkiaNode } from "@zilol-native/nodes";
import type { DrawCommand, SkCanvas, SkPaint } from "../types";

// ---------------------------------------------------------------------------
// DisplayList
// ---------------------------------------------------------------------------

export class DisplayList {
  readonly commands: DrawCommand[] = [];

  /** Add a command to the list. */
  push(command: DrawCommand): void {
    this.commands.push(command);
  }

  /** Clear all commands. */
  clear(): void {
    this.commands.length = 0;
  }

  /**
   * Execute all commands on a canvas.
   *
   * In production, this maps DrawCommands to actual Skia canvas calls.
   * The provided executor function handles the mapping.
   */
  execute(executor: CommandExecutor): void {
    for (let i = 0; i < this.commands.length; i++) {
      executor(this.commands[i]);
    }
  }

  /** Number of commands. */
  get length(): number {
    return this.commands.length;
  }

  // -----------------------------------------------------------------------
  // Static generators
  // -----------------------------------------------------------------------

  /**
   * Generate a display list for a view node.
   *
   * Creates draw commands for: shadow, background, border, clip.
   */
  static generateForView(node: SkiaNode): DisplayList {
    const list = new DisplayList();
    const layout = node.layout;
    const props = node.props;

    const x = layout.absoluteX;
    const y = layout.absoluteY;
    const w = layout.width;
    const h = layout.height;

    if (w <= 0 || h <= 0) return list;

    // Resolve border radius
    const br = resolveBorderRadius(props.borderRadius);

    // Shadow (drawn BEFORE background)
    if (props.shadow) {
      const shadow = props.shadow as {
        color: string;
        offsetX: number;
        offsetY: number;
        blurRadius: number;
      };
      list.push({
        type: "drawShadow",
        x,
        y,
        width: w,
        height: h,
        rx: br,
        ry: br,
        color: shadow.color ?? "rgba(0,0,0,0.25)",
        offsetX: shadow.offsetX ?? 0,
        offsetY: shadow.offsetY ?? 0,
        blurRadius: shadow.blurRadius ?? 4,
      });
    }

    // Background
    if (props.backgroundColor) {
      if (br > 0) {
        list.push({
          type: "drawRRect",
          x,
          y,
          width: w,
          height: h,
          rx: br,
          ry: br,
          color: props.backgroundColor as string,
        });
      } else {
        list.push({
          type: "drawRect",
          x,
          y,
          width: w,
          height: h,
          color: props.backgroundColor as string,
        });
      }
    }

    // Border
    if (props.borderWidth && props.borderColor) {
      list.push({
        type: "drawRRectStroke",
        x,
        y,
        width: w,
        height: h,
        rx: br,
        ry: br,
        color: props.borderColor as string,
        strokeWidth: props.borderWidth as number,
      });
    }

    // Clip for overflow: hidden
    if (props.overflow === "hidden" || props.clip) {
      list.push({
        type: "clipRRect",
        x,
        y,
        width: w,
        height: h,
        rx: br,
        ry: br,
      });
    }

    return list;
  }

  /**
   * Generate a display list for a text node.
   */
  static generateForText(node: SkiaNode): DisplayList {
    const list = new DisplayList();
    const layout = node.layout;
    const props = node.props;

    if (!props.text) return list;

    list.push({
      type: "drawText",
      text: props.text as string,
      x: layout.absoluteX,
      y: layout.absoluteY,
      color: (props.color as string) ?? "#000000",
      fontSize: (props.fontSize as number) ?? 14,
      textAlign: props.textAlign as "left" | "center" | "right" | undefined,
      layoutWidth: layout.width,
    });

    return list;
  }

  /**
   * Generate a display list for an image node.
   */
  static generateForImage(node: SkiaNode): DisplayList {
    const list = new DisplayList();
    const layout = node.layout;

    if (layout.width <= 0 || layout.height <= 0) return list;

    const source = node.props.source as any;
    const br = resolveBorderRadius(node.props.borderRadius);

    if (source && typeof source.width === "function") {
      // Clip for borderRadius
      if (br > 0) {
        list.push({ type: "save" });
        list.push({
          type: "clipRRect",
          x: layout.absoluteX,
          y: layout.absoluteY,
          width: layout.width,
          height: layout.height,
          rx: br,
          ry: br,
        });
      }

      // We have a loaded SkImage — emit a real draw command
      list.push({
        type: "drawImage",
        image: source,
        x: layout.absoluteX,
        y: layout.absoluteY,
        width: layout.width,
        height: layout.height,
      });

      if (br > 0) {
        list.push({ type: "restore" });
      }
    } else {
      // No image loaded yet — draw gray placeholder
      if (br > 0) {
        list.push({
          type: "drawRRect",
          x: layout.absoluteX,
          y: layout.absoluteY,
          width: layout.width,
          height: layout.height,
          rx: br,
          ry: br,
          color: "#CCCCCC",
        });
      } else {
        list.push({
          type: "drawRect",
          x: layout.absoluteX,
          y: layout.absoluteY,
          width: layout.width,
          height: layout.height,
          color: "#CCCCCC",
        });
      }
    }

    return list;
  }

  /**
   * Generate a display list for any node type.
   */
  static generate(node: SkiaNode): DisplayList {
    switch (node.type) {
      case "view":
        return DisplayList.generateForView(node);
      case "text":
        return DisplayList.generateForText(node);
      case "image":
        return DisplayList.generateForImage(node);
      case "scroll":
        return DisplayList.generateForView(node); // scroll draws like a view + clip
      case "activityIndicator":
        return new DisplayList(); // draw handled by drawActivityIndicator
      case "canvas":
        return new DisplayList(); // custom draw handled separately
      case "marker":
        return new DisplayList(); // invisible
      case "platform":
        return new DisplayList(); // handled by native layer
      default:
        return new DisplayList();
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Command executor function type. */
export type CommandExecutor = (command: DrawCommand) => void;

/** Resolve borderRadius from the props value. */
function resolveBorderRadius(value: unknown): number {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "topLeft" in value &&
    typeof value.topLeft === "number"
  ) {
    // For now, use topLeft as uniform radius.
    // Per-corner radii support will be added in Phase 5.
    return value.topLeft;
  }
  return 0;
}
