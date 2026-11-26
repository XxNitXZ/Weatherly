import AsyncStorage from '@react-native-async-storage/async-storage';
import fixture from '../fixtures/openMeteoForecast.json';
import { AppError } from '../../src/models/AppError';
import type { Location } from '../../src/models/Location';
import type { CachedWeatherReport, FetchedWeatherReport } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import * as weatherRepository from '../../src/repositories/weatherRepository';
import type { LoadState } from '../../src/viewmodels/loadState';
import { readRestoredState, stateFromCache } from '../../src/viewmodels/useWeatherViewModel';
import { homeContentFor } from '../../src/views/components/WeatherStatus';

/**
 * Tests for what the home screen shows at the app's start (NIT-274; SPEC
 * D-51): a neutral loading view until the cache has been checked, then the
 * cached weather or, only without a usable cache, the welcome panel.
 *
 * `readRestoredState` is the step the ViewModel's `restoreLastReport` awaits;
 * here it runs on the in-memory AsyncStorage mock, so every storage case is
 * real. Its result goes through `homeContentFor` the way `HomeScreen` uses
 * it. The hook's state changes themselves are not rendered (SPEC Q21); its
 * request ordering is `createLatestRequestGuard`, tested on its own.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const IDLE: LoadState<FetchedWeatherReport> = { status: 'idle' };

const STOCKHOLM: Location = {
  name: 'Stockholm',
  country: 'Sverige',
  coordinates: { latitude: 59.33, longitude: 18.07 },
};

const CACHED: CachedWeatherReport = {
  location: STOCKHOLM,
  report: parseWeatherResponse(fixture),
  fetchedAtEpochMs: fixture.current.time * 1000,
};

/** What Home shows once the cache check has finished, as `restoreLastReport` and `HomeScreen` combine it. */
async function homeContentAfterCheck() {
  const restored = await readRestoredState();
  return restored === null ? homeContentFor(null, IDLE, true) : homeContentFor(restored.location, restored.weather, true);
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the app start', () => {
  it('shows the neutral loading view, not the welcome panel, before the cache is checked', () => {
    expect(homeContentFor(null, IDLE, false)).toBe('checkingCache');
  });

  it('shows the welcome panel on a first launch (nothing stored)', async () => {
    await expect(readRestoredState()).resolves.toBeNull();
    await expect(homeContentAfterCheck()).resolves.toBe('welcome');
  });

  it('shows the cached place and weather straight after the loading view', async () => {
    await weatherRepository.saveLastReport(CACHED);

    await expect(readRestoredState()).resolves.toEqual(stateFromCache(CACHED));
    await expect(homeContentAfterCheck()).resolves.toBe('weather');
  });

  it.each([
    ['text that is not JSON', '{ not json'],
    ['an entry of an unknown format', JSON.stringify({ version: 99, location: 'Stockholm' })],
  ])('shows the welcome panel for a damaged cache entry (%s)', async (_label, stored) => {
    await AsyncStorage.setItem(weatherRepository.WEATHER_CACHE_STORAGE_KEY, stored);

    await expect(readRestoredState()).resolves.toBeNull();
    await expect(homeContentAfterCheck()).resolves.toBe('welcome');
  });

  it('shows the welcome panel when the device storage cannot be read', async () => {
    await weatherRepository.saveLastReport(CACHED);
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('database is locked'));

    await expect(homeContentAfterCheck()).resolves.toBe('welcome');
  });

  it('never stays on the loading view, even if reading the cache fails unexpectedly', async () => {
    jest.spyOn(weatherRepository, 'loadLastReport').mockRejectedValueOnce(new Error('unexpected'));

    await expect(readRestoredState()).resolves.toBeNull();
  });
});

describe('homeContentFor', () => {
  const fetched: FetchedWeatherReport = { report: CACHED.report, fetchedAtEpochMs: CACHED.fetchedAtEpochMs };

  it('follows a place chosen during the cache check, not the check', () => {
    expect(homeContentFor(STOCKHOLM, { status: 'loading' }, false)).toBe('status');
  });

  it.each<[string, LoadState<FetchedWeatherReport>, 'weather' | 'status']>([
    ['loading', { status: 'loading' }, 'status'],
    ['a failed first load', { status: 'error', error: new AppError('network', 'offline') }, 'status'],
    ['weather', { status: 'success', data: fetched, isRefreshing: false }, 'weather'],
    ['a running refresh', { status: 'success', data: fetched, isRefreshing: true }, 'weather'],
    [
      'a failed refresh (cached weather offline)',
      { status: 'refreshFailed', data: fetched, error: new AppError('network', 'offline'), isRefreshing: false },
      'weather',
    ],
  ])('shows %s for a chosen place', (_label, state, expected) => {
    expect(homeContentFor(STOCKHOLM, state, true)).toBe(expected);
  });
});
