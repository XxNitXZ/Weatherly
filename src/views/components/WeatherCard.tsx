import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardShadow, skyColors } from '../../theme/sky';
import { radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';

export type WeatherCardProps = {
  /** Small heading at the top of the card, e.g. "Rest of today". */
  readonly title: string;
  readonly children: ReactNode;
};

/**
 * The shared glass card on the sky background (SPEC D-33), used by the
 * hourly and seven-day forecasts so both look the same.
 */
export function WeatherCard({ title, children }: WeatherCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: skyColors.cardBorder,
    backgroundColor: skyColors.card,
    boxShadow: cardShadow,
  },
  title: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
});
