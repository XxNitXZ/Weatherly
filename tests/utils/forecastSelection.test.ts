import fixture from '../fixtures/openMeteoForecast.json';
import dstFixture from '../fixtures/openMeteoForecastDstStockholm.json';
import type { DailyForecast, HourlyForecast, WeatherReport } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import {
  findTodayBounds,
  findTodayIndex,
  MAX_FORECAST_DAYS,
  selectForecast,
  selectForecastDays,
  selectRemainingHoursToday,
} from '../../src/utils/forecastSelection';

/**
 * Tests for choosing the forecast days (W-05). Uses the saved real forecast
 * (Stockholm, fetched at its `current.time`, 2026-11-20 10:15 UTC) and a real
 * response across the 2026-10-25 daylight-saving change in Stockholm.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const report = parseWeatherResponse(fixture);
const fetchedAtEpochMs = fixture.current.time * 1000;

function day(dateEpochMs: number): DailyForecast {
  return { dateEpochMs, weatherCode: 3, temperatureMaxCelsius: 5, temperatureMinCelsius: 1 };
}

describe('selectForecastDays', () => {
  it('returns exactly seven days, starting with today, for the real forecast', () => {
    const selection = selectForecastDays(report.daily, fetchedAtEpochMs);

    expect(selection.days).toHaveLength(MAX_FORECAST_DAYS);
    expect(selection.days).toEqual(report.daily);
    expect(selection.todayDateEpochMs).toBe(report.daily[0].dateEpochMs);
  });

  it('starts at the day that contains now, leaving out earlier days', () => {
    const now = report.daily[3].dateEpochMs + 10 * HOUR_MS;

    const selection = selectForecastDays(report.daily, now);

    expect(selection.days).toEqual(report.daily.slice(3));
    expect(selection.todayDateEpochMs).toBe(report.daily[3].dateEpochMs);
  });

  it('shows at most seven days when the data has more', () => {
    const start = Date.UTC(2026, 10, 19, 23);
    const nineDays = Array.from({ length: 9 }, (_, index) => day(start + index * DAY_MS));

    expect(selectForecastDays(nineDays, start + HOUR_MS).days).toHaveLength(7);
  });

  it('never invents days when the data has fewer than seven', () => {
    const start = Date.UTC(2026, 10, 19, 23);
    const threeDays = [day(start), day(start + DAY_MS), day(start + 2 * DAY_MS)];

    expect(selectForecastDays(threeDays, start + HOUR_MS).days).toHaveLength(3);
  });

  it('shows all days without a "today" when now is before the first day', () => {
    const selection = selectForecastDays(report.daily, report.daily[0].dateEpochMs - 1);

    expect(selection.days).toEqual(report.daily);
    expect(selection.todayDateEpochMs).toBeUndefined();
  });

  it('shows nothing when now is after the last day', () => {
    const afterLastDay = report.daily[6].dateEpochMs + DAY_MS;

    expect(selectForecastDays(report.daily, afterLastDay)).toEqual({ days: [] });
  });

  it('shows nothing for an empty daily list', () => {
    expect(selectForecastDays([], fetchedAtEpochMs)).toEqual({ days: [] });
  });
});

describe('findTodayIndex', () => {
  it('treats the exact start of a day as part of that day', () => {
    expect(findTodayIndex(report.daily, report.daily[2].dateEpochMs)).toBe(2);
  });

  it('treats one millisecond before a day as part of the previous day', () => {
    expect(findTodayIndex(report.daily, report.daily[2].dateEpochMs - 1)).toBe(1);
  });

  it('uses the next day start as the end of each day (local midnight boundary)', () => {
    // 23:59:59.999 local time on day 0 still belongs to day 0.
    expect(findTodayIndex(report.daily, report.daily[1].dateEpochMs - 1)).toBe(0);
  });

  it('counts the last day as 24 hours long', () => {
    const lastStart = report.daily[6].dateEpochMs;
    expect(findTodayIndex(report.daily, lastStart + DAY_MS - 1)).toBe(6);
    expect(findTodayIndex(report.daily, lastStart + DAY_MS)).toBe(-1);
  });

  it('follows the API day boundaries across a daylight-saving change', () => {
    // Real response for 24–26 Oct 2026 in Stockholm: the clocks went back on
    // 25 Oct, but the API still starts every day at 23:00 UTC (one fixed offset).
    const dstReport = parseWeatherResponse(dstFixture);
    const starts = dstReport.daily.map((entry) => entry.dateEpochMs);

    expect(starts).toEqual([
      Date.UTC(2026, 9, 23, 23),
      Date.UTC(2026, 9, 24, 23),
      Date.UTC(2026, 9, 25, 23),
    ]);
    expect(findTodayIndex(dstReport.daily, Date.UTC(2026, 9, 25, 12))).toBe(1);
  });
});

// ── Today's remaining hours (W-06) ─────────────────────────────────────────

function hour(timeEpochMs: number): HourlyForecast {
  return { timeEpochMs, temperatureCelsius: 2, weatherCode: 3 };
}

/** A report with consecutive hours from `firstHourEpochMs`, built from the model contract. */
function syntheticReport(
  utcOffsetSeconds: number,
  dayStartsEpochMs: ReadonlyArray<number>,
  hourCount: number,
): WeatherReport {
  const firstHourEpochMs = dayStartsEpochMs[0];
  return {
    timezone: 'Test/Zone',
    utcOffsetSeconds,
    current: { timeEpochMs: firstHourEpochMs, temperatureCelsius: 0, weatherCode: 0, isDay: true },
    hourly: Array.from({ length: hourCount }, (_, index) => hour(firstHourEpochMs + index * HOUR_MS)),
    daily: dayStartsEpochMs.map(day),
  };
}

