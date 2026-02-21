/**
 * constants.ts — Yoga enum constants and string-to-enum mappers.
 *
 * Numeric values match Yoga C++ YGEnums.h. No npm dependency needed.
 * These are passed directly to the JSI __yoga* functions.
 */

// ---------------------------------------------------------------------------
// Flex Direction (YGFlexDirection)
// ---------------------------------------------------------------------------

export const enum FlexDirection {
  Column = 0,
  ColumnReverse = 1,
  Row = 2,
  RowReverse = 3,
}

const FLEX_DIRECTION: Record<string, FlexDirection> = {
  column: FlexDirection.Column,
  "column-reverse": FlexDirection.ColumnReverse,
  row: FlexDirection.Row,
  "row-reverse": FlexDirection.RowReverse,
};

export function toFlexDirection(
  value: string | undefined,
): FlexDirection | undefined {
  return value !== undefined ? FLEX_DIRECTION[value] : undefined;
}

// ---------------------------------------------------------------------------
// Justify Content (YGJustify)
// ---------------------------------------------------------------------------

export const enum Justify {
  FlexStart = 0,
  Center = 1,
  FlexEnd = 2,
  SpaceBetween = 3,
  SpaceAround = 4,
  SpaceEvenly = 5,
}

const JUSTIFY_CONTENT: Record<string, Justify> = {
  "flex-start": Justify.FlexStart,
  center: Justify.Center,
  "flex-end": Justify.FlexEnd,
  "space-between": Justify.SpaceBetween,
  "space-around": Justify.SpaceAround,
  "space-evenly": Justify.SpaceEvenly,
};

export function toJustifyContent(
  value: string | undefined,
): Justify | undefined {
  return value !== undefined ? JUSTIFY_CONTENT[value] : undefined;
}

// ---------------------------------------------------------------------------
// Align (YGAlign)
// ---------------------------------------------------------------------------

export const enum Align {
  Auto = 0,
  FlexStart = 1,
  Center = 2,
  FlexEnd = 3,
  Stretch = 4,
  Baseline = 5,
  SpaceBetween = 6,
  SpaceAround = 7,
}

const ALIGN: Record<string, Align> = {
  auto: Align.Auto,
  "flex-start": Align.FlexStart,
  center: Align.Center,
  "flex-end": Align.FlexEnd,
  stretch: Align.Stretch,
  baseline: Align.Baseline,
};

export function toAlign(value: string | undefined): Align | undefined {
  return value !== undefined ? ALIGN[value] : undefined;
}

// ---------------------------------------------------------------------------
// Position Type (YGPositionType)
// ---------------------------------------------------------------------------

export const enum PositionType {
  Static = 0,
  Relative = 1,
  Absolute = 2,
}

const POSITION_TYPE: Record<string, PositionType> = {
  static: PositionType.Static,
  relative: PositionType.Relative,
  absolute: PositionType.Absolute,
};

export function toPositionType(
  value: string | undefined,
): PositionType | undefined {
  return value !== undefined ? POSITION_TYPE[value] : undefined;
}

// ---------------------------------------------------------------------------
// Overflow (YGOverflow)
// ---------------------------------------------------------------------------

export const enum Overflow {
  Visible = 0,
  Hidden = 1,
  Scroll = 2,
}

const OVERFLOW_MAP: Record<string, Overflow> = {
  visible: Overflow.Visible,
  hidden: Overflow.Hidden,
  scroll: Overflow.Scroll,
};

export function toOverflow(value: string | undefined): Overflow | undefined {
  return value !== undefined ? OVERFLOW_MAP[value] : undefined;
}

// ---------------------------------------------------------------------------
// Display (YGDisplay)
// ---------------------------------------------------------------------------

export const enum Display {
  Flex = 0,
  None = 1,
}

const DISPLAY: Record<string, Display> = {
  flex: Display.Flex,
  none: Display.None,
};

export function toDisplay(value: string | undefined): Display | undefined {
  return value !== undefined ? DISPLAY[value] : undefined;
}

// ---------------------------------------------------------------------------
// Wrap (YGWrap)
// ---------------------------------------------------------------------------

export const enum Wrap {
  NoWrap = 0,
  Wrap = 1,
  WrapReverse = 2,
}

const FLEX_WRAP: Record<string, Wrap> = {
  nowrap: Wrap.NoWrap,
  wrap: Wrap.Wrap,
  "wrap-reverse": Wrap.WrapReverse,
};

export function toFlexWrap(value: string | undefined): Wrap | undefined {
  return value !== undefined ? FLEX_WRAP[value] : undefined;
}

// ---------------------------------------------------------------------------
// Direction (YGDirection)
// ---------------------------------------------------------------------------

export const enum Direction {
  Inherit = 0,
  LTR = 1,
  RTL = 2,
}

export const LTR = Direction.LTR;
export const RTL = Direction.RTL;

// ---------------------------------------------------------------------------
// Edge (YGEdge)
// ---------------------------------------------------------------------------

export const enum Edge {
  Left = 0,
  Top = 1,
  Right = 2,
  Bottom = 3,
  Start = 4,
  End = 5,
  Horizontal = 6,
  Vertical = 7,
  All = 8,
}

export const EDGE_TOP = Edge.Top;
export const EDGE_RIGHT = Edge.Right;
export const EDGE_BOTTOM = Edge.Bottom;
export const EDGE_LEFT = Edge.Left;
export const EDGE_ALL = Edge.All;

// ---------------------------------------------------------------------------
// Gutter (YGGutter)
// ---------------------------------------------------------------------------

export const enum Gutter {
  Column = 0,
  Row = 1,
  All = 2,
}
