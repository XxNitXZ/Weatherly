/**
 * Font size and weight tokens (STYLE.md §12).
 * Minimal starting set (US-02.04, US-03.01, US-03.02), extended for the
 * weather-first home screen (SPEC D-33); extended further in US-08.01.
 */
export const fontSize = {
  small: 13,
  body: 16,
  heading: 20,
  title: 28,
  /** The current temperature in the weather hero, the largest text on the screen. */
  hero: 96,
} as const;

export const fontWeight = {
  /** Thin weight for the large hero temperature. */
  light: '200',
  regular: '400',
  semibold: '600',
  bold: '700',
} as const;
