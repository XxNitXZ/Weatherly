import { StyleSheet, Text, View } from 'react-native';
import type { DailyForecast, HourlyForecast } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { HOURLY_ITEM_WIDTH, iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { presentForecastHourItem } from '../../utils/forecastFormatting';
import { WeatherIcon } from './WeatherIcon';

export type HourlyForecastItemProps = {
  readonly hour: HourlyForecast;
  readonly utcOffsetSeconds: number;
  /** The report's days, for the sunrise and sunset that choose the day or night icon. */
  readonly daily: ReadonlyArray<DailyForecast>;
  /** The report's fetch time; the hour that contains it is labelled "Now". */
  readonly nowEpochMs: number;
};

/**
 * One hour of today's forecast (W-06): "Now" or the local time, an icon and
 * the temperature. The condition is in the screen-reader label.
 * Presentational: all texts come from `presentForecastHourItem`.
 */
export function HourlyForecastItem({ hour, utcOffsetSeconds, daily, nowEpochMs }: HourlyForecastItemProps) {
  const forecast = presentForecastHourItem(hour, utcOffsetSeconds, daily, nowEpochMs);
  const isNow = forecast.label === 'Now';

  return (
    <View style={styles.item} accessible accessibilityLabel={forecast.accessibilityLabel}>
      <Text style={[styles.label, isNow && styles.labelNow]}>{forecast.label}</Text>
      <WeatherIcon name={forecast.icon} size={iconSize.m} />
      <Text style={styles.temperature}>{forecast.temperatureShort}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    width: HOURLY_ITEM_WIDTH,
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.s,
  },
  label: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  labelNow: {
    color: skyColors.onSky,
  },
  temperature: {
    color: skyColors.onSky,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