function remaining(source: WeatherReport, nowEpochMs: number): ReadonlyArray<HourlyForecast> {
  return selectRemainingHoursToday(source.hourly, source.daily, source.utcOffsetSeconds, nowEpochMs);
}

describe('selectRemainingHoursToday', () => {
  it('returns the current hour and the rest of today for the real forecast', () => {
    // Fetched at 10:15 UTC = 11:15 in Stockholm: 11:00 – 23:00 local remain.
    const hours = remaining(report, fetchedAtEpochMs);

    expect(hours).toHaveLength(13);
    expect(hours[0]).toBe(report.hourly[11]);
    expect(hours[12]).toBe(report.hourly[23]);
    expect(hours.every((entry) => entry.timeEpochMs < report.daily[1].dateEpochMs)).toBe(true);
  });

  it('keeps the hour that is in progress and drops the hours that have ended', () => {
    const hours = remaining(report, fetchedAtEpochMs);

    expect(hours).toContain(report.hourly[11]); // 11:00 – 12:00 local, now is 11:15
    expect(hours).not.toContain(report.hourly[10]); // 10:00 – 11:00 local, already over
  });

  it('drops an hour exactly when it ends', () => {
    const hours = remaining(report, report.hourly[11].timeEpochMs + HOUR_MS);

    expect(hours[0]).toBe(report.hourly[12]);
    expect(hours).toHaveLength(12);
  });

  it('shows only 23:00 late in the evening and never an hour of tomorrow', () => {
    const halfPastElevenLocal = report.daily[1].dateEpochMs - 30 * 60 * 1000;

    expect(remaining(report, halfPastElevenLocal)).toEqual([report.hourly[23]]);
  });

  it('switches to the new day at local midnight', () => {
    const hours = remaining(report, report.daily[1].dateEpochMs);

    expect(hours).toHaveLength(24);
    expect(hours[0]).toBe(report.hourly[24]);
  });

  it('returns an empty list when no hour of today is left in the data', () => {
    const earlyHoursOnly: WeatherReport = { ...report, hourly: report.hourly.slice(0, 10) };
    expect(remaining(earlyHoursOnly, fetchedAtEpochMs)).toEqual([]);
  });

  it('returns an empty list when there is no hourly data', () => {
    expect(remaining({ ...report, hourly: [] }, fetchedAtEpochMs)).toEqual([]);
  });

  it('uses the location time zone, not the phone: the same instant differs per place', () => {
    const instant = Date.UTC(2026, 10, 20, 3); // 04:00 in Stockholm, 22:00 the evening before in New York
    const stockholm = syntheticReport(3600, [Date.UTC(2026, 10, 19, 23), Date.UTC(2026, 10, 20, 23)], 48);
    const newYork = syntheticReport(-5 * 3600, [Date.UTC(2026, 10, 19, 5), Date.UTC(2026, 10, 20, 5)], 48);

    expect(remaining(stockholm, instant)).toHaveLength(20); // 04:00 – 23:00
    expect(remaining(newYork, instant)).toHaveLength(2); // 22:00 – 23:00
  });

  it('neither drops nor duplicates hours across the real daylight-saving weekend', () => {
    // Real response for 24–26 Oct 2026 in Stockholm (clocks went back on 25 Oct).
    const dstReport = parseWeatherResponse(dstFixture);
    const perDay = dstReport.daily.map((entry) => remaining(dstReport, entry.dateEpochMs));

    expect(perDay.map((hours) => hours.length)).toEqual([24, 24, 24]);
    const all = perDay.flat().map((entry) => entry.timeEpochMs);
    expect(new Set(all).size).toBe(dstReport.hourly.length);
    expect(all).toEqual(dstReport.hourly.map((entry) => entry.timeEpochMs));
  });

  it('falls back to the report offset when today is not in the daily data', () => {
    const withoutDaily: WeatherReport = { ...report, daily: [] };
    expect(remaining(withoutDaily, fetchedAtEpochMs)).toEqual(remaining(report, fetchedAtEpochMs));
  });

  it('leaves out entries whose time is not a finite number', () => {
    const hourly = [
      hour(Number.NaN),
      report.hourly[12],
      hour(Number.POSITIVE_INFINITY),
      hour(Number.NEGATIVE_INFINITY),
    ];

    expect(
      selectRemainingHoursToday(hourly, report.daily, report.utcOffsetSeconds, fetchedAtEpochMs),
    ).toEqual([report.hourly[12]]);
  });

  it('keeps the order of the data and never adds entries', () => {
    const shuffled = [report.hourly[15], report.hourly[12], report.hourly[20]];

    expect(
      selectRemainingHoursToday(shuffled, report.daily, report.utcOffsetSeconds, fetchedAtEpochMs),
    ).toEqual(shuffled);
  });
});

