import fixture from '../fixtures/openMeteoForecast.json';
import type { CurrentWeather } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import detailsFixture from '../fixtures/openMeteoForecastStockholmDetails.json';
import {
  formatCompassDirection,
  formatDaylight,
  formatHours,
  formatLocalTime,
  formatPercent,
  formatPrecipitation,
  formatSnowfall,
  formatTemperature,
  formatUvIndex,
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

// Detail-screen formatters (W-07, SPEC D-43). Real values come from the
// Stockholm response saved on 2026-11-23.
describe('formatPrecipitation and formatSnowfall', () => {
  it('shows real rain to one decimal, also for a dry day', () => {
    expect(formatPrecipitation(7.5)).toBe(`7.5${NBSP}mm`);
    expect(formatPrecipitation(0.4)).toBe(`0.4${NBSP}mm`);
    expect(formatPrecipitation(0)).toBe(`0.0${NBSP}mm`);
  });

  it('shows snowfall in centimetres, as Open-Meteo sends it', () => {
    expect(formatSnowfall(0)).toBe(`0.0${NBSP}cm`);
    expect(formatSnowfall(2.45)).toBe(`2.5${NBSP}cm`);
  });
});

describe('formatHours and formatUvIndex', () => {
  it('rounds to whole numbers', () => {
    expect(formatHours(22)).toBe(`22${NBSP}h`);
    expect(formatHours(0)).toBe(`0${NBSP}h`);
    expect(formatHours(3.6)).toBe(`4${NBSP}h`);
    expect(formatUvIndex(0.15)).toBe('0');
    expect(formatUvIndex(0.55)).toBe('1');
    expect(formatUvIndex(7.3)).toBe('7');
  });
});

describe('formatDaylight', () => {
  it('shows the real Stockholm daylight to the nearest minute', () => {
    // 25645.94 s = 427.4 min = 7 h 7 min.
    expect(formatDaylight(25645.94)).toBe(`7${NBSP}h 7${NBSP}min`);
  });

  it('leaves out the hours under one hour', () => {
    expect(formatDaylight(2700)).toBe(`45${NBSP}min`);
  });

  it('shows polar night and midnight sun as 0 min and 24 h', () => {
    expect(formatDaylight(0)).toBe(`0${NBSP}min`);
    expect(formatDaylight(86400)).toBe(`24${NBSP}h 0${NBSP}min`);
  });

  it('carries a rounded-up 60th minute into the hour', () => {
    expect(formatDaylight(3599.9)).toBe(`1${NBSP}h 0${NBSP}min`);
  });
});

describe('formatCompassDirection', () => {
  it('names the 8 compass points at their centres', () => {
    expect([0, 45, 90, 135, 180, 225, 270, 315].map(formatCompassDirection)).toEqual([
      'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW',
    ]);
  });

  it('gives the real Stockholm directions', () => {
    // 3, 3, 350, 334, 310, 203, 198 degrees.
    expect(detailsFixture.daily.wind_direction_10m_dominant.map(formatCompassDirection)).toEqual([
      'N', 'N', 'N', 'NW', 'NW', 'SW', 'S',
    ]);
  });

  it('puts a value exactly between two points on the next one clockwise', () => {
    expect(formatCompassDirection(22.5)).toBe('NE');
    expect(formatCompassDirection(22.4)).toBe('N');
    expect(formatCompassDirection(337.5)).toBe('N');
  });

  it('treats 360 as north and wraps values outside 0–360', () => {
    expect(formatCompassDirection(360)).toBe('N');
    expect(formatCompassDirection(359)).toBe('N');
    expect(formatCompassDirection(-90)).toBe('W');
    expect(formatCompassDirection(405)).toBe('NE');
  });
});
