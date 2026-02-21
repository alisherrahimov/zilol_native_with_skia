/**
 * Image — Display images from file paths or URLs.
 *
 * Creates an image node that loads and renders bitmap images via Skia.
 * Supports both synchronous file loading and async URL loading.
 *
 * @example
 * ```ts
 * import { Image } from '@zilol-native/components';
 *
 * // Load from URL (async)
 * Image("https://picsum.photos/200/200")
 *   .size(200, 200)
 *   .borderRadius(16);
 *
 * // Load from bundle path (sync)
 * Image("/path/to/logo.png")
 *   .size(100, 100);
 * ```
 */

import { createImageNode } from "@zilol-native/nodes";
import type { SkiaNode } from "@zilol-native/nodes";
import { ComponentBase } from "./ComponentBase";

// ---------------------------------------------------------------------------
// ImageBuilder
// ---------------------------------------------------------------------------

type Val<T> = T | (() => T);

export class ImageBuilder extends ComponentBase {
  readonly node: SkiaNode;

  constructor(source: string) {
    super();
    this.node = createImageNode();

    if (source.startsWith("http://") || source.startsWith("https://")) {
      // Async URL loading
      __skiaLoadImageFromURL(source, (imageProxy: any) => {
        if (imageProxy) {
          this.node.setProp("source" as any, imageProxy);
          // Trigger a re-render by marking dirty
          if (this.node.markDirty) {
            this.node.markDirty();
          }
        }
      });
    } else {
      // Synchronous file loading
      const imageProxy = __skiaLoadImage(source);
      if (imageProxy) {
        this.node.setProp("source" as any, imageProxy);
      }
    }
  }

  // ── Visual modifiers ────────────────────────────────────────

  /** Resize mode: how the image fits within its bounds. */
  resizeMode(value: Val<"cover" | "contain" | "stretch" | "center">): this {
    this.node.setProp("resizeMode" as any, value);
    return this;
  }

  /** Tint color applied to the image. */
  tintColor(value: Val<string>): this {
    this.node.setProp("tintColor" as any, value);
    return this;
  }

  /** Background color (shown while image loads or as placeholder). */
  backgroundColor(value: Val<string>): this {
    this.node.setProp("backgroundColor" as any, value);
    return this;
  }

  /** Border radius for rounded image corners. */
  borderRadius(value: Val<number>): this {
    this.node.setProp("borderRadius" as any, value);
    return this;
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Create an Image component that loads and displays an image.
 * Supports both file paths and HTTP/HTTPS URLs.
 *
 * @param source - File path or URL (e.g., "https://example.com/img.png")
 */
export function Image(source: string): ImageBuilder {
  return new ImageBuilder(source);
}
