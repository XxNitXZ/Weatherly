import { StyleSheet, Text, View } from 'react-native';
import type { DailyForecast } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { presentDayDetail } from '../../utils/forecastFormatting';
import { WeatherIcon } from './WeatherIcon';

export type DayDetailHeroProps = {
  readonly day: DailyForecast;
  /** The location's UTC offset from the report, so the date is the location's date. */
  readonly utcOffsetSeconds: number;
};

/**
 * The top of the day detail screen (W-07, NIT-233): the weekday and date,
 * a large icon, the condition and the day's high and low with full units,
 * then the feels-like high and low when the API sent both (SPEC D-39).
 * Built like the home screen's `WeatherHero`. Presentational: all texts come
 * from `presentDayDetail`, and screen readers hear the block as one sentence.
 */
export function DayDetailHero({ day, utcOffsetSeconds }: DayDetailHeroProps) {
  const detail = presentDayDetail(day, utcOffsetSeconds);

  return (
    <View
      style={styles.hero}
      accessible
      accessibilityRole="header"
      accessibilityLabel={detail.accessibilityLabel}
    >
      <Text style={styles.weekday}>{detail.weekday}</Text>
      <Text style={styles.date}>{detail.date}</Text>
      <View style={styles.icon}>
        <WeatherIcon name={detail.icon} size={iconSize.hero} />
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
