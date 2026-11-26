import fixture from '../fixtures/openMeteoForecast.json';
import { AppError, type AppErrorKind } from '../../src/models/AppError';
import type { FetchedWeatherReport } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import type { LoadState } from '../../src/viewmodels/loadState';
import {
  describeRefreshNotice,
  describeWeatherStatus,
  weatherErrorMessage,
} from '../../src/views/components/WeatherStatus';

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
    ['network', 'No internet connection. Check your connection and try again.'],
    ['timeout', 'The weather service took too long to answer. Try again.'],
    ['http', 'The weather service is not available right now. Please try again later.'],
    ['parse', 'The weather service sent an unexpected answer. Please try again later.'],
    ['validation', 'Something went wrong while loading the weather. Try again.'],
    ['storage', 'Something went wrong while loading the weather. Try again.'],
    ['unknown', 'Something went wrong while loading the weather. Try again.'],
  ] as const)('%s → %j', (kind, expected) => {
    expect(weatherErrorMessage(new AppError(kind, 'developer detail'))).toBe(expected);
  });

  it('never shows the developer message', () => {
    const error = new AppError('parse', 'current.temperature_2m: expected a finite number, got undefined');
    expect(weatherErrorMessage(error)).not.toContain('temperature_2m');
  });

  it.each(['network', 'timeout', 'http', 'parse', 'validation', 'storage', 'unknown'] as const)(
    'names the "Try again" button as the action, never "select the place" (%s)',
    (kind) => {
      const text = weatherErrorMessage(new AppError(kind, 'developer detail'));
      expect(text.toLowerCase()).not.toContain('select the place');
      expect(text.toLowerCase()).toContain('try again');
    },
  );
});

describe('describeRefreshNotice (W-11, W-18; SPEC D-45, D-48)', () => {
  // The fixture's current weather was observed on Fri 20 Nov 2026 at 11:15 in
  // Stockholm (UTC+1), the time the hero shows as "Observed 11:15".
  const HOUR_MS = 60 * 60 * 1000;
  const OBSERVED_EPOCH_MS = FETCHED.report.current.timeEpochMs;
  // 13:15 the same day in Stockholm.
  const SAME_DAY = OBSERVED_EPOCH_MS + 2 * HOUR_MS;
  function refreshFailed(kind: AppErrorKind, isRefreshing = false): LoadState<FetchedWeatherReport> {
    return {
      status: 'refreshFailed',
      data: FETCHED,
      error: new AppError(kind, 'developer detail that must not be shown'),
      isRefreshing,
    };
  }

  it.each([
    ['idle', { status: 'idle' }],
    ['loading', { status: 'loading' }],
    ['success', { status: 'success', data: FETCHED, isRefreshing: false }],
    ['success while refreshing', { status: 'success', data: FETCHED, isRefreshing: true }],
    ['error', { status: 'error', error: new AppError('network', 'offline') }],
  ] as const)('shows no notice unless a refresh failed (%s)', (_label, state) => {
    expect(describeRefreshNotice(state, SAME_DAY)).toBeNull();
  });

  it.each(['network', 'timeout'] as const)('says there is no connection after a %s error, with the time of the shown weather', (kind) => {
    expect(describeRefreshNotice(refreshFailed(kind), SAME_DAY)).toEqual({
      text: 'No connection. Showing the weather from 11:15.',
      accessibilityLabel: 'No connection. Showing the weather from 11:15.',
    });
  });

  it.each(['http', 'parse', 'unknown'] as const)('says the weather could not be updated after a %s error', (kind) => {
    expect(describeRefreshNotice(refreshFailed(kind), SAME_DAY)).toEqual({
      text: "Couldn't update the weather. Showing the weather from 11:15.",
      accessibilityLabel: "Couldn't update the weather. Showing the weather from 11:15.",
    });
  });

  it('keeps the notice while "Try again" runs', () => {
    expect(describeRefreshNotice(refreshFailed('network', true), SAME_DAY)).not.toBeNull();
  });

  it('never shows the developer message', () => {
    expect(describeRefreshNotice(refreshFailed('http'), SAME_DAY)?.text).not.toContain('developer detail');
  });

  describe('weather that is not from today at the place', () => {
    it('adds the date for weather from the day before, and speaks it in full', () => {
      const nextDay = OBSERVED_EPOCH_MS + 24 * HOUR_MS;
      expect(describeRefreshNotice(refreshFailed('network'), nextDay)).toEqual({
        text: 'No connection. Showing the weather from Fri 20 Nov, 11:15.',
        accessibilityLabel: 'No connection. Showing the weather from Friday 20 November, 11:15.',
      });
    });

    it('adds the date just after local midnight, although it is still the same day in UTC', () => {
      // 00:05 on Sat 21 Nov in Stockholm is 23:05 on Fri 20 Nov in UTC.
      const justAfterLocalMidnight = OBSERVED_EPOCH_MS + 12 * HOUR_MS + 50 * 60 * 1000;
      expect(describeRefreshNotice(refreshFailed('timeout'), justAfterLocalMidnight)?.text).toBe(
        'No connection. Showing the weather from Fri 20 Nov, 11:15.',
      );
    });

    it('shows only the time just before local midnight', () => {
      // 23:55 on Fri 20 Nov in Stockholm.
      const justBeforeLocalMidnight = OBSERVED_EPOCH_MS + 12 * HOUR_MS + 40 * 60 * 1000;
      expect(describeRefreshNotice(refreshFailed('network'), justBeforeLocalMidnight)?.text).toBe(
        'No connection. Showing the weather from 11:15.',
      );
    });

    it('adds the date when the observation lies on a later day (clock set back)', () => {
      const dayBefore = OBSERVED_EPOCH_MS - 24 * HOUR_MS;
      expect(describeRefreshNotice(refreshFailed('http'), dayBefore)?.text).toBe(
        "Couldn't update the weather. Showing the weather from Fri 20 Nov, 11:15.",
      );
    });
  });
});
