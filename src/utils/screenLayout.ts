import { layoutBreakpoints } from '../theme/spacing';

/** The window as `useWindowDimensions()` reports it, in points. */
export type WindowMetrics = {
  readonly width: number;
  readonly height: number;
  /** The system text size; 1 is normal, 1.3 is 30 % larger. */
  readonly fontScale: number;
};

/**
 * How the screens adapt to the window (W-22; SPEC D-50, US-08.02). Every
 * screen keeps one scrolling column in both orientations; only the parts
 * that would not fit change.
 */
export type ScreenLayout = {
  /** A narrow window (or large text): the home header puts its buttons under the title. */
  readonly isCompactWidth: boolean;
  /** A short window, e.g. a phone in landscape: the heroes use their compact size. */
  readonly isShortHeight: boolean;
};

/** The layout for windows with an unusable size: the normal portrait layout. */
const PORTRAIT_LAYOUT: ScreenLayout = { isCompactWidth: false, isShortHeight: false };

/**
 * The layout for a window. Pure, so it can be unit-tested; the screens call
 * it with `useWindowDimensions()`, which updates on every rotation, so the
 * layout follows the device without restarting any request.
 *
 * - Only width and height matter, not the orientation: a tablet in
 *   landscape is neither narrow nor short and keeps the normal layout.
 * - Larger text needs more room for the same title, so the width limit grows
 *   with `fontScale`. Smaller text never makes a narrow window wide.
 * - Sizes that are not positive finite numbers (e.g. 0 before the first
 *   layout pass) give the normal portrait layout; an unusable `fontScale`
 *   counts as 1.
 */
export function screenLayoutFor({ width, height, fontScale }: WindowMetrics): ScreenLayout {
  if (!isPositiveSize(width) || !isPositiveSize(height)) {
    return PORTRAIT_LAYOUT;
  }
  const textScale = isPositiveSize(fontScale) ? Math.max(1, fontScale) : 1;
  return {
    isCompactWidth: width < layoutBreakpoints.compactWidth * textScale,
    isShortHeight: height < layoutBreakpoints.shortHeight,
  };
}

function isPositiveSize(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