describe('findTodayBounds', () => {
  it('uses the API day start and the next day start', () => {
    expect(findTodayBounds(report.daily, report.utcOffsetSeconds, fetchedAtEpochMs)).toEqual({
      startEpochMs: report.daily[0].dateEpochMs,
      endEpochMs: report.daily[1].dateEpochMs,
    });
  });

  it.each([
    ['Stockholm, UTC+1', 3600, Date.UTC(2026, 10, 20, 10), Date.UTC(2026, 10, 19, 23)],
    ['New York, UTC-5', -5 * 3600, Date.UTC(2026, 10, 20, 3), Date.UTC(2026, 10, 19, 5)],
    ['Kolkata, UTC+5:30', 5.5 * 3600, Date.UTC(2026, 10, 20, 20), Date.UTC(2026, 10, 20, 18, 30)],
  ])('computes local midnight from the offset when there is no daily data (%s)', (_place, offset, now, start) => {
    expect(findTodayBounds([], offset, now)).toEqual({ startEpochMs: start, endEpochMs: start + DAY_MS });
  });
});

describe('selectForecast', () => {
  it('chooses days and hours from the same report', () => {
    const selection = selectForecast(report, fetchedAtEpochMs);

    expect(selection.days).toHaveLength(7);
    expect(selection.todayHours).toHaveLength(13);
    expect(selection.todayDateEpochMs).toBe(report.daily[0].dateEpochMs);
  });
});
