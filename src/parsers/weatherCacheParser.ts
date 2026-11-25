import { AppError } from '../models/AppError';
import type {
  CachedWeatherReport,
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  WeatherReport,
} from '../models/Weather';
import { readArray, readNumber, readObject, readString, type JsonObject } from './jsonReaders';
import { parseStoredLocation, toStoredLocation, type StoredLocation } from './storedLocation';

/**
 * The stored weather cache format: the only module that
 * knows its JSON shape, in both directions.
 *
 * ```json
 * { "version": 1,
 *   "location": { "name": "Lund", "coordinates": { "latitude": 55.7, "longitude": 13.19 } },
 *   "fetchedAtEpochMs": 1795170000000,
 *   "report": { "timezone": "Europe/Stockholm", "utcOffsetSeconds": 3600,
 *               "current": { … }, "hourly": [ … ], "daily": [ … ] } }
 * ```
 */

/** The version this code writes and the only one it reads. */
export const WEATHER_CACHE_SCHEMA_VERSION = 1;

/** The stored report has exactly the shape of the model, in version 1. */
export type StoredWeatherReport = WeatherReport;

export type StoredWeatherCache = {
  readonly version: typeof WEATHER_CACHE_SCHEMA_VERSION;
  readonly location: StoredLocation;
  readonly fetchedAtEpochMs: number;
  readonly report: StoredWeatherReport;
};

// ─── Writing ────────────────────────────────────────────────────────────────

/**
 * The value to store for `cached`. Every field is copied by name, so only the
 * model's fields are stored, and optional fields that are not set are left out.
 */
export function toStoredWeatherCache(cached: CachedWeatherReport): StoredWeatherCache {
  return {
    version: WEATHER_CACHE_SCHEMA_VERSION,
    location: toStoredLocation(cached.location),
    fetchedAtEpochMs: cached.fetchedAtEpochMs,
    report: toStoredReport(cached.report),
  };
}

function toStoredReport(report: WeatherReport): StoredWeatherReport {
  return {
    timezone: report.timezone,
    utcOffsetSeconds: report.utcOffsetSeconds,
    current: toStoredCurrent(report.current),
    hourly: report.hourly.map(toStoredHour),
    daily: report.daily.map(toStoredDay),
  };
}

function toStoredCurrent(current: CurrentWeather): CurrentWeather {
  return {
    timeEpochMs: current.timeEpochMs,
    temperatureCelsius: current.temperatureCelsius,
    weatherCode: current.weatherCode,
    isDay: current.isDay,
    ...optional('apparentTemperatureCelsius', current.apparentTemperatureCelsius),
    ...optional('relativeHumidityPercent', current.relativeHumidityPercent),
    ...optional('windSpeedMs', current.windSpeedMs),
  };
}

function toStoredHour(hour: HourlyForecast): HourlyForecast {
  return {
    timeEpochMs: hour.timeEpochMs,
    temperatureCelsius: hour.temperatureCelsius,
    weatherCode: hour.weatherCode,
    ...optional('precipitationProbabilityPercent', hour.precipitationProbabilityPercent),
    ...optional('windSpeedMs', hour.windSpeedMs),
  };
}

function toStoredDay(day: DailyForecast): DailyForecast {
  return {
    dateEpochMs: day.dateEpochMs,
    weatherCode: day.weatherCode,
    temperatureMaxCelsius: day.temperatureMaxCelsius,
    temperatureMinCelsius: day.temperatureMinCelsius,
    ...optional('precipitationSumMm', day.precipitationSumMm),
    ...optional('precipitationProbabilityMaxPercent', day.precipitationProbabilityMaxPercent),
    ...optional('windSpeedMaxMs', day.windSpeedMaxMs),
    ...optional('sunriseEpochMs', day.sunriseEpochMs),
    ...optional('sunsetEpochMs', day.sunsetEpochMs),
    ...optional('apparentTemperatureMaxCelsius', day.apparentTemperatureMaxCelsius),
    ...optional('apparentTemperatureMinCelsius', day.apparentTemperatureMinCelsius),
    ...optional('rainSumMm', day.rainSumMm),
    ...optional('snowfallSumCm', day.snowfallSumCm),
    ...optional('precipitationHours', day.precipitationHours),
    ...optional('windGustsMaxMs', day.windGustsMaxMs),
    ...optional('windDirectionDominantDegrees', day.windDirectionDominantDegrees),
    ...optional('uvIndexMax', day.uvIndexMax),
    ...optional('daylightDurationSeconds', day.daylightDurationSeconds),
  };
}

/** `{ [key]: value }`, or `{}` when the value is not set. */
function optional<Key extends string>(
  key: Key,
  value: number | undefined,
): { readonly [K in Key]?: number } {
  return value === undefined ? {} : ({ [key]: value } as { readonly [K in Key]: number });
}

// ─── Reading ────────────────────────────────────────────────────────────────

