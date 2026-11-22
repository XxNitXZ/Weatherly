/**
 * Readable descriptions of the WMO weather codes that Open-Meteo returns in
 * `weather_code` (W-04). Pure: no React, no I/O.
 *
 * The wording is the table "WMO Weather interpretation codes (WW)" on
 * https://open-meteo.com/en/docs (checked 2026-11-22). Codes 96 and 99 are
 * only reported by models with an explicit hail forecast; all other models
 * report 95 and 97 for thunderstorms.
 */
const WEATHER_DESCRIPTIONS: ReadonlyMap<number, string> = new Map([
  [0, 'Clear sky'],
  [1, 'Mainly clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [48, 'Depositing rime fog'],
  [51, 'Light drizzle'],
  [53, 'Moderate drizzle'],
  [55, 'Dense drizzle'],
  [56, 'Light freezing drizzle'],
  [57, 'Dense freezing drizzle'],
  [61, 'Slight rain'],
  [63, 'Moderate rain'],
  [65, 'Heavy rain'],
  [66, 'Light freezing rain'],
  [67, 'Heavy freezing rain'],
  [71, 'Slight snowfall'],
  [73, 'Moderate snowfall'],
  [75, 'Heavy snowfall'],
  [77, 'Snow grains'],
  [80, 'Slight rain showers'],
  [81, 'Moderate rain showers'],
  [82, 'Violent rain showers'],
  [85, 'Slight snow showers'],
  [86, 'Heavy snow showers'],
  [95, 'Thunderstorm'],
  [96, 'Thunderstorm with slight hail'],
  [97, 'Heavy thunderstorm'],
  [99, 'Thunderstorm with heavy hail'],
]);

/** Shown for a code that is not in the table, instead of a made-up description. */
export const UNKNOWN_WEATHER_DESCRIPTION = 'Unknown conditions';

/** The readable description of a WMO weather code, e.g. 3 → "Overcast". */
export function describeWeatherCode(weatherCode: number): string {
  return WEATHER_DESCRIPTIONS.get(weatherCode) ?? UNKNOWN_WEATHER_DESCRIPTION;
}
