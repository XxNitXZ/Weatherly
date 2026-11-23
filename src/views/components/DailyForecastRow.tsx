import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DailyForecast } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { FORECAST_TEMPERATURE_WIDTH, MIN_TOUCH_TARGET, iconSize, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { presentForecastDayRow } from '../../utils/forecastFormatting';
import { WeatherIcon } from './WeatherIcon';

export type DailyForecastRowProps = {
  readonly day: DailyForecast;
  readonly utcOffsetSeconds: number;
  readonly isToday: boolean;
  readonly onPress: () => void;
};

/**
 * One compact row of the seven-day forecast (W-05): "Today" or the weekday
 * with the date, an icon, the low and high, and a chevron showing that the
 * row opens the day's details (W-07). Today's row is highlighted. The
 * condition is in the screen-reader label. Presentational: all texts come
 * from `presentForecastDayRow`, and the screen decides what a tap does.
 */
export function DailyForecastRow({ day, utcOffsetSeconds, isToday, onPress }: DailyForecastRowProps) {
  const forecast = presentForecastDayRow(day, utcOffsetSeconds, isToday);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={forecast.accessibilityLabel}
      accessibilityHint="Opens the details for this day"
      onPress={onPress}
      style={({ pressed }) => [styles.row, isToday && styles.rowToday, pressed && styles.rowPressed]}
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
      <MaterialCommunityIcons
        name="chevron-right"
        size={iconSize.s}
        color={skyColors.onSkyMuted}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.s,
  },
  rowToday: {
    backgroundColor: skyColors.todayRow,
  },
  rowPressed: {
    backgroundColor: skyColors.rowPressed,
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
