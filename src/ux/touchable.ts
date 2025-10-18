// src/ux/touchable.ts
import type { Insets, StyleProp, ViewStyle } from 'react-native';

export const MIN_TOUCH_SIZE = 44;

/**
 * Returns hitSlop to ensure the tap target is at least 44x44
 * without visually increasing the element.
 */
export function ensureMinTouchSize(
  width?: number,
  height?: number,
  min: number = MIN_TOUCH_SIZE,
): Insets | undefined {
  // Sensible default when size is unknown
  if (!width || !height) {
    const pad = Math.ceil((min - 28) / 2); // assume smallish control ~28
    return { top: pad, bottom: pad, left: pad, right: pad };
  }

  const hPad = Math.max(0, (min - width) / 2);
  const vPad = Math.max(0, (min - height) / 2);

  if (hPad <= 0 && vPad <= 0) return undefined;

  // Round to integers to avoid half-pixel oddities
  return {
    left: Math.ceil(hPad),
    right: Math.ceil(hPad),
    top: Math.ceil(vPad),
    bottom: Math.ceil(vPad),
  };
}

/**
 * Convenience: infer width/height from a style prop (if provided),
 * then call ensureMinTouchSize.
 */
export function ensureMinTouchSizeFromStyle(
  style?: StyleProp<ViewStyle>,
  min: number = MIN_TOUCH_SIZE,
): Insets | undefined {
  if (!style) return ensureMinTouchSize(undefined, undefined, min);

  const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
  const width = typeof flat?.width === 'number' ? flat.width : undefined;
  const height = typeof flat?.height === 'number' ? flat.height : undefined;

  return ensureMinTouchSize(width, height, min);
}