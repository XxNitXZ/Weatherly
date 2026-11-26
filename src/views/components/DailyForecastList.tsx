import { StyleSheet, Text, View } from 'react-native';
import type { DailyForecast } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { fontSize } from '../../theme/typography';
import { DailyForecastRow } from './DailyForecastRow';
import { WeatherCard } from './WeatherCard';
import type { DisplayUnits } from '../../utils/units';

export type DailyForecastListProps = {
  /** Today first; at most seven days (`selectForecastDays`). */
  readonly days: ReadonlyArray<DailyForecast>;
  /** `dateEpochMs` of today's entry, if today is in the data. */
  readonly todayDateEpochMs?: number;
  readonly utcOffsetSeconds: number;
  /** Called with the tapped day; the screen opens its details. */
  readonly onSelectDay: (day: DailyForecast) => void;
  /** The user's display units (W-12; SPEC D-46). */
  readonly units: DisplayUnits;
};

/**
 * The seven-day forecast card (W-05, W-21). The rows are mapped in a plain
 * `View`, not a `FlatList`: there are at most seven, and the screen already
 * scrolls vertically, which must not contain another vertical list
 * (STYLE.md §6). The list does not navigate; it reports the tapped day to
 * the screen (STYLE.md §3.3).
 */
export function DailyForecastList({ days, todayDateEpochMs, utcOffsetSeconds, onSelectDay, units }: DailyForecastListProps) {
  return (
    <WeatherCard title="7-day forecast">
      {days.length === 0 ? (
        <Text style={styles.empty}>No daily forecast is available for this place.</Text>
      ) : (
        days.map((day, index) => (
          <View key={day.dateEpochMs} style={index > 0 && styles.divider}>
            <DailyForecastRow
              day={day}
              utcOffsetSeconds={utcOffsetSeconds}
              isToday={day.dateEpochMs === todayDateEpochMs}
              onPress={() => onSelectDay(day)}
              units={units}
            />
          </View>
        ))
      )}
    </WeatherCard>
  );
}

const styles = StyleSheet.create({
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: skyColors.divider,
  },
  empty: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
  },
});
