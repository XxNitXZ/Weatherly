/**
 * Weather models used inside the app (W-15). Built by `weatherParser` from an
 * Open-Meteo response; views and ViewModels never see the raw API JSON.
 *
 * Conventions:
 * - Times are epoch milliseconds in fields named `…EpochMs` (SPEC D-18).
 * - Units are part of the field name. Values are stored in °C, m/s, mm and %;
 *   conversion to the user's preferred units happens at display time (W-12).
 * - `weatherCode` is the WMO weather interpretation code from Open-Meteo.
 *   Mapping it to a description or icon is a presentation concern.
 * - Optional fields are values the API may leave out (`null`). They are never
 *   replaced with invented defaults (STYLE.md §10).
 */

export type CurrentWeather = {
  readonly timeEpochMs: number;
  readonly temperatureCelsius: number;
  readonly weatherCode: number;
  readonly isDay: boolean;
  readonly apparentTemperatureCelsius?: number;
  readonly relativeHumidityPercent?: number;
  readonly windSpeedMs?: number;
};

/** One hour of the forecast. */
export type HourlyForecast = {
  readonly timeEpochMs: number;
  readonly temperatureCelsius: number;
  readonly weatherCode: number;
  readonly precipitationProbabilityPercent?: number;
  readonly windSpeedMs?: number;
};

/** One day of the forecast. `dateEpochMs` is local midnight at the location. */
export type DailyForecast = {
  readonly dateEpochMs: number;
  readonly weatherCode: number;
  readonly temperatureMaxCelsius: number;
  readonly temperatureMinCelsius: number;
  readonly precipitationSumMm?: number;
  readonly precipitationProbabilityMaxPercent?: number;
  readonly windSpeedMaxMs?: number;
  /**
   * Open-Meteo does not send `null` for polar days (checked against the real
   * API on 2026-11-20, TEST_REPORT §1.2):
   * - polar night: sunrise and sunset both equal local midnight
   * - midnight sun: sunrise is local midnight, sunset is the next midnight
   * They are shown as "Polar night" / "Midnight sun" (SPEC D-42).
   * Optional only in case the API leaves the value out.
   */
  readonly sunriseEpochMs?: number;
  readonly sunsetEpochMs?: number;
  // Shown only on the day detail screen (W-07, SPEC D-43).
  readonly apparentTemperatureMaxCelsius?: number;
  readonly apparentTemperatureMinCelsius?: number;
  readonly rainSumMm?: number;
  /** Open-Meteo sends snowfall in centimetres, not millimetres. */
  readonly snowfallSumCm?: number;
  readonly precipitationHours?: number;
  readonly windGustsMaxMs?: number;
  /** Where the wind mostly comes from, 0–360° (0 = north). */
  readonly windDirectionDominantDegrees?: number;
  readonly uvIndexMax?: number;
  readonly daylightDurationSeconds?: number;
};

/**
 * A complete forecast for one location.
 *
 * `timezone` (IANA name, e.g. "Europe/Stockholm") and `utcOffsetSeconds`
 * describe the location's local time, which is needed to decide which
 * hourly entries belong to "today" (W-06).
 */
export type WeatherReport = {
  readonly timezone: string;
  readonly utcOffsetSeconds: number;
  readonly current: CurrentWeather;
  readonly hourly: ReadonlyArray<HourlyForecast>;
  readonly daily: ReadonlyArray<DailyForecast>;
};

/**
 * A report together with the time it was fetched (SPEC D-18). Returned by
 * `weatherRepository`; the cache stores the same shape so the refresh policy
 * and the "last updated" notice can use `fetchedAtEpochMs`.
 */
export type FetchedWeatherReport = {
  readonly report: WeatherReport;
  readonly fetchedAtEpochMs: number;
};
