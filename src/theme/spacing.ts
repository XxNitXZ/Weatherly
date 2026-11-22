/**
 * Spacing and size tokens in points (STYLE.md §12).
 * Minimal starting set (US-02.04, US-03.01), extended for the weather-first
 * home screen (SPEC D-33); extended further in US-08.01.
 */
export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 40,
} as const;

/** Minimum size of anything the user can tap (STYLE.md §15). */
export const MIN_TOUCH_TARGET = 44;

/**
 * Screen content never grows wider than this, so lines stay readable on
 * tablets and in landscape (STYLE.md §14). Narrower screens use full width.
 */
export const CONTENT_MAX_WIDTH = 600;

/**
 * Width of one hour in today's horizontal forecast: time, icon and
 * temperature (the condition is in the screen-reader label only).
 */
export const HOURLY_ITEM_WIDTH = 60;

/** Width of the low and high temperature columns in the seven-day rows, so they line up. */
export const FORECAST_TEMPERATURE_WIDTH = 44;

export const radius = {
  s: 8,
  /** Weather cards on the sky background. */
  l: 20,
} as const;

/** Weather icon sizes. */
export const iconSize = {
  s: 24,
  m: 28,
  hero: 72,
} as const;
