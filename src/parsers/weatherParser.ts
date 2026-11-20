import { AppError } from '../models/AppError';
import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  WeatherReport,
} from '../models/Weather';

/**
 * Turns an Open-Meteo forecast response into a `WeatherReport` (W-14, W-15).
 *
 * This is the only module that knows Open-Meteo's JSON shape (STYLE.md §10).
 * It expects the response to the request built by `weatherService`:
 * `timeformat=unixtime` (times in Unix seconds), `wind_speed_unit=ms`,
 * `timezone=auto`, and the `current`, `hourly` and `daily` fields read below.
 *
 * Pure function: no I/O, same output for the same input.
 *
 * @throws AppError('parse') if a required field is missing, has the wrong
 *   type, or an hourly/daily array does not match the length of its `time`
 *   array. Optional fields that are `null` or missing become `undefined`.
 */
export function parseWeatherResponse(json: unknown): WeatherReport {
  const root = readObject(json, 'response');

  return {
    timezone: readString(root.timezone, 'timezone'),
    utcOffsetSeconds: readNumber(root.utc_offset_seconds, 'utc_offset_seconds'),
    current: parseCurrent(readObject(root.current, 'current')),
    hourly: parseHourly(readObject(root.hourly, 'hourly')),
    daily: parseDaily(readObject(root.daily, 'daily')),
  };
}

type JsonObject = { readonly [key: string]: unknown };

function parseCurrent(current: JsonObject): CurrentWeather {
  return {
    timeEpochMs: secondsToEpochMs(readNumber(current.time, 'current.time')),
    temperatureCelsius: readNumber(current.temperature_2m, 'current.temperature_2m'),
    weatherCode: readNumber(current.weather_code, 'current.weather_code'),
    isDay: readNumber(current.is_day, 'current.is_day') === 1,
    apparentTemperatureCelsius: readOptionalNumber(
      current.apparent_temperature,
      'current.apparent_temperature',
    ),
    relativeHumidityPercent: readOptionalNumber(
      current.relative_humidity_2m,
      'current.relative_humidity_2m',
    ),
    windSpeedMs: readOptionalNumber(current.wind_speed_10m, 'current.wind_speed_10m'),
  };
}

function parseHourly(hourly: JsonObject): ReadonlyArray<HourlyForecast> {
  const times = readNumberArray(hourly, 'hourly', 'time');
  const length = times.length;
  const temperatures = readNumberArray(hourly, 'hourly', 'temperature_2m', length);
  const weatherCodes = readNumberArray(hourly, 'hourly', 'weather_code', length);
  const precipitationProbabilities = readOptionalNumberArray(
    hourly,
    'hourly',
    'precipitation_probability',
    length,
  );
  const windSpeeds = readOptionalNumberArray(hourly, 'hourly', 'wind_speed_10m', length);

  return times.map((time, index) => ({
    timeEpochMs: secondsToEpochMs(time),
    temperatureCelsius: temperatures[index],
    weatherCode: weatherCodes[index],
    precipitationProbabilityPercent: precipitationProbabilities[index],
    windSpeedMs: windSpeeds[index],
  }));
}

function parseDaily(daily: JsonObject): ReadonlyArray<DailyForecast> {
  const dates = readNumberArray(daily, 'daily', 'time');
  const length = dates.length;
  const weatherCodes = readNumberArray(daily, 'daily', 'weather_code', length);
  const maxTemperatures = readNumberArray(daily, 'daily', 'temperature_2m_max', length);
  const minTemperatures = readNumberArray(daily, 'daily', 'temperature_2m_min', length);
  const precipitationSums = readOptionalNumberArray(daily, 'daily', 'precipitation_sum', length);
  const precipitationProbabilities = readOptionalNumberArray(
    daily,
    'daily',
    'precipitation_probability_max',
    length,
  );
  const maxWindSpeeds = readOptionalNumberArray(daily, 'daily', 'wind_speed_10m_max', length);
  const sunrises = readOptionalNumberArray(daily, 'daily', 'sunrise', length);
  const sunsets = readOptionalNumberArray(daily, 'daily', 'sunset', length);

  return dates.map((date, index) => ({
    dateEpochMs: secondsToEpochMs(date),
    weatherCode: weatherCodes[index],
    temperatureMaxCelsius: maxTemperatures[index],
    temperatureMinCelsius: minTemperatures[index],
    precipitationSumMm: precipitationSums[index],
    precipitationProbabilityMaxPercent: precipitationProbabilities[index],
    windSpeedMaxMs: maxWindSpeeds[index],
    sunriseEpochMs: optionalSecondsToEpochMs(sunrises[index]),
    sunsetEpochMs: optionalSecondsToEpochMs(sunsets[index]),
  }));
}

// ── Reading helpers ─────────────────────────────────────────────────────────
// Each helper narrows one `unknown` value or throws AppError('parse') with the
// path of the bad field, so a failure says exactly what was wrong.

function readObject(value: unknown, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw parseError(path, 'an object', value);
  }
  return value as JsonObject;
}

function readString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw parseError(path, 'a string', value);
  }
  return value;
}

/** Rejects NaN and Infinity as well as non-numbers. */
function readNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw parseError(path, 'a finite number', value);
  }
  return value;
}

/** `null` and missing values become `undefined`; anything else must be a number. */
function readOptionalNumber(value: unknown, path: string): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return readNumber(value, path);
}

/**
 * Reads a required array where every entry must be a number.
 * If `expectedLength` is given, the array must have exactly that length.
 */
function readNumberArray(
  block: JsonObject,
  blockName: string,
  key: string,
  expectedLength?: number,
): ReadonlyArray<number> {
  const path = `${blockName}.${key}`;
  const values = readArray(block[key], path, expectedLength);
  return values.map((value, index) => readNumber(value, `${path}[${index}]`));
}

/**
 * Reads an optional array. Entries may be `null`. A missing array means the
 * value is unavailable for every entry, so all entries become `undefined`.
 */
function readOptionalNumberArray(
  block: JsonObject,
  blockName: string,
  key: string,
  expectedLength: number,
): ReadonlyArray<number | undefined> {
  const path = `${blockName}.${key}`;
  if (block[key] === null || block[key] === undefined) {
    return new Array<undefined>(expectedLength).fill(undefined);
  }
  const values = readArray(block[key], path, expectedLength);
  return values.map((value, index) => readOptionalNumber(value, `${path}[${index}]`));
}

function readArray(
  value: unknown,
  path: string,
  expectedLength?: number,
): ReadonlyArray<unknown> {
  if (!Array.isArray(value)) {
    throw parseError(path, 'an array', value);
  }
  if (expectedLength !== undefined && value.length !== expectedLength) {
    throw new AppError(
      'parse',
      `${path}: expected ${expectedLength} entries to match "time", got ${value.length}`,
    );
  }
  return value;
}

function secondsToEpochMs(seconds: number): number {
  return seconds * 1000;
}

function optionalSecondsToEpochMs(seconds: number | undefined): number | undefined {
  return seconds === undefined ? undefined : secondsToEpochMs(seconds);
}

function parseError(path: string, expected: string, actual: unknown): AppError {
  const actualType = actual === null ? 'null' : Array.isArray(actual) ? 'array' : typeof actual;
  return new AppError('parse', `${path}: expected ${expected}, got ${actualType}`);
}
