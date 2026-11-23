import fixture from '../fixtures/openMeteoForecast.json';
import type { DailyForecast, HourlyForecast } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import { weatherIconName } from '../../src/utils/weatherIcon';
import {
  formatDayLabel,
  presentDailyForecast,
  presentDayDetail,
  presentHourlyForecast,
} from '../../src/utils/forecastFormatting';

/**
 * Tests for the forecast display texts (W-05): weekday and date at the
 * location, temperatures, condition and missing optional values. The saved
 * real forecast is Stockholm (UTC+1), 20–26 November 2026; 20 November 2026
 * is a Friday.
 */

const NBSP = ' ';
const HOUR_MS = 60 * 60 * 1000;
const report = parseWeatherResponse(fixture);
const STOCKHOLM_OFFSET = report.utcOffsetSeconds;

describe('formatDayLabel', () => {
  it('labels the seven real forecast days in the location time zone', () => {
    const labels = report.daily.map((entry) => {
      const label = formatDayLabel(entry.dateEpochMs, STOCKHOLM_OFFSET);
      return `${label.weekday} ${label.date}`;
    });

    expect(labels).toEqual([
      'Fri 20 Nov',
      'Sat 21 Nov',
      'Sun 22 Nov',
      'Mon 23 Nov',
      'Tue 24 Nov',
      'Wed 25 Nov',
      'Thu 26 Nov',
    ]);
  });

  it('gives the full weekday and date for screen readers', () => {
    expect(formatDayLabel(report.daily[0].dateEpochMs, STOCKHOLM_OFFSET)).toEqual({
      weekday: 'Fri',
      weekdayLong: 'Friday',
      date: '20 Nov',
      dateLong: '20 November',
    });
  });

  it('uses the location date, not the UTC date (day starts 23:00 UTC the day before)', () => {
    expect(formatDayLabel(Date.UTC(2026, 10, 19, 23), 3600).date).toBe('20 Nov');
  });

  it('handles a location west of Greenwich (New York, UTC-5)', () => {
    expect(formatDayLabel(Date.UTC(2026, 10, 1, 5), -5 * 3600)).toMatchObject({
      weekday: 'Sun',
      date: '1 Nov',
    });
  });

  it('handles the largest offset (UTC+14)', () => {
    expect(formatDayLabel(Date.UTC(2026, 10, 21, 10), 14 * 3600)).toMatchObject({
      weekday: 'Sun',
      date: '22 Nov',
    });
  });

  it('crosses a month and year boundary', () => {
    expect(formatDayLabel(Date.UTC(2026, 11, 31, 23), 3600)).toMatchObject({
      weekday: 'Fri',
      date: '1 Jan',
    });
  });

  it('stays on the right date when a day start is one hour off (daylight-saving change)', () => {
    // 24 Oct 2026 in Stockholm: the API starts the day at 23:00 UTC with UTC+1,
    // while the wall-clock midnight (summer time, UTC+2) was 22:00 UTC.
    expect(formatDayLabel(Date.UTC(2026, 9, 23, 23), 3600).date).toBe('24 Oct');
    expect(formatDayLabel(Date.UTC(2026, 9, 23, 22), 3600).date).toBe('24 Oct');
    expect(formatDayLabel(Date.UTC(2026, 9, 23, 22) + HOUR_MS, 7200).date).toBe('24 Oct');
  });
});

describe('presentDailyForecast', () => {
  it('presents today from the real forecast', () => {
    expect(presentDailyForecast(report.daily[0], STOCKHOLM_OFFSET, true)).toEqual({
      title: 'Today',
      date: '20 Nov',
      condition: 'Light drizzle',
      high: `2${NBSP}°C`,
      low: `0${NBSP}°C`,
      accessibilityLabel: `Today, Friday 20 November: Light drizzle, high 2${NBSP}°C, low 0${NBSP}°C`,
    });
  });

  it('shows the weekday instead of "Today" for the following days', () => {
    const forecast = presentDailyForecast(report.daily[5], STOCKHOLM_OFFSET, false);

    expect(forecast.title).toBe('Wed');
    expect(forecast.condition).toBe('Overcast');
    // Real values: max -0.2 °C (never shown as "-0"), min -5.5 °C (rounds to -5).
    expect(forecast.high).toBe(`0${NBSP}°C`);
    expect(forecast.low).toBe(`-5${NBSP}°C`);
    expect(forecast.accessibilityLabel).toBe(
      `Wednesday 25 November: Overcast, high 0${NBSP}°C, low -5${NBSP}°C`,
    );
  });

  it('works without any optional daily values', () => {
    const minimal: DailyForecast = {
      dateEpochMs: Date.UTC(2026, 10, 19, 23),
      weatherCode: 61,
      temperatureMaxCelsius: 4.4,
      temperatureMinCelsius: 1.6,
    };

    expect(presentDailyForecast(minimal, 3600, false)).toMatchObject({
      title: 'Fri',
      condition: 'Slight rain',
      high: `4${NBSP}°C`,
      low: `2${NBSP}°C`,
    });
  });

  it('shows the fallback description for an unknown weather code', () => {
    const unknown: DailyForecast = { ...report.daily[0], weatherCode: 42 };
    expect(presentDailyForecast(unknown, STOCKHOLM_OFFSET, false).condition).toBe('Unknown conditions');
  });

  it('shows minimum and maximum as sent, even when they are in the wrong order', () => {
    const swapped: DailyForecast = { ...report.daily[0], temperatureMaxCelsius: -1, temperatureMinCelsius: 3 };
    const forecast = presentDailyForecast(swapped, STOCKHOLM_OFFSET, false);

    expect(forecast.high).toBe(`-1${NBSP}°C`);
    expect(forecast.low).toBe(`3${NBSP}°C`);
  });
});

