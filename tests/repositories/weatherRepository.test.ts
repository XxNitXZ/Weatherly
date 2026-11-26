import AsyncStorage from '@react-native-async-storage/async-storage';
import fixture from '../fixtures/openMeteoForecast.json';
import type { CachedWeatherReport } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import {
  WEATHER_CACHE_STORAGE_KEY,
  getReport,
  loadLastReport,
  saveLastReport,
} from '../../src/repositories/weatherRepository';
import { buildForecastUrl } from '../../src/services/api/weatherService';
import {
  expectAppError,
  fakeResponse,
  installFakeFetch,
  restoreFetch,
} from '../helpers/fakeFetch';

/**
 * Tests for `weatherRepository`:
 * - `getReport`: service + parser + timestamp, with `fetch` faked by the real
 *   saved Open-Meteo response;
 * - the cache entry (W-16; SPEC D-47): parser + storage, with the real
 *   `keyValueStorage` on top of the in-memory AsyncStorage Jest mock. The
 *   storage outlives each call, so "save, then load" is what a restart does.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const STOCKHOLM = { latitude: 59.33, longitude: 18.07 };
const NOW_EPOCH_MS = 1_795_170_000_000;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW_EPOCH_MS);
});

afterEach(() => {
  restoreFetch();
  jest.restoreAllMocks();
});

describe('getReport', () => {
  it('requests the forecast URL for the given coordinates', async () => {
    const fetchMock = installFakeFetch();
    fetchMock.mockResolvedValue(fakeResponse(200, JSON.stringify(fixture)));

    await getReport(STOCKHOLM);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(buildForecastUrl(STOCKHOLM));
  });

  it('returns the parsed report with the time it was fetched', async () => {
    installFakeFetch().mockResolvedValue(fakeResponse(200, JSON.stringify(fixture)));

    const result = await getReport(STOCKHOLM);

    expect(result.fetchedAtEpochMs).toBe(NOW_EPOCH_MS);
    expect(result.report.timezone).toBe('Europe/Stockholm');
    expect(result.report.daily).toHaveLength(7);
    expect(result.report.hourly).toHaveLength(168);
  });

  it('passes a service error through unchanged', async () => {
    installFakeFetch().mockResolvedValue(fakeResponse(500, 'Internal Server Error'));

    await expectAppError(getReport(STOCKHOLM), 'http');
  });

  it('passes a parse error through when the JSON is valid but incomplete', async () => {
    const withoutDaily = { ...fixture, daily: undefined };
    installFakeFetch().mockResolvedValue(fakeResponse(200, JSON.stringify(withoutDaily)));

    const error = await expectAppError(getReport(STOCKHOLM), 'parse');
    expect(error.message).toContain('daily');
  });
});

const STOCKHOLM_CACHED: CachedWeatherReport = {
  location: { name: 'Stockholm', country: 'Sverige', coordinates: STOCKHOLM },
  report: parseWeatherResponse(fixture),
  fetchedAtEpochMs: NOW_EPOCH_MS,
};

const UPPSALA_CACHED: CachedWeatherReport = {
  ...STOCKHOLM_CACHED,
  location: { name: 'Uppsala', country: 'Sverige', coordinates: { latitude: 59.86, longitude: 17.64 } },
  fetchedAtEpochMs: NOW_EPOCH_MS + 60_000,
};

describe('the cache entry', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('is stored under a key in the weatherly namespace', () => {
    expect(WEATHER_CACHE_STORAGE_KEY).toBe('weatherly:lastWeather');
  });

  it('gives null when nothing is stored (first launch)', async () => {
    await expect(loadLastReport()).resolves.toBeNull();
  });

  it('gives back the saved entry, as after a restart of the app', async () => {
    await saveLastReport(STOCKHOLM_CACHED);

    await expect(loadLastReport()).resolves.toEqual(STOCKHOLM_CACHED);
  });

  it('gives null for a damaged entry instead of throwing', async () => {
    await AsyncStorage.setItem(WEATHER_CACHE_STORAGE_KEY, '{ not json');
    await expect(loadLastReport()).resolves.toBeNull();

    await AsyncStorage.setItem(WEATHER_CACHE_STORAGE_KEY, JSON.stringify({ version: 1, location: 'Stockholm' }));
    await expect(loadLastReport()).resolves.toBeNull();
  });

  it('gives null when the device storage cannot be read', async () => {
    await saveLastReport(STOCKHOLM_CACHED);
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('database is locked'));

    await expect(loadLastReport()).resolves.toBeNull();
  });

  it('throws a storage error when saving fails, and keeps the earlier entry', async () => {
    await saveLastReport(STOCKHOLM_CACHED);
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));

    await expectAppError(saveLastReport(UPPSALA_CACHED), 'storage');
    await expect(loadLastReport()).resolves.toEqual(STOCKHOLM_CACHED);
  });

  it('stores two quick saves in the order they were made, so the last one wins', async () => {
    const realSetItem = jest.mocked(AsyncStorage.setItem).getMockImplementation();
    // The first write is slow; without ordering, it would finish last.
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await realSetItem?.(key, value);
    });

    await Promise.all([saveLastReport(STOCKHOLM_CACHED), saveLastReport(UPPSALA_CACHED)]);

    await expect(loadLastReport()).resolves.toEqual(UPPSALA_CACHED);
  });
});
