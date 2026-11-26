import type { Coordinates } from '../../models/Location';
import { getJson } from './httpClient';

/**
 * Open-Meteo forecast API (SPEC D-05, W-13). No API key is needed.
 *
 * This module knows the endpoint and the request parameters. It never parses
 * the response: `weatherParser` does that (STYLE.md §9).
 */
export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// The fields requested for each block. They must match what `weatherParser`
// reads; tests/services/weatherService.test.ts checks this.
export const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
  'is_day',
] as const;

export const HOURLY_FIELDS = [
  'temperature_2m',
  'weather_code',
  'precipitation_probability',
  'wind_speed_10m',
] as const;

export const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'sunrise',
  'sunset',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'rain_sum',
  'snowfall_sum',
  'precipitation_hours',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant',
  'uv_index_max',
  'daylight_duration',
] as const;

/** Seven days, starting today (W-05). */
export const FORECAST_DAYS = 7;

/** How long to wait for Open-Meteo before reporting a timeout (W-18). */
export const FORECAST_TIMEOUT_MS = 10_000;

/**
 * Fetches the raw forecast for one location.
 * Returns untrusted JSON; `weatherRepository` passes it to `weatherParser`.
 *
 * @throws AppError('network' | 'timeout' | 'http' | 'parse') from `getJson`.
 */
export async function fetchForecast(coordinates: Coordinates): Promise<unknown> {
  return getJson(buildForecastUrl(coordinates), { timeoutMs: FORECAST_TIMEOUT_MS });
}

/**
 * Builds the forecast request URL for one location.
 *
 * Fixed options the parser relies on:
 * - `timezone=auto`: days and hours follow the location's local time.
 * - `timeformat=unixtime`: all times are Unix seconds.
 * - `wind_speed_unit=ms`: wind in m/s. Temperatures stay in °C (API default).
 *
 * The query string is built by hand rather than with `URLSearchParams`,
 * whose React Native implementation has historically been incomplete.
 */
export function buildForecastUrl(coordinates: Coordinates): string {
  const params: ReadonlyArray<readonly [string, string]> = [
    ['latitude', String(coordinates.latitude)],
    ['longitude', String(coordinates.longitude)],
    ['current', CURRENT_FIELDS.join(',')],
    ['hourly', HOURLY_FIELDS.join(',')],
    ['daily', DAILY_FIELDS.join(',')],
    ['timezone', 'auto'],
    ['forecast_days', String(FORECAST_DAYS)],
    ['wind_speed_unit', 'ms'],
    ['timeformat', 'unixtime'],
  ];

  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `${OPEN_METEO_FORECAST_URL}?${query}`;
}
