/**
 * Window-size breakpoints for portrait and landscape layouts (W-22; SPEC
 * D-49, US-08.02). `screenLayoutFor` in `src/utils/screenLayout.ts` turns
 * the window size into a layout; screens never compare sizes themselves.
 *
 * Reference sizes in points: small phones are about 320–375 wide in
 * portrait; phones in landscape are about 568–932 wide and 320–440 high.
 */
export const layoutBreakpoints = {
  /** Below this width, the home header puts its buttons under the title. */
  compactWidth: 360,
  /** Below this height (phones in landscape), the heroes use smaller type and icons. */
  shortHeight: 500,
  /** From this width in landscape, the home screen shows two columns. */
  twoColumnMinWidth: 700,
} as const;

/** Content width with two columns; one column keeps `CONTENT_MAX_WIDTH`. */
export const WIDE_CONTENT_MAX_WIDTH = 1040;

/**
 * Smallest width of one card on the day detail screen. Cards wrap side by
 * side when there is room (two or three in landscape), one per row in portrait.
 */
export const DETAIL_CARD_MIN_WIDTH = 280;
