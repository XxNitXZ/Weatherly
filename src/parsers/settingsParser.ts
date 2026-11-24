import {
  DEFAULT_SETTINGS,
  REFRESH_INTERVAL_OPTIONS,
  TEMPERATURE_UNIT_OPTIONS,
  WIND_SPEED_UNIT_OPTIONS,
  type AppSettings,
  type RefreshIntervalMinutes,
  type TemperatureUnit,
  type WindSpeedUnit,
} from '../models/AppSettings';

/**
 * The stored settings format (W-10; SPEC D-44): the only module that knows
 * its JSON shape, in both directions.
 *
 * ```json
 * { "version": 1, "refreshIntervalMinutes": 30,
 *   "temperatureUnit": "celsius", "windSpeedUnit": "metresPerSecond" }
 * ```
 *
 * Reading is forgiving, unlike the API and favorites parsers: it never
 * throws. A value that is not one of the allowed options falls back to its
 * default, field by field, and the next save replaces it. Settings take
 * seconds to choose again, so losing a damaged value costs the user little,
 * while refusing to start would cost a lot (SPEC D-44; compare D-38).
 */

/** The version this code writes and the only one it reads. */
export const SETTINGS_SCHEMA_VERSION = 1;

export type StoredSettings = {
  readonly version: typeof SETTINGS_SCHEMA_VERSION;
} & AppSettings;

/**
 * The settings in a stored value.
 *
 * @returns `DEFAULT_SETTINGS` when nothing usable is stored: `undefined`
 *   (first launch), not an object, or another version. Otherwise each field
 *   is the stored value when it is one of the allowed options, else its
 *   default. Unknown extra fields are ignored.
 */
export function parseStoredSettings(json: unknown): AppSettings {
  if (!isRecord(json) || json.version !== SETTINGS_SCHEMA_VERSION) {
    return DEFAULT_SETTINGS;
  }
  return {
    refreshIntervalMinutes: optionOrDefault<RefreshIntervalMinutes>(
      json.refreshIntervalMinutes,
      REFRESH_INTERVAL_OPTIONS,
      DEFAULT_SETTINGS.refreshIntervalMinutes,
    ),
    temperatureUnit: optionOrDefault<TemperatureUnit>(
      json.temperatureUnit,
      TEMPERATURE_UNIT_OPTIONS,
      DEFAULT_SETTINGS.temperatureUnit,
    ),
    windSpeedUnit: optionOrDefault<WindSpeedUnit>(
      json.windSpeedUnit,
      WIND_SPEED_UNIT_OPTIONS,
      DEFAULT_SETTINGS.windSpeedUnit,
    ),
  };
}

/** The value to store for `settings`. */
export function toStoredSettings(settings: AppSettings): StoredSettings {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    refreshIntervalMinutes: settings.refreshIntervalMinutes,
    temperatureUnit: settings.temperatureUnit,
    windSpeedUnit: settings.windSpeedUnit,
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `value` when it is one of `options` (compared with `===`), else `fallback`. */
function optionOrDefault<Option>(value: unknown, options: ReadonlyArray<Option>, fallback: Option): Option {
  const match = options.find((option) => option === value);
  return match === undefined ? fallback : match;
}
