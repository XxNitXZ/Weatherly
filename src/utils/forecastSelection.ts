import type { DailyForecast, HourlyForecast, WeatherReport } from '../models/Weather';

/**
 * Chooses which forecast entries the home screen shows (W-05, W-06).
 * Pure: no React, no I/O; "now" is passed in.
 *
 * Day boundaries are the API's own: each `DailyForecast.dateEpochMs` is the
 * start of that local day, and the next entry's value is its end. Open-Meteo
 * computes these with one fixed UTC offset for the whole report (the
 * location's current offset), also across a daylight-saving change, so every
 * day is exactly 24 hours (checked against real responses, TEST_REPORT §1.7;
 * SPEC D-31). Using the API's boundaries keeps this module consistent with
 * the data, whatever offset rule the API applies.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The forecast shows today and the following six days (W-05). */
export const MAX_FORECAST_DAYS = 7;

/**
 * Index of the daily entry whose day contains `nowEpochMs`, or -1 when now is
 * before the first day or after the last one. Expects `daily` in the API's
 * order (ascending dates).
 */
export function findTodayIndex(daily: ReadonlyArray<DailyForecast>, nowEpochMs: number): number {
  for (let index = 0; index < daily.length; index += 1) {
    const start = daily[index].dateEpochMs;
    const end = index + 1 < daily.length ? daily[index + 1].dateEpochMs : start + DAY_MS;
    if (start <= nowEpochMs && nowEpochMs < end) {
      return index;
    }
  }
  return -1;
}

export type DaySelection = {
  /** Today first, then the following days; at most `MAX_FORECAST_DAYS`. */
  readonly days: ReadonlyArray<DailyForecast>;
  /** `dateEpochMs` of today's entry, or `undefined` when today is not in the data. */
  readonly todayDateEpochMs?: number;
};

/**
 * The days to show, starting with today. Days before today are left out; no
 * day is invented when the data has fewer than seven.
 *
 * If now lies before the first day (e.g. the phone's clock is behind), all
 * days are shown and none is marked as today. If now lies after the last day,
 * nothing is shown.
 */
export function selectForecastDays(
  daily: ReadonlyArray<DailyForecast>,
  nowEpochMs: number,
): DaySelection {
  const todayIndex = findTodayIndex(daily, nowEpochMs);
  if (todayIndex >= 0) {
    return {
      days: daily.slice(todayIndex, todayIndex + MAX_FORECAST_DAYS),
      todayDateEpochMs: daily[todayIndex].dateEpochMs,
    };
  }
  const isBeforeFirstDay = daily.length > 0 && nowEpochMs < daily[0].dateEpochMs;
  return { days: isBeforeFirstDay ? daily.slice(0, MAX_FORECAST_DAYS) : [] };
}

/**
 * Start (inclusive) and end (exclusive) of today at the location.
 *
 * Normally today's daily entry and the next one. If today is not in the
 * daily data, the day is computed from the report's fixed UTC offset, the
 * same rule the API uses for its day boundaries.
 */
export function findTodayBounds(
  daily: ReadonlyArray<DailyForecast>,
  utcOffsetSeconds: number,
  nowEpochMs: number,
): { readonly startEpochMs: number; readonly endEpochMs: number } {
  const todayIndex = findTodayIndex(daily, nowEpochMs);
  if (todayIndex >= 0) {
    const startEpochMs = daily[todayIndex].dateEpochMs;
    const endEpochMs =
      todayIndex + 1 < daily.length ? daily[todayIndex + 1].dateEpochMs : startEpochMs + DAY_MS;
    return { startEpochMs, endEpochMs };
  }
  const offsetMs = utcOffsetSeconds * 1000;
  const startEpochMs = Math.floor((nowEpochMs + offsetMs) / DAY_MS) * DAY_MS - offsetMs;
  return { startEpochMs, endEpochMs: startEpochMs + DAY_MS };
}

/**
 * Today's hourly entries that have not ended yet (W-06): the current hour
 * and the rest of today, in the API's order.
 *
 * Each entry stands for the hour that starts at `timeEpochMs`. It is kept
 * when it starts inside today's bounds and ends after now. Entries are only
 * filtered, never created, merged or reordered, so no hour is dropped or
 * duplicated; an hour at or after local midnight belongs to tomorrow.
 * The parser only lets finite times through; even so, `NaN` fails every
 * comparison below and ±Infinity lies outside today, so such an entry
 * would be left out without a separate check.
 */
export function selectRemainingHoursToday(
  hourly: ReadonlyArray<HourlyForecast>,
  daily: ReadonlyArray<DailyForecast>,
  utcOffsetSeconds: number,
  nowEpochMs: number,
): ReadonlyArray<HourlyForecast> {
  const { startEpochMs, endEpochMs } = findTodayBounds(daily, utcOffsetSeconds, nowEpochMs);
  return hourly.filter(
    (hour) =>
      hour.timeEpochMs >= startEpochMs &&
      hour.timeEpochMs < endEpochMs &&
      hour.timeEpochMs + HOUR_MS > nowEpochMs,
  );
}

/** Everything the forecast sections show, chosen from one report. */
export type ForecastSelection = DaySelection & {
  /** The current hour and the rest of today (`selectRemainingHoursToday`). */
  readonly todayHours: ReadonlyArray<HourlyForecast>;
};

/**
 * Chooses the forecast entries to show from one report, as of `nowEpochMs`.
 * Uses only data that is already in the report: no further request.
 */
export function selectForecast(report: WeatherReport, nowEpochMs: number): ForecastSelection {
  return {
    ...selectForecastDays(report.daily, nowEpochMs),
    todayHours: selectRemainingHoursToday(
      report.hourly,
      report.daily,
      report.utcOffsetSeconds,
      nowEpochMs,
    ),
  };
}

/** Today's daily entry within a selection, for the high and low next to the current weather. */
export function selectTodayForecast(selection: ForecastSelection): DailyForecast | undefined {
  return selection.todayDateEpochMs === undefined
    ? undefined
    : selection.days.find((day) => day.dateEpochMs === selection.todayDateEpochMs);
}
