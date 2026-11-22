import { StyleSheet, Text, View } from 'react-native';
import type { DailyForecast } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { FORECAST_TEMPERATURE_WIDTH, iconSize, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { presentForecastDayRow } from '../../utils/forecastFormatting';
import { WeatherIcon } from './WeatherIcon';

export type DailyForecastRowProps = {
  readonly day: DailyForecast;
  readonly utcOffsetSeconds: number;
  readonly isToday: boolean;
};

/**
 * One compact row of the seven-day forecast (W-05): "Today" or the weekday
 * with the date, an icon, and the low and high. Today's row is highlighted.
 * The condition is in the screen-reader label. Presentational: all texts
 * come from `presentForecastDayRow`.
 */
export function DailyForecastRow({ day, utcOffsetSeconds, isToday }: DailyForecastRowProps) {
  const forecast = presentForecastDayRow(day, utcOffsetSeconds, isToday);

  return (
    <View
      style={[styles.row, isToday && styles.rowToday]}
      accessible
      accessibilityLabel={forecast.accessibilityLabel}
    >
      <View style={styles.day}>
        <Text style={[styles.title, isToday && styles.titleToday]} numberOfLines={1}>
          {forecast.title}
        </Text>
        <Text style={styles.date} numberOfLines={1}>
          {forecast.date}
        </Text>
      </View>
      <WeatherIcon name={forecast.icon} size={iconSize.m} />
      <Text style={styles.low}>{forecast.lowShort}</Text>
      <Text style={styles.high}>{forecast.highShort}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
  },
  rowToday: {
    backgroundColor: skyColors.todayRow,
  },
  day: {
    flex: 1,
  },
  title: {
    color: skyColors.onSky,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  titleToday: {
    fontWeight: fontWeight.bold,
  },
  date: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.small,
  },
  low: {
    width: FORECAST_TEMPERATURE_WIDTH,
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
    textAlign: 'right',
  },
  high: {
    width: FORECAST_TEMPERATURE_WIDTH,
    color: skyColors.onSky,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: 'right',
  },
});
