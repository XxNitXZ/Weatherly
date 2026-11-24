/**
 * The user's settings (W-10 – W-12; Epic 6).
 *
 * Each choice is a closed set of values, listed once here. The settings
 * parser accepts only these values and the settings screen offers exactly
 * these options, so the two can never disagree.
 */

/** How old the weather may get before it is fetched again (W-11; used from US-06.02). */
export type RefreshIntervalMinutes = 15 | 30 | 60;

/** The unit temperatures are shown in (W-12; applied from US-06.03). The API always sends °C. */
export type TemperatureUnit = 'celsius' | 'fahrenheit';

/** The unit wind speeds are shown in (W-12; applied from US-06.03). The API always sends m/s. */
export type WindSpeedUnit = 'metresPerSecond' | 'kilometresPerHour';

export type AppSettings = {
  readonly refreshIntervalMinutes: RefreshIntervalMinutes;
  readonly temperatureUnit: TemperatureUnit;
  readonly windSpeedUnit: WindSpeedUnit;
};

/**
 * Open-Meteo updates its models about once an hour, so refreshing more often
 * than every 15 minutes would only repeat the same forecast.
 */
export const REFRESH_INTERVAL_OPTIONS: ReadonlyArray<RefreshIntervalMinutes> = [15, 30, 60];
export const TEMPERATURE_UNIT_OPTIONS: ReadonlyArray<TemperatureUnit> = ['celsius', 'fahrenheit'];
export const WIND_SPEED_UNIT_OPTIONS: ReadonlyArray<WindSpeedUnit> = ['metresPerSecond', 'kilometresPerHour'];

/** Used until the user changes something, and for any stored value that cannot be read. */
export const DEFAULT_SETTINGS: AppSettings = {
  refreshIntervalMinutes: 30,
  temperatureUnit: 'celsius',
  windSpeedUnit: 'metresPerSecond',
};
