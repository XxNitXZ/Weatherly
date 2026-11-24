import type { AppSettings, TemperatureUnit, WindSpeedUnit } from '../models/AppSettings';

/**
 * The units the user chose for display (W-12; SPEC D-46). The API always
 * sends °C and m/s (SPEC D-05); values are converted only when they are
 * formatted, so switching units needs no new request and stored weather
 * does not depend on the unit.
 */
export type DisplayUnits = {
  readonly temperature: TemperatureUnit;
  readonly windSpeed: WindSpeedUnit;
};

/** The units from the stored settings. */
export function displayUnitsOf(settings: AppSettings): DisplayUnits {
  return { temperature: settings.temperatureUnit, windSpeed: settings.windSpeedUnit };
}

/** The API's own units: what every screen showed before W-12. */
export const METRIC_UNITS: DisplayUnits = { temperature: 'celsius', windSpeed: 'metresPerSecond' };

/** E.g. 0 → 32, 100 → 212, -40 → -40. Not rounded. */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** E.g. 1 → 3.6, 5.6 → 20.16. Not rounded. */
export function metresPerSecondToKilometresPerHour(metresPerSecond: number): number {
  return metresPerSecond * 3.6;
}

/** `celsius` in `unit`, not rounded, so rounding happens once, after converting. */
export function convertTemperature(celsius: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? celsiusToFahrenheit(celsius) : celsius;
}

/** `metresPerSecond` in `unit`, not rounded. */
export function convertWindSpeed(metresPerSecond: number, unit: WindSpeedUnit): number {
  return unit === 'kilometresPerHour' ? metresPerSecondToKilometresPerHour(metresPerSecond) : metresPerSecond;
}
