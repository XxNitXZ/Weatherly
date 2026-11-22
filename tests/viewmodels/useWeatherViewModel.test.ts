import fixture from '../fixtures/openMeteoForecast.json';
import { AppError } from '../../src/models/AppError';
import type { Location } from '../../src/models/Location';
import type { FetchedWeatherReport } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import { forecastForState, isRepeatedWeatherLoad } from '../../src/viewmodels/useWeatherViewModel';

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
