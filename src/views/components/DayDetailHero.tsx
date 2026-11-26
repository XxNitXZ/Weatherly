import { StyleSheet, Text, View } from 'react-native';
import type { DailyForecast } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { presentDayDetail } from '../../utils/forecastFormatting';
import { WeatherIcon } from './WeatherIcon';
import type { DisplayUnits } from '../../utils/units';

export type DayDetailHeroProps = {
  readonly day: DailyForecast;
  /** The location's UTC offset from the report, so the date is the location's date. */
  readonly utcOffsetSeconds: number;
  /** The user's display units (W-12; SPEC D-46). */
  readonly units: DisplayUnits;
  /** A short window, e.g. a phone in landscape (`screenLayoutFor`): the compact size. */
  readonly isCompact: boolean;
};

/**
 * The top of the day detail screen (W-07, NIT-233): the weekday and date,
 * a large icon, the condition and the day's high and low with full units,
 * then the feels-like high and low when the API sent both (SPEC D-43).
 * Built like the home screen's `WeatherHero`. Presentational: all texts come
 * from `presentDayDetail`, and screen readers hear the block as one sentence.
 *
 * Compact (US-08.02; SPEC D-50): a smaller icon and less padding, so in
 * landscape on a phone the first card starts on the first screen.
 */
export function DayDetailHero({ day, utcOffsetSeconds, units, isCompact }: DayDetailHeroProps) {
  const detail = presentDayDetail(day, utcOffsetSeconds, units);

  return (
    <View
      style={[styles.hero, isCompact && styles.heroCompact]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={detail.accessibilityLabel}
    >
      <Text style={styles.weekday}>{detail.weekday}</Text>
      <Text style={styles.date}>{detail.date}</Text>
      <View style={isCompact ? undefined : styles.icon}>
        <WeatherIcon name={detail.icon} size={isCompact ? iconSize.heroCompact : iconSize.hero} />
      </View>
      <Text style={styles.condition}>{detail.condition}</Text>
      <Text style={styles.highLow}>
        High {detail.high}  ·  Low {detail.low}
      </Text>
      {detail.feelsLike !== undefined && <Text style={styles.feelsLike}>Feels like {detail.feelsLike}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.l,
  },
  heroCompact: {
    paddingVertical: spacing.s,
  },
  weekday: {
    color: skyColors.onSky,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  date: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  icon: {
    marginVertical: spacing.s,
  },
  condition: {
    color: skyColors.onSky,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  highLow: {
    color: skyColors.onSky,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  feelsLike: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
