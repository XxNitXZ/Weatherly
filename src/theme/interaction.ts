/**
 * How touchable elements react, the same on every screen (STYLE.md §12;
 * SPEC D-49, US-08.01). Before this file the values differed between
 * components: 0.7 or 0.8 while pressed, 0.4 or 0.5 when disabled.
 *
 * Opacity is never the only sign of a disabled control: it also sets
 * `disabled` and `accessibilityState.disabled`, so screen readers announce it.
 */
export const interaction = {
  /** Opacity while a button or row is held down. */
  pressedOpacity: 0.7,
  /** Opacity of a control that cannot be used right now. */
  disabledOpacity: 0.5,
} as const;
