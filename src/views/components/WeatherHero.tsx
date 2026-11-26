import { StyleSheet, Text, View } from 'react-native';
import type { CurrentWeather, DailyForecast } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { presentWeatherHero } from '../../utils/weatherFormatting';
import { WeatherIcon } from './WeatherIcon';
import type { DisplayUnits } from '../../utils/units';

export type WeatherHeroProps = {
  readonly current: CurrentWeather;
  /** The location's UTC offset from the report, for the observation time. */
  readonly utcOffsetSeconds: number;
  /** Today's daily entry from the same report, for the high and low. */
  readonly today: DailyForecast | undefined;
  /** The user's display units (W-12; SPEC D-46). */
  readonly units: DisplayUnits;
  /** A short window, e.g. a phone in landscape (`screenLayoutFor`): the compact size. */
  readonly isCompact: boolean;
};

/**
 * The current weather as the focus of the home screen (W-04, SPEC D-33): a
 * large icon and temperature, the condition, today's high and low, then the
 * feels-like temperature, humidity and wind when the API provided them.
 * Presentational: all texts come from `presentWeatherHero`.
 *
 * Compact (US-08.02; SPEC D-50): the icon sits beside a smaller temperature
 * and the padding shrinks, so in landscape on a phone the hero takes about
 * half the height and the forecasts start on the first screen. Same texts,
 * same order for screen readers.
 */
export function WeatherHero({ current, utcOffsetSeconds, today, units, isCompact }: WeatherHeroProps) {
  const weather = presentWeatherHero(current, utcOffsetSeconds, today, units);
  const details = [
    weather.feelsLike === undefined ? undefined : `Feels like ${weather.feelsLike}`,
    weather.humidity === undefined ? undefined : `Humidity ${weather.humidity}`,
    weather.wind === undefined ? undefined : `Wind ${weather.wind}`,
  ].filter((detail): detail is string => detail !== undefined);

  return (
    <View style={[styles.hero, isCompact && styles.heroCompact]} accessible accessibilityLabel={weather.accessibilityLabel}>
      <View style={isCompact ? styles.mainCompact : styles.main}>
        <WeatherIcon name={weather.icon} size={isCompact ? iconSize.heroCompact : iconSize.hero} />
        <Text style={[styles.temperature, isCompact && styles.temperatureCompact]} numberOfLines={1} adjustsFontSizeToFit>
          {weather.temperatureShort}
        </Text>
      </View>
      <Text style={styles.condition}>{weather.condition}</Text>
      {weather.highShort !== undefined && weather.lowShort !== undefined && (
        <Text style={styles.highLow}>
          H: {weather.highShort}   L: {weather.lowShort}
        </Text>
      )}
      {details.length > 0 && <Text style={styles.details}>{details.join('  ·  ')}</Text>}
      <Text style={styles.observed}>Observed {weather.observedAt} local time</Text>
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
  main: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  mainCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  temperature: {
    color: skyColors.onSky,
    fontSize: fontSize.hero,
    fontWeight: fontWeight.light,
  },
  temperatureCompact: {
    fontSize: fontSize.heroCompact,
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
  },
  details: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
    textAlign: 'center',
    marginTop: spacing.s,
  },
  observed: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.small,
  },
});
