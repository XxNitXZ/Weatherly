/**
 * Spacing and size tokens in points (STYLE.md §12).
 * Minimal starting set (US-02.04); extended in US-08.01.
 */
export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
} as const;

/** Minimum size of anything the user can tap (STYLE.md §15). */
export const MIN_TOUCH_TARGET = 44;

export const radius = {
  s: 8,
} as const;
