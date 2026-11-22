import type { CurrentWeather, DailyForecast } from '../models/Weather';
import { describeWeatherCode } from './weatherCode';
import { weatherIconName, type WeatherIconName } from './weatherIcon';

/**
 * Display formatting for weather values (W-04; STYLE.md §12). Pure: no React,
 * no I/O. Values arrive in the units the request fixes (°C, %, m/s, SPEC D-05)
 * and are shown in those units; conversion to the user's units is W-12.
 *
 * Rounding policy, the same everywhere: temperatures and percentages to whole
 * numbers, wind speed to one decimal. A non-breaking space keeps a value and
 * its unit on the same line.
 */

const NBSP = ' ';

/**
 * E.g. 1.2 → "1 °C", -2.6 → "-3 °C". -0.4 rounds to -0, which a template
 * string prints as "0", so "-0 °C" never appears.
 */
export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}${NBSP}°C`;
}

/**
 * The compact form for large and dense displays (hero, hourly, seven-day),
 * e.g. 1.2 → "1°". The unit is always spoken in full in the screen-reader
 * label, and all values are in °C until W-12 (SPEC D-33).
 */
export function formatTemperatureShort(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

/** E.g. 89 → "89 %". */
export function formatPercent(percent: number): string {
  return `${Math.round(percent)}${NBSP}%`;
}

/** E.g. 3.14 → "3.1 m/s". */
export function formatWindSpeed(metresPerSecond: number): string {
  return `${metresPerSecond.toFixed(1)}${NBSP}m/s`;
}

/**
 * The time of day at the location (24-hour "HH:MM"), not on the phone. The
 * offset is the location's current UTC offset from the weather report, so it
 * is correct for "now"; it can be one hour off for other days across a
 * daylight-saving change.
 */
export function formatLocalTime(epochMs: number, utcOffsetSeconds: number): string {
  const local = new Date(epochMs + utcOffsetSeconds * 1000);
  const hours = String(local.getUTCHours()).padStart(2, '0');
  const minutes = String(local.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Display texts for the current conditions. Optional fields stay `undefined`
 * when the API did not provide them, so the view leaves them out instead of
 * showing an invented value (STYLE.md §10).
 */
export type CurrentWeatherPresentation = {
  readonly temperature: string;
  readonly condition: string;
  readonly observedAt: string;
  readonly feelsLike?: string;
  readonly humidity?: string;
  readonly wind?: string;
};

export function presentCurrentWeather(
  current: CurrentWeather,
  utcOffsetSeconds: number,
): CurrentWeatherPresentation {
  return {
    temperature: formatTemperature(current.temperatureCelsius),
    condition: describeWeatherCode(current.weatherCode),
    observedAt: formatLocalTime(current.timeEpochMs, utcOffsetSeconds),
    feelsLike:
      current.apparentTemperatureCelsius === undefined
        ? undefined
        : formatTemperature(current.apparentTemperatureCelsius),
    humidity:
      current.relativeHumidityPercent === undefined
        ? undefined
        : formatPercent(current.relativeHumidityPercent),
    wind: current.windSpeedMs === undefined ? undefined : formatWindSpeed(current.windSpeedMs),
  };
}

/** Display texts for the weather hero at the top of the home screen (SPEC D-33). */
export type WeatherHeroPresentation = CurrentWeatherPresentation & {
  /** E.g. "1°". */
  readonly temperatureShort: string;
  readonly icon: WeatherIconName;
  /** Today's high and low, e.g. "2°"; missing when today is not in the forecast. */
  readonly highShort?: string;
  readonly lowShort?: string;
  /** One summary for screen readers, with every unit spoken in full. */
  readonly accessibilityLabel: string;
};

/**
 * The current conditions plus today's high and low (from the same report's
 * daily entry for today). Builds on `presentCurrentWeather`, so units,
 * rounding and missing values behave the same.
 */
export function presentWeatherHero(
  current: CurrentWeather,
  utcOffsetSeconds: number,
  today: DailyForecast | undefined,
): WeatherHeroPresentation {
  const weather = presentCurrentWeather(current, utcOffsetSeconds);
  const highLow =
    today === undefined
      ? undefined
      : `High ${formatTemperature(today.temperatureMaxCelsius)}, low ${formatTemperature(today.temperatureMinCelsius)}`;
  const details = [
    weather.feelsLike === undefined ? undefined : `feels like ${weather.feelsLike}`,
    weather.humidity === undefined ? undefined : `humidity ${weather.humidity}`,
    weather.wind === undefined ? undefined : `wind ${weather.wind}`,
  ].filter((part): part is string => part !== undefined);

  const detailSentence = details.join(', ');
  const sentences = [
    `Now ${weather.temperature}, ${weather.condition}`,
    highLow,
    detailSentence === '' ? undefined : detailSentence[0].toUpperCase() + detailSentence.slice(1),
    `Observed at ${weather.observedAt} local time`,
  ].filter((sentence): sentence is string => sentence !== undefined);

  return {
    ...weather,
    temperatureShort: formatTemperatureShort(current.temperatureCelsius),
    icon: weatherIconName(current.weatherCode, current.isDay),
    highShort: today === undefined ? undefined : formatTemperatureShort(today.temperatureMaxCelsius),
    lowShort: today === undefined ? undefined : formatTemperatureShort(today.temperatureMinCelsius),
    accessibilityLabel: `${sentences.join('. ')}.`,
  };
}