/**
 * Turns a stored cache value back into a `CachedWeatherReport`.
 *
 * @throws AppError('parse') when the value is not an object, the version is
 *   missing or not `WEATHER_CACHE_SCHEMA_VERSION`, the place is invalid (see
 *   `parseStoredLocation`), or any report field is missing, `null` or of the
 *   wrong type. The message names the field, e.g.
 *   `report.daily[3].temperatureMaxCelsius`.
 */
export function parseStoredWeatherCache(json: unknown): CachedWeatherReport {
  const root = readObject(json, 'weather cache');

  const version = readNumber(root.version, 'version');
  if (version !== WEATHER_CACHE_SCHEMA_VERSION) {
    throw new AppError(
      'parse',
      `version: unsupported weather cache schema version ${version}, expected ${WEATHER_CACHE_SCHEMA_VERSION}`,
    );
  }

  return {
    location: parseStoredLocation(root.location, 'location'),
    fetchedAtEpochMs: readNumber(root.fetchedAtEpochMs, 'fetchedAtEpochMs'),
    report: parseReport(root.report, 'report'),
  };
}

function parseReport(value: unknown, path: string): WeatherReport {
  const report = readObject(value, path);
  return {
    timezone: readString(report.timezone, `${path}.timezone`),
    utcOffsetSeconds: readNumber(report.utcOffsetSeconds, `${path}.utcOffsetSeconds`),
    current: parseCurrent(report.current, `${path}.current`),
    hourly: readArray(report.hourly, `${path}.hourly`).map((hour, index) =>
      parseHour(hour, `${path}.hourly[${index}]`),
    ),
    daily: readArray(report.daily, `${path}.daily`).map((day, index) =>
      parseDay(day, `${path}.daily[${index}]`),
    ),
  };
}

function parseCurrent(value: unknown, path: string): CurrentWeather {
  const field = fieldReader(readObject(value, path), path);
  return {
    timeEpochMs: field.number('timeEpochMs'),
    temperatureCelsius: field.number('temperatureCelsius'),
    weatherCode: field.number('weatherCode'),
    isDay: field.boolean('isDay'),
    apparentTemperatureCelsius: field.optionalNumber('apparentTemperatureCelsius'),
    relativeHumidityPercent: field.optionalNumber('relativeHumidityPercent'),
    windSpeedMs: field.optionalNumber('windSpeedMs'),
  };
}

function parseHour(value: unknown, path: string): HourlyForecast {
  const field = fieldReader(readObject(value, path), path);
  return {
    timeEpochMs: field.number('timeEpochMs'),
    temperatureCelsius: field.number('temperatureCelsius'),
    weatherCode: field.number('weatherCode'),
    precipitationProbabilityPercent: field.optionalNumber('precipitationProbabilityPercent'),
    windSpeedMs: field.optionalNumber('windSpeedMs'),
  };
}

function parseDay(value: unknown, path: string): DailyForecast {
  const field = fieldReader(readObject(value, path), path);
  return {
    dateEpochMs: field.number('dateEpochMs'),
    weatherCode: field.number('weatherCode'),
    temperatureMaxCelsius: field.number('temperatureMaxCelsius'),
    temperatureMinCelsius: field.number('temperatureMinCelsius'),
    precipitationSumMm: field.optionalNumber('precipitationSumMm'),
    precipitationProbabilityMaxPercent: field.optionalNumber('precipitationProbabilityMaxPercent'),
    windSpeedMaxMs: field.optionalNumber('windSpeedMaxMs'),
    sunriseEpochMs: field.optionalNumber('sunriseEpochMs'),
    sunsetEpochMs: field.optionalNumber('sunsetEpochMs'),
    apparentTemperatureMaxCelsius: field.optionalNumber('apparentTemperatureMaxCelsius'),
    apparentTemperatureMinCelsius: field.optionalNumber('apparentTemperatureMinCelsius'),
    rainSumMm: field.optionalNumber('rainSumMm'),
    snowfallSumCm: field.optionalNumber('snowfallSumCm'),
    precipitationHours: field.optionalNumber('precipitationHours'),
    windGustsMaxMs: field.optionalNumber('windGustsMaxMs'),
    windDirectionDominantDegrees: field.optionalNumber('windDirectionDominantDegrees'),
    uvIndexMax: field.optionalNumber('uvIndexMax'),
    daylightDurationSeconds: field.optionalNumber('daylightDurationSeconds'),
  };
}

/** Reads the fields of one stored object, naming `path.key` in every error. */
function fieldReader(object: JsonObject, path: string) {
  return {
    number: (key: string): number => readNumber(object[key], `${path}.${key}`),
    /** Missing means "not set"; `null` is rejected (this code never writes it). */
    optionalNumber: (key: string): number | undefined =>
      object[key] === undefined ? undefined : readNumber(object[key], `${path}.${key}`),
    boolean: (key: string): boolean => {
      const value = object[key];
      if (typeof value !== 'boolean') {
        throw new AppError('parse', `${path}.${key}: expected a boolean, got ${value === null ? 'null' : typeof value}`);
      }
      return value;
    },
  };
}
