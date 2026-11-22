import fixture from '../fixtures/openMeteoForecast.json';
import type { CurrentWeather } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import {
  formatLocalTime,
  formatPercent,
  formatTemperature,
  formatWindSpeed,
  presentCurrentWeather,
} from '../../src/utils/weatherFormatting';

/**
 * Tests for the weather display formatting (W-04): units, the rounding
 * policy, the location's local time and missing optional values.
 */

const NBSP = ' ';

describe('formatTemperature', () => {
  it.each([
    [1.2, `1${NBSP}°C`],
    [-2.6, `-3${NBSP}°C`],
    [0.5, `1${NBSP}°C`],
    [-0.4, `0${NBSP}°C`],
    [-0.5, `0${NBSP}°C`],
    [25, `25${NBSP}°C`],
  ])('%p → %j', (celsius, expected) => {
    expect(formatTemperature(celsius)).toBe(expected);
  });
});

describe('formatPercent', () => {
  it.each([
    [89, `89${NBSP}%`],
    [0, `0${NBSP}%`],
    [100, `100${NBSP}%`],
    [72.6, `73${NBSP}%`],
  ])('%p → %j', (percent, expected) => {
    expect(formatPercent(percent)).toBe(expected);
  });
});

describe('formatWindSpeed', () => {
  it.each([
    [3.1, `3.1${NBSP}m/s`],
    [3.14, `3.1${NBSP}m/s`],
    [0, `0.0${NBSP}m/s`],
    [12, `12.0${NBSP}m/s`],
  ])('%p → %j', (metresPerSecond, expected) => {
    expect(formatWindSpeed(metresPerSecond)).toBe(expected);
  });
});

describe('formatLocalTime', () => {
  it('shows the time at the location, not in UTC', () => {
    // 1795169700 s is 10:15 UTC; Stockholm is UTC+1 (3600 s) in the fixture.
    expect(formatLocalTime(1_795_169_700_000, 3600)).toBe('11:15');
  });

  it('handles a negative offset (west of Greenwich)', () => {
    expect(formatLocalTime(0, -5 * 3600)).toBe('19:00');
  });

  it('handles a half-hour offset', () => {
    expect(formatLocalTime(0, 5.5 * 3600)).toBe('05:30');
  });

  it('wraps past midnight', () => {
    expect(formatLocalTime(23.5 * 3600 * 1000, 3600)).toBe('00:30');
  });
});

describe('presentCurrentWeather', () => {
  it('formats the current conditions of the saved real forecast', () => {
    const report = parseWeatherResponse(fixture);

    expect(presentCurrentWeather(report.current, report.utcOffsetSeconds)).toEqual({
      temperature: `1${NBSP}°C`,
      condition: 'Overcast',
      observedAt: '11:15',
      feelsLike: `-3${NBSP}°C`,
      humidity: `89${NBSP}%`,
      wind: `3.1${NBSP}m/s`,
    });
  });

  it('leaves out optional values the API did not provide', () => {
    const current: CurrentWeather = {
      timeEpochMs: 1_795_169_700_000,
      temperatureCelsius: 1.2,
      weatherCode: 3,
      isDay: true,
    };

    const weather = presentCurrentWeather(current, 3600);

    expect(weather.feelsLike).toBeUndefined();
    expect(weather.humidity).toBeUndefined();
    expect(weather.wind).toBeUndefined();
    expect(weather.temperature).toBe(`1${NBSP}°C`);
  });

  it('shows the fallback description for an unknown weather code', () => {
    const current: CurrentWeather = {
      timeEpochMs: 0,
      temperatureCelsius: 10,
      weatherCode: 42,
      isDay: false,
    };

    expect(presentCurrentWeather(current, 0).condition).toBe('Unknown conditions');
  });
});
