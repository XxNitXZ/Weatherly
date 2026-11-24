import fixture from '../fixtures/openMeteoForecast.json';
import { AppError } from '../../src/models/AppError';
import type { Location } from '../../src/models/Location';
import type { FetchedWeatherReport } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import type { LoadState } from '../../src/viewmodels/loadState';
import {
  failRefresh,
  finishRefresh,
  forecastForState,
  isRepeatedWeatherLoad,
  shouldRefresh,
  startRefresh,
} from '../../src/viewmodels/useWeatherViewModel';

/**
 * Tests for the pure part of the weather ViewModel (W-04). The hook itself
 * (state changes) is not unit-tested, as decided for `useSearchViewModel`;
 * its request ordering uses `createLatestRequestGuard`, tested separately.
 */

const LUND: Location = {
  name: 'Lund',
  region: 'Skåne län',
  country: 'Sverige',
  coordinates: { latitude: 55.70584, longitude: 13.19321 },
};

const TYPED_STOCKHOLM: Location = {
  name: '59.3293, 18.0686',
  coordinates: { latitude: 59.3293, longitude: 18.0686 },
};

describe('isRepeatedWeatherLoad', () => {
  it('is false before any location was loaded', () => {
    expect(isRepeatedWeatherLoad(LUND, null)).toBe(false);
  });

  it('is true for the location that is loading or shown', () => {
    expect(isRepeatedWeatherLoad({ ...LUND }, LUND)).toBe(true);
  });

  it('is false for another location', () => {
    expect(isRepeatedWeatherLoad(TYPED_STOCKHOLM, LUND)).toBe(false);
  });

  it('is false for typed coordinates that differ only in the fourth decimal', () => {
    const nearby: Location = {
      name: '59.3294, 18.0686',
      coordinates: { latitude: 59.3294, longitude: 18.0686 },
    };
    expect(isRepeatedWeatherLoad(nearby, TYPED_STOCKHOLM)).toBe(false);
  });
});

describe('forecastForState', () => {
  const fetched: FetchedWeatherReport = {
    report: parseWeatherResponse(fixture),
    // The fixture was fetched at its own `current.time`.
    fetchedAtEpochMs: fixture.current.time * 1000,
  };

  it.each([
    ['idle', { status: 'idle' }],
    ['loading', { status: 'loading' }],
    ['error', { status: 'error', error: new AppError('network', 'offline') }],
  ] as const)('is null while there is no report (%s)', (_label, state) => {
    expect(forecastForState(state)).toBeNull();
  });

  it('chooses the days from the same report as the current weather, as of its fetch time', () => {
    const forecast = forecastForState({ status: 'success', data: fetched, isRefreshing: false });

    expect(forecast?.days).toEqual(fetched.report.daily);
    expect(forecast?.todayDateEpochMs).toBe(fetched.report.daily[0].dateEpochMs);
    expect(forecast?.todayHours).toHaveLength(13);
  });

  it('keeps the forecast when a refresh failed and earlier data is still shown', () => {
    const forecast = forecastForState({
      status: 'refreshFailed',
      data: fetched,
      error: new AppError('timeout', 'slow'),
      isRefreshing: false,
    });

    expect(forecast?.days).toHaveLength(7);
  });
});

describe('refresh state changes (W-11; SPEC D-45)', () => {
  const MINUTE = 60 * 1000;
  const old: FetchedWeatherReport = {
    report: parseWeatherResponse(fixture),
    fetchedAtEpochMs: fixture.current.time * 1000,
  };
  const fresh: FetchedWeatherReport = { ...old, fetchedAtEpochMs: old.fetchedAtEpochMs + 20 * MINUTE };
  const shown: LoadState<FetchedWeatherReport> = { status: 'success', data: old, isRefreshing: false };
  const offline = new AppError('network', 'offline');
  const later = old.fetchedAtEpochMs + 20 * MINUTE;

  describe('shouldRefresh', () => {
    it('refreshes shown weather that is stale', () => {
      expect(shouldRefresh(shown, later, 15)).toBe(true);
    });

    it('does not refresh shown weather that is still fresh', () => {
      expect(shouldRefresh(shown, later, 30)).toBe(false);
    });

    it('does not start a second refresh while one is running', () => {
      expect(shouldRefresh({ ...shown, isRefreshing: true }, later, 15)).toBe(false);
    });

    it('refreshes again after a failed refresh, once the data is stale', () => {
      const failed: LoadState<FetchedWeatherReport> = { status: 'refreshFailed', data: old, error: offline, isRefreshing: false };
      expect(shouldRefresh(failed, later, 15)).toBe(true);
    });

    it.each([
      ['idle', { status: 'idle' }],
      ['loading', { status: 'loading' }],
      ['error', { status: 'error', error: offline }],
    ] as const)('never refreshes without weather on screen (%s)', (_label, state) => {
      expect(shouldRefresh(state, later, 15)).toBe(false);
    });
  });

  describe('startRefresh', () => {
    it('keeps the shown weather and marks it as refreshing', () => {
      expect(startRefresh(shown)).toEqual({ status: 'success', data: old, isRefreshing: true });
    });

    it('keeps an earlier refresh error while retrying', () => {
      const failed: LoadState<FetchedWeatherReport> = { status: 'refreshFailed', data: old, error: offline, isRefreshing: false };
      expect(startRefresh(failed)).toEqual({ ...failed, isRefreshing: true });
    });

    it('changes nothing without weather on screen', () => {
      expect(startRefresh({ status: 'loading' })).toEqual({ status: 'loading' });
    });
  });

  describe('finishRefresh', () => {
    it('shows the new report and clears an earlier refresh error', () => {
      expect(finishRefresh(fresh)).toEqual({ status: 'success', data: fresh, isRefreshing: false });
    });
  });

  describe('failRefresh', () => {
    it('keeps the old report on screen and attaches the error', () => {
      expect(failRefresh(startRefresh(shown), offline)).toEqual({
        status: 'refreshFailed',
        data: old,
        error: offline,
        isRefreshing: false,
      });
    });

    it('replaces an earlier refresh error with the new one', () => {
      const failed: LoadState<FetchedWeatherReport> = { status: 'refreshFailed', data: old, error: offline, isRefreshing: true };
      const serverError = new AppError('http', 'HTTP 500');
      expect(failRefresh(failed, serverError)).toEqual({ status: 'refreshFailed', data: old, error: serverError, isRefreshing: false });
    });

    it('changes nothing when a new place is loading meanwhile', () => {
      expect(failRefresh({ status: 'loading' }, offline)).toEqual({ status: 'loading' });
    });
  });
});
