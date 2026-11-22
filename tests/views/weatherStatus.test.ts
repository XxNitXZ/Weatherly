import fixture from '../fixtures/openMeteoForecast.json';
import { AppError, type AppErrorKind } from '../../src/models/AppError';
import type { FetchedWeatherReport } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import type { LoadState } from '../../src/viewmodels/loadState';
import { describeWeatherStatus, weatherErrorMessage } from '../../src/views/components/WeatherStatus';

/**
 * Tests for what the weather area shows instead of the weather (W-18 – W-20):
 * the error-state logic of the weather load.
 */

const FETCHED: FetchedWeatherReport = {
  report: parseWeatherResponse(fixture),
  fetchedAtEpochMs: 1_795_170_000_000,
};

function errorState(kind: AppErrorKind): LoadState<FetchedWeatherReport> {
  return { status: 'error', error: new AppError(kind, 'developer detail that must not be shown') };
}

describe('describeWeatherStatus', () => {
  it('shows nothing before a place is selected', () => {
    expect(describeWeatherStatus({ status: 'idle' })).toBeNull();
  });

  it('shows the loading indicator while the weather loads', () => {
    expect(describeWeatherStatus({ status: 'loading' })).toEqual({ kind: 'loading' });
  });

  it('shows nothing when the report is there, because the weather is shown', () => {
    expect(describeWeatherStatus({ status: 'success', data: FETCHED, isRefreshing: false })).toBeNull();
  });

  it.each(['network', 'timeout', 'http', 'parse', 'validation', 'storage', 'unknown'] as const)(
    'shows a %s failure as an error with the user-facing message',
    (kind) => {
      expect(describeWeatherStatus(errorState(kind))).toEqual({
        kind: 'error',
        text: weatherErrorMessage(new AppError(kind, '')),
      });
    },
  );
});

describe('weatherErrorMessage', () => {
  it.each([
    ['network', 'No internet connection. Check your connection and select the place again.'],
    ['timeout', 'The weather service took too long to answer. Select the place again to retry.'],
    ['http', 'The weather service is not available right now. Please try again later.'],
    ['parse', 'The weather service sent an unexpected answer. Please try again later.'],
    ['validation', 'Something went wrong while loading the weather. Select the place again to retry.'],
    ['storage', 'Something went wrong while loading the weather. Select the place again to retry.'],
    ['unknown', 'Something went wrong while loading the weather. Select the place again to retry.'],
  ] as const)('%s → %j', (kind, expected) => {
    expect(weatherErrorMessage(new AppError(kind, 'developer detail'))).toBe(expected);
  });

  it('never shows the developer message', () => {
    const error = new AppError('parse', 'current.temperature_2m: expected a finite number, got undefined');
    expect(weatherErrorMessage(error)).not.toContain('temperature_2m');
  });
});
