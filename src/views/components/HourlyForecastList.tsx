import { FlatList, StyleSheet, Text } from 'react-native';
import type { DailyForecast, HourlyForecast } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { fontSize } from '../../theme/typography';
import { HourlyForecastItem } from './HourlyForecastItem';
import { WeatherCard } from './WeatherCard';
import type { DisplayUnits } from '../../utils/units';

export type HourlyForecastListProps = {
  /** The current hour and the rest of today (`selectRemainingHoursToday`). */
  readonly hours: ReadonlyArray<HourlyForecast>;
  readonly utcOffsetSeconds: number;
  /** The report's days, for day and night icons. */
  readonly daily: ReadonlyArray<DailyForecast>;
  /** The report's fetch time, for the "Now" label. */
  readonly nowEpochMs: number;
  /** The user's display units (W-12; SPEC D-46). */
  readonly units: DisplayUnits;
};

/**
 * Today's remaining hours as a horizontal list in a weather card (W-06,
 * W-21). A horizontal `FlatList` inside the screen's vertical scroll view is
 * allowed: only vertical lists must not be nested (STYLE.md §6).
 */
export function HourlyForecastList({ hours, utcOffsetSeconds, daily, nowEpochMs, units }: HourlyForecastListProps) {
  return (
    <WeatherCard title="Rest of today">
      {hours.length === 0 ? (
        <Text style={styles.empty}>
          No more hourly forecast for today. Tomorrow is in the 7-day forecast below.
        </Text>
      ) : (
        <FlatList
          horizontal
          data={hours}
          keyExtractor={(hour) => String(hour.timeEpochMs)}
          renderItem={({ item }) => (
            <HourlyForecastItem
              hour={item}
              utcOffsetSeconds={utcOffsetSeconds}
              daily={daily}
              nowEpochMs={nowEpochMs}
              units={units}
            />
          )}
          // A unit change must redraw the items, although `hours` is the same.
          extraData={units}
          showsHorizontalScrollIndicator={false}
          accessibilityLabel={`Hourly forecast for the rest of today, ${hours.length} hours`}
        />
      )}
    </WeatherCard>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
  },
});
