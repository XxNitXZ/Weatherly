import type { Coordinates } from '../models/Location';
import type { CachedWeatherReport, FetchedWeatherReport } from '../models/Weather';
import { parseStoredWeatherCache, toStoredWeatherCache } from '../parsers/weatherCacheParser';
import { parseWeatherResponse } from '../parsers/weatherParser';
import { fetchForecast } from '../services/api/weatherService';
import { readJson, writeJson } from '../storage/keyValueStorage';

/**
 * Single source of truth for weather data (STYLE.md §3, §11): the API and the
 * cache on the device.
 *
 * - `getReport` fetches raw JSON, parses it into a `WeatherReport` and stamps
 *   it with the fetch time. Errors are not caught: an `AppError` from the
 *   service ('network', 'timeout', 'http', 'parse') or from the parser
 *   ('parse') reaches the caller unchanged, so the ViewModel can choose the
 *   right message.
 * - `loadLastReport` and `saveLastReport` keep **one** cache entry: the last
 *   weather the user saw, with its place and fetch time (W-16; SPEC D-47).
 *   `getReport` does not save it: the ViewModel saves only the answer of its
 *   newest request, so a slow answer for an earlier place can never replace
 *   the cache (D-47).
 */

/** The storage key for the cache entry (STYLE.md §5). */
export const WEATHER_CACHE_STORAGE_KEY = 'weatherly:lastWeather';

export async function getReport(coordinates: Coordinates): Promise<FetchedWeatherReport> {
  const json = await fetchForecast(coordinates);
  const report = parseWeatherResponse(json);
  return { report, fetchedAtEpochMs: Date.now() };
}

// The end of the last cache operation that was started. A failed operation
// must not stop the next one, so the chain continues after errors.
let lastOperation: Promise<unknown> = Promise.resolve();

/** Runs `operation` after every earlier cache read or write has finished. */
function runInOrder<T>(operation: () => Promise<T>): Promise<T> {
  const result = lastOperation.then(operation, operation);
  lastOperation = result.catch(() => undefined);
  return result;
}

/**
 * The cached weather, or `null` when there is nothing usable: nothing stored
 * (first launch), a damaged or outdated entry ('parse'), or a storage that
 * cannot be read ('storage'). Never throws: the cache is only a fallback, so
 * a broken cache must never stop the app from working.
 */
export function loadLastReport(): Promise<CachedWeatherReport | null> {
  return runInOrder(async () => {
    try {
      const stored = await readJson(WEATHER_CACHE_STORAGE_KEY);
      return stored === undefined ? null : parseStoredWeatherCache(stored);
    } catch {
      // readJson throws only 'storage' and 'parse', the parser only 'parse':
      // both mean "no usable cache".
      return null;
    }
  });
}

/**
 * Replaces the cache entry. Resolves only after the storage has confirmed the
 * write. Writes run in the order they were called, so the last call wins.
 *
 * @throws AppError('storage') when writing fails. The caller may ignore it:
 *   the weather was fetched, only the copy on the device is missing.
 */
export function saveLastReport(cached: CachedWeatherReport): Promise<void> {
  return runInOrder(() => writeJson(WEATHER_CACHE_STORAGE_KEY, toStoredWeatherCache(cached)));
}
