---
title: Styling
description: Complete reference for layout and visual style properties.
order: 12
---

## Layout Props

All layout properties are mapped to Yoga (flexbox):

```typescript
interface LayoutProps {
  // Dimensions
  width?: DimensionValue;
  height?: DimensionValue;
  minWidth?: DimensionValue;
  maxWidth?: DimensionValue;
  minHeight?: DimensionValue;
  maxHeight?: DimensionValue;

  // Flex
  flex?: number;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: DimensionValue;

  // Alignment
  alignItems?: AlignValue;
  alignSelf?: AlignValue;
  alignContent?: AlignValue;
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";

  // Spacing
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginHorizontal?: number;
  marginVertical?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  gap?: number;
  rowGap?: number;
  columnGap?: number;

  // Position
  position?: "relative" | "absolute";
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;

  // Other
  overflow?: "visible" | "hidden" | "scroll";
  aspectRatio?: number;
  display?: "flex" | "none";
}

type DimensionValue = number | `${number}%` | "auto";
type AlignValue = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
```

## Style Props

Visual properties rendered by Skia:

```typescript
interface StyleProps {
  // Background
  backgroundColor?: string | (() => string);

  // Border
  borderWidth?: number | (() => number);
  borderColor?: string | (() => string);
  borderRadius?: number | (() => number);
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;

  // Shadow
  shadowColor?: string | (() => string);
  shadowOffset?: { width: number; height: number };
  shadowRadius?: number | (() => number);
  shadowOpacity?: number | (() => number);
  elevation?: number | (() => number);

  // Transform
  transform?: TransformValue | (() => TransformValue);
  transformOrigin?: TransformOrigin;

  // Appearance
  opacity?: number | (() => number);
  blur?: number | (() => number);
  backdropBlur?: number | (() => number);
}
```

## Static vs Reactive

Any style prop can be either static or reactive:

```typescript
// Static — set once, zero overhead
View().backgroundColor("#2196F3");

// Reactive — creates an effect that updates on change
View().backgroundColor(() => theme.value.bgColor);
```

The framework detects function values at creation time and wraps them in effects automatically.
