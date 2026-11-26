import { WIDE_CONTENT_MAX_WIDTH, layoutBreakpoints } from '../theme/layout';
import { CONTENT_MAX_WIDTH } from '../theme/spacing';

/**
 * How a screen arranges its content for the current window (W-22; SPEC D-49,
 * US-08.02). Pure: the screens pass in `useWindowDimensions()`, so the
 * layout follows a real rotation or window change and can be unit-tested.
 * Nothing here forces an orientation; `app.json` allows both.
 */
export type ScreenLayout = {
  readonly orientation: 'portrait' | 'landscape';
  /** Narrow phone: the home header puts its buttons on a second row. */
  readonly isCompactWidth: boolean;
  /** Little height (a phone in landscape): heroes use their compact size. */
  readonly isShortHeight: boolean;
  /** 2 on wide landscape windows: weather hero beside the forecasts. */
  readonly columns: 1 | 2;
  /** The widest the centred content may grow. */
  readonly contentMaxWidth: number;
};

export type WindowSize = {
  readonly width: number;
  readonly height: number;
};

/**
 * The layout for a window. A square window counts as portrait. Sizes that
 * are not positive finite numbers (e.g. 0 before the first layout pass) are
 * treated as a portrait phone, the safest single-column layout.
 */
export function screenLayoutFor({ width, height }: WindowSize): ScreenLayout {
  if (!isPositive(width) || !isPositive(height)) {
    return {
      orientation: 'portrait',
      isCompactWidth: false,
      isShortHeight: false,
      columns: 1,
      contentMaxWidth: CONTENT_MAX_WIDTH,
    };
  }
  const orientation = width > height ? 'landscape' : 'portrait';
  const columns = orientation === 'landscape' && width >= layoutBreakpoints.twoColumnMinWidth ? 2 : 1;
  return {
    orientation,
    isCompactWidth: width < layoutBreakpoints.compactWidth,
    isShortHeight: height < layoutBreakpoints.shortHeight,
    columns,
    contentMaxWidth: columns === 2 ? WIDE_CONTENT_MAX_WIDTH : CONTENT_MAX_WIDTH,
  };
}

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
