import type { DailyForecast } from '../models/Weather';
import { findTodayIndex } from './forecastSelection';

/**
 * Which icon shows a weather condition (SPEC D-34). Pure: no React, no I/O.
 * The names are MaterialCommunityIcons glyphs from `@expo/vector-icons`; the
 * view only draws the returned name. Every icon has a text equivalent
 * (`describeWeatherCode`) in its screen-reader label (STYLE.md §15).
 */

export type WeatherIconName =
  | 'weather-sunny'
  | 'weather-night'
  | 'weather-partly-cloudy'
  | 'weather-night-partly-cloudy'
  | 'weather-cloudy'
  | 'weather-fog'
  | 'weather-rainy'
  | 'weather-partly-rainy'
  | 'weather-pouring'
  | 'weather-snowy'
  | 'weather-partly-snowy'
  | 'weather-snowy-heavy'
  | 'weather-snowy-rainy'
  | 'weather-lightning-rainy'
  | 'weather-hail'
  | 'weather-cloudy-alert';

/** Shown for a code that is not in the WMO table, next to "Unknown conditions". */
export const UNKNOWN_WEATHER_ICON: WeatherIconName = 'weather-cloudy-alert';

/** The icon for a WMO weather code. Clear and partly cloudy skies, and showers, differ by day and night. */
export function weatherIconName(weatherCode: number, isDay: boolean): WeatherIconName {
  switch (weatherCode) {
    case 0:
      return isDay ? 'weather-sunny' : 'weather-night';
    case 1:
    case 2:
      return isDay ? 'weather-partly-cloudy' : 'weather-night-partly-cloudy';
    case 3:
      return 'weather-cloudy';
    case 45:
    case 48:
      return 'weather-fog';
    case 51:
    case 53:
    case 55:
    case 61:
    case 63:
      return 'weather-rainy';
    case 65:
    case 82:
      return 'weather-pouring';
    case 56:
    case 57:
    case 66:
    case 67:
      return 'weather-snowy-rainy';
    case 71:
    case 73:
    case 77:
      return 'weather-snowy';
    case 75:
    case 86:
      return 'weather-snowy-heavy';
    case 80:
    case 81:
      return isDay ? 'weather-partly-rainy' : 'weather-rainy';
    case 85:
      return isDay ? 'weather-partly-snowy' : 'weather-snowy';
    case 95:
    case 97:
      return 'weather-lightning-rainy';
    case 96:
    case 99:
      return 'weather-hail';
    default:
      return UNKNOWN_WEATHER_ICON;
  }
}

/**
 * Whether the hour starting at `timeEpochMs` is in daylight, from the real
 * sunrise and sunset of its day (the hour's middle is compared).
 *
 * Polar days work as sent by the API (TEST_REPORT §1.2): polar night has
 * sunrise = sunset, so no hour is daylight; midnight sun has sunset at the
 * next midnight, so every hour is. When the day or its sunrise/sunset is
 * missing, `true` is returned, so the plain day icons are shown rather than
 * a guessed night.
 */
export function isDaytimeAt(timeEpochMs: number, daily: ReadonlyArray<DailyForecast>): boolean {
  const midHourEpochMs = timeEpochMs + 30 * 60 * 1000;
  const dayIndex = findTodayIndex(daily, midHourEpochMs);
  if (dayIndex < 0) {
    return true;
  }
  const { sunriseEpochMs, sunsetEpochMs } = daily[dayIndex];
  if (sunriseEpochMs === undefined || sunsetEpochMs === undefined) {
    return true;
  }
  return sunriseEpochMs <= midHourEpochMs && midHourEpochMs < sunsetEpochMs;
}