describe('presentHourlyForecast', () => {
  it('presents the first remaining hour of the real forecast', () => {
    // hourly[11] is 10:00 UTC = 11:00 in Stockholm: 1.2 °C, code 51.
    expect(presentHourlyForecast(report.hourly[11], STOCKHOLM_OFFSET)).toEqual({
      time: '11:00',
      temperature: `1${NBSP}°C`,
      condition: 'Light drizzle',
      accessibilityLabel: `11:00: 1${NBSP}°C, Light drizzle`,
    });
  });

  it('shows the local hour of a location west of Greenwich', () => {
    const hour: HourlyForecast = { timeEpochMs: Date.UTC(2026, 10, 20, 3), temperatureCelsius: -1.6, weatherCode: 0 };

    expect(presentHourlyForecast(hour, -5 * 3600)).toMatchObject({ time: '22:00', temperature: `-2${NBSP}°C` });
  });

  it('works without the optional hourly values and with an unknown code', () => {
    const hour: HourlyForecast = { timeEpochMs: Date.UTC(2026, 10, 19, 23), temperatureCelsius: 0.4, weatherCode: 42 };

    expect(presentHourlyForecast(hour, 3600)).toEqual({
      time: '00:00',
      temperature: `0${NBSP}°C`,
      condition: 'Unknown conditions',
      accessibilityLabel: `00:00: 0${NBSP}°C, Unknown conditions`,
    });
  });
});

describe('presentDayDetail', () => {
  it('presents a tapped day of the real forecast with full units', () => {
    // daily[1]: Saturday 21 November, code 53, max 2.1 °C, min 1.1 °C.
    expect(presentDayDetail(report.daily[1], STOCKHOLM_OFFSET)).toEqual({
      weekday: 'Saturday',
      date: '21 November',
      icon: weatherIconName(53, true),
      condition: 'Moderate drizzle',
      high: `2${NBSP}°C`,
      low: `1${NBSP}°C`,
      accessibilityLabel: `Saturday 21 November: Moderate drizzle, high 2${NBSP}°C, low 1${NBSP}°C`,
    });
  });

  it('keeps the minus sign of a real day below zero', () => {
    // daily[6]: Thursday 26 November, code 3, max -3.6 °C, min -6.8 °C.
    const detail = presentDayDetail(report.daily[6], STOCKHOLM_OFFSET);

    expect(detail.weekday).toBe('Thursday');
    expect(detail.condition).toBe('Overcast');
    expect(detail.high).toBe(`-4${NBSP}°C`);
    expect(detail.low).toBe(`-7${NBSP}°C`);
    expect(detail.accessibilityLabel).toBe(`Thursday 26 November: Overcast, high -4${NBSP}°C, low -7${NBSP}°C`);
  });

  it('uses the same date as the seven-day row it was opened from', () => {
    report.daily.forEach((entry) => {
      const label = formatDayLabel(entry.dateEpochMs, STOCKHOLM_OFFSET);
      const detail = presentDayDetail(entry, STOCKHOLM_OFFSET);
      expect(`${detail.weekday} ${detail.date}`).toBe(`${label.weekdayLong} ${label.dateLong}`);
    });
  });

  it('always uses the day icon, also for a clear sky', () => {
    const clear: DailyForecast = { ...report.daily[0], weatherCode: 0 };
    expect(presentDayDetail(clear, STOCKHOLM_OFFSET).icon).toBe(weatherIconName(0, true));
    expect(presentDayDetail(clear, STOCKHOLM_OFFSET).icon).not.toBe(weatherIconName(0, false));
  });

  it('shows the fallback description for an unknown weather code', () => {
    const unknown: DailyForecast = { ...report.daily[0], weatherCode: 42 };
    const detail = presentDayDetail(unknown, STOCKHOLM_OFFSET);

    expect(detail.condition).toBe('Unknown conditions');
    expect(detail.accessibilityLabel).toContain('Unknown conditions');
  });

  it('shows minimum and maximum as sent, even when they are in the wrong order', () => {
    const swapped: DailyForecast = { ...report.daily[0], temperatureMaxCelsius: -1, temperatureMinCelsius: 3 };
    const detail = presentDayDetail(swapped, STOCKHOLM_OFFSET);

    expect(detail.high).toBe(`-1${NBSP}°C`);
    expect(detail.low).toBe(`3${NBSP}°C`);
  });
});
