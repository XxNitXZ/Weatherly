import { getJson } from './httpClient';

/**
 * Open-Meteo Geocoding API (SPEC D-24, W-02): place name → candidate locations.
 * No API key is needed.
 *
 * This module knows the endpoint and the request parameters. It never parses
 * the response: `geocodingParser` does that (STYLE.md §9).
 */
export const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Enough to tell same-named places apart without a long list. */
export const SEARCH_RESULT_COUNT = 10;

/**
 * Swedish matching and result names. With `en`, a search for "Göteborg" does
 * not find the city; with `sv`, both "Göteborg" and "Gothenburg" do
 * (TEST_REPORT §1.3).
 */
export const GEOCODING_LANGUAGE = 'sv';

/** How long to wait for the geocoding API before reporting a timeout (W-18). */
export const GEOCODING_TIMEOUT_MS = 10_000;

/**
 * Builds the search URL for a place name. The caller passes an already
 * trimmed, non-empty query (the ViewModel checks this, W-01).
 */
export function buildSearchUrl(query: string): string {
  const params: ReadonlyArray<readonly [string, string]> = [
    ['name', query],
    ['count', String(SEARCH_RESULT_COUNT)],
    ['language', GEOCODING_LANGUAGE],
    ['format', 'json'],
  ];

  const queryString = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `${OPEN_METEO_GEOCODING_URL}?${queryString}`;
}

/**
 * Searches for places by name. Returns untrusted JSON; `locationRepository`
 * passes it to `geocodingParser`.
 *
 * @throws AppError('network' | 'timeout' | 'http' | 'parse') from `getJson`.
 */
export async function fetchLocations(query: string): Promise<unknown> {
  return getJson(buildSearchUrl(query), { timeoutMs: GEOCODING_TIMEOUT_MS });
}
