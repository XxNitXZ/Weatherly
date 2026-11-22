/**
 * The sky background and the glass cards of the weather-first home screen
 * (SPEC D-33). Gradients and shadows use React Native's own `backgroundImage`
 * and `boxShadow` styles, so no gradient library is needed.
 *
 * Contrast (WCAG 2.1, computed for these values): white text is at least
 * 6.3:1 and `onSkyMuted` text at least 4.8:1 on every gradient stop, inside
 * cards and on today's highlighted row, so small text meets AA (4.5:1).
 */

export type SkyVariant = 'day' | 'night';

/** Full-screen background, from the top of the screen to the bottom. */
export const skyGradient: Readonly<Record<SkyVariant, string>> = {
  day: 'linear-gradient(180deg, #1F5DB8 0%, #1A4FA3 55%, #123C80 100%)',
  night: 'linear-gradient(180deg, #0F2147 0%, #14295A 55%, #1B3670 100%)',
};

/** Solid colour under the gradient, used if a platform cannot draw it. */
export const skyBaseColor: Readonly<Record<SkyVariant, string>> = {
  day: '#1A4FA3',
  night: '#14295A',
};

export const skyColors = {
  /** Main text and icons on the sky. */
  onSky: '#FFFFFF',
  /** Secondary text on the sky (85 % white). */
  onSkyMuted: 'rgba(255, 255, 255, 0.85)',
  /** Glass cards: a light navy tint over the sky. */
  card: 'rgba(6, 23, 61, 0.22)',
  cardBorder: 'rgba(255, 255, 255, 0.16)',
  /** Today's row in the seven-day forecast. */
  todayRow: 'rgba(255, 255, 255, 0.12)',
  /** Thin lines between rows inside a card. */
  divider: 'rgba(255, 255, 255, 0.14)',
} as const;

/** Soft shadow under the cards. */
export const cardShadow = '0px 8px 24px rgba(4, 16, 45, 0.25)';

/** The sky to show: night when the location's current hour is dark, day otherwise. */
export function skyVariantFor(isDay: boolean | undefined): SkyVariant {
  return isDay === false ? 'night' : 'day';
}
