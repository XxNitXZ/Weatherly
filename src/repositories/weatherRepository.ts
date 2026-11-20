import type { Coordinates } from '../models/Location';
import type { FetchedWeatherReport } from '../models/Weather';
import { parseWeatherResponse } from '../parsers/weatherParser';
import { fetchForecast } from '../services/api/weatherService';

/**
 * Single source of truth for weather data (STYLE.md §3, §11).
 *
 * Today it joins the service and the parser: fetch raw JSON, parse it into a
 * `WeatherReport`, and stamp it with the fetch time. Caching, the refresh
 * policy and the offline fallback are added here in Epic 7 (US-07.01, US-07.02),
 * so callers will not need to change.
 *
 * Errors are not caught: an `AppError` from the service ('network', 'timeout',
 * 'http', 'parse') or from the parser ('parse') reaches the caller unchanged,
 * so the ViewModel can choose the right message.
 */
export async function getReport(coordinates: Coordinates): Promise<FetchedWeatherReport> {
  const json = await fetchForecast(coordinates);
  const report = parseWeatherResponse(json);
  return { report, fetchedAtEpochMs: Date.now() };
}
