/**
 * How touchable elements react, the same on every screen (STYLE.md §12;
 * SPEC D-50, US-08.01). Before this file the values differed between
 * components (pressed 0.7 or 0.8, disabled 0.4 or 0.5).
 *
 * A disabled control is never shown by opacity alone: it also sets
 * `disabled` and `accessibilityState.disabled`, so screen readers announce it.
 */
export const interaction = {
  /** Opacity while a button or row is held down. */
  pressedOpacity: 0.7,
  /** Opacity of a control that cannot be used right now. */
  disabledOpacity: 0.5,
} as const;
