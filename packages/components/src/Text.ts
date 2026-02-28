/**
 * Text — Text rendering component.
 *
 * Creates a text node that renders via the Skia Paragraph API.
 * Text content is passed as the first argument to the factory.
 * Returns a chainable builder for font and style modifiers.
 *
 * Text nodes are leaf nodes — they do not accept children.
 *
 * @example
 * ```ts
 * import { Text } from '@zilol-native/components';
 * import { signal } from '@zilol-native/runtime';
 *
 * // Static text
 * Text('Hello, World!')
 *   .fontSize(24)
 *   .fontWeight('bold')
 *   .color('#FFFFFF');
 *
 * // Reactive text
 * const count = signal(0);
 * Text(() => `Count: ${count.value}`)
 *   .fontSize(18)
 *   .color('#E2E8F0');
 * ```
 */

import { createTextNode } from "@zilol-native/nodes";
import { effect } from "@zilol-native/runtime";
import type {
  SkiaNode,
  TextAlign,
  FontWeight as FontWeightType,
  TextOverflow,
} from "@zilol-native/nodes";
import { ComponentBase } from "./ComponentBase";

// ---------------------------------------------------------------------------
// Reactive setter helper
// ---------------------------------------------------------------------------

type Val<T> = T | (() => T);

function setProp(node: SkiaNode, key: string, value: unknown): void {
  if (typeof value === "function") {
    const accessor = value as () => unknown;
    effect(() => {
      node.setProp(key as any, accessor());
    });
  } else {
    node.setProp(key as any, value);
  }
}

// ---------------------------------------------------------------------------
// TextBuilder
// ---------------------------------------------------------------------------

export class TextBuilder extends ComponentBase {
  readonly node: SkiaNode;

  constructor(text?: string | (() => string)) {
    super();
    this.node = createTextNode();

    if (text !== undefined) {
      setProp(this.node, "text", text);
    }
  }

  // -----------------------------------------------------------------------
  // Text content
  // -----------------------------------------------------------------------

  /** Set or update the text content. */
  text(value: Val<string>): this {
    setProp(this.node, "text", value);
    return this;
  }

  // -----------------------------------------------------------------------
  // Font
  // -----------------------------------------------------------------------

  fontSize(value: Val<number>): this {
    setProp(this.node, "fontSize", value);
    return this;
  }

  fontFamily(value: Val<string>): this {
    setProp(this.node, "fontFamily", value);
    return this;
  }

  fontWeight(value: Val<FontWeightType>): this {
    setProp(this.node, "fontWeight", value);
    return this;
  }

  /** Shorthand: `.bold()` sets fontWeight to "bold". */
  bold(): this {
    return this.fontWeight("bold");
  }

  // -----------------------------------------------------------------------
  // Appearance
  // -----------------------------------------------------------------------

  color(value: Val<string>): this {
    setProp(this.node, "color", value);
    return this;
  }

  backgroundColor(value: Val<string>): this {
    setProp(this.node, "backgroundColor", value);
    return this;
  }

  /** Set border radius for the text background. */
  borderRadius(
    value: Val<
      | number
      | {
          topLeft?: number;
          topRight?: number;
          bottomRight?: number;
          bottomLeft?: number;
        }
    >,
  ): this {
    setProp(this.node, "borderRadius", value);
    return this;
  }

  // -----------------------------------------------------------------------
  // Text layout
  // -----------------------------------------------------------------------

  lineHeight(value: Val<number>): this {
    setProp(this.node, "lineHeight", value);
    return this;
  }

  maxLines(value: Val<number>): this {
    setProp(this.node, "maxLines", value);
    return this;
  }

  textAlign(value: Val<TextAlign>): this {
    setProp(this.node, "textAlign", value);
    return this;
  }

  textOverflow(value: Val<TextOverflow>): this {
    setProp(this.node, "textOverflow", value);
    return this;
  }

  /** Shorthand: `.ellipsis(lines)` sets maxLines and textOverflow. */
  ellipsis(lines: number = 1): this {
    this.maxLines(lines);
    this.textOverflow("ellipsis");
    return this;
  }

  // -----------------------------------------------------------------------
  // Spacing & Decoration
  // -----------------------------------------------------------------------

  letterSpacing(value: Val<number>): this {
    setProp(this.node, "letterSpacing", value);
    return this;
  }

  /** Set text decoration: 'underline', 'line-through', 'overline', 'none'. */
  textDecoration(
    value: Val<"underline" | "line-through" | "overline" | "none">,
  ): this {
    setProp(this.node, "textDecoration", value);
    return this;
  }

  /** Shorthand for `.textDecoration('underline')`. */
  underline(): this {
    return this.textDecoration("underline");
  }

  /** Shorthand for `.textDecoration('line-through')`. */
  strikethrough(): this {
    return this.textDecoration("line-through");
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a text node with optional content.
 *
 * @param text - Static string or reactive accessor for dynamic text
 * @returns A TextBuilder with chainable modifiers
 *
 * @example
 * ```ts
 * Text('Hello').fontSize(18).color('#FFF');
 * Text(() => `Count: ${count.value}`).bold();
 * ```
 */
export function Text(text?: string | (() => string)): TextBuilder {
  return new TextBuilder(text);
}
