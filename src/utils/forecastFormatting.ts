import type { DailyForecast, HourlyForecast } from '../models/Weather';
import { describeWeatherCode } from './weatherCode';
import { formatLocalTime, formatTemperature, formatTemperatureShort } from './weatherFormatting';
import { isDaytimeAt, weatherIconName, type WeatherIconName } from './weatherIcon';

/**
 * Display texts for the forecast lists (W-05, W-06). Pure: no React, no I/O,
 * no `Intl` (its time-zone support on Hermes is not documented). English
 * names, as for all app text (SPEC D-27).
 *
 * Local time uses the report's `utcOffsetSeconds`, the same fixed offset the
 * API used to group the data into days (SPEC D-31).
 */

const HOUR_MS = 60 * 60 * 1000;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export type DayLabel = {
  /** E.g. "Fri". */
  readonly weekday: string;
  /** E.g. "Friday". */
  readonly weekdayLong: string;
  /** E.g. "20 Nov". */
  readonly date: string;
  /** E.g. "20 November". */
  readonly dateLong: string;
};

/**
 * The weekday and date of a forecast day at the location.
 *
 * The label is read at local **noon** of that day rather than at midnight,
 * so it stays on the right calendar date even if a day start were off by an
 * hour or more, e.g. around a daylight-saving change.
 */
export function formatDayLabel(dateEpochMs: number, utcOffsetSeconds: number): DayLabel {
  const localNoon = new Date(dateEpochMs + utcOffsetSeconds * 1000 + 12 * HOUR_MS);
  const weekdayLong = WEEKDAYS[localNoon.getUTCDay()];
  const month = MONTHS[localNoon.getUTCMonth()];
  const day = localNoon.getUTCDate();
  return {
    weekday: weekdayLong.slice(0, 3),
    weekdayLong,
    date: `${day} ${month.slice(0, 3)}`,
    dateLong: `${day} ${month}`,
  };
}

export type DailyForecastPresentation = {
  /** "Today" for today, otherwise the short weekday, e.g. "Sat". */
  readonly title: string;
  /** E.g. "21 Nov". */
  readonly date: string;
  readonly condition: string;
  /** E.g. "2 °C". */
  readonly high: string;
  /** E.g. "-3 °C". */
  readonly low: string;
  /** One sentence for screen readers with the full weekday and date. */
  readonly accessibilityLabel: string;
};

/**
 * Display texts for one forecast day. The minimum and maximum are shown as
 * the API sent them, without reordering or correction.
 */
export function presentDailyForecast(
  day: DailyForecast,
  utcOffsetSeconds: number,
  isToday: boolean,
): DailyForecastPresentation {
  const label = formatDayLabel(day.dateEpochMs, utcOffsetSeconds);
  const condition = describeWeatherCode(day.weatherCode);
  const high = formatTemperature(day.temperatureMaxCelsius);
  const low = formatTemperature(day.temperatureMinCelsius);
  const spokenDay = `${isToday ? 'Today, ' : ''}${label.weekdayLong} ${label.dateLong}`;

  return {
    title: isToday ? 'Today' : label.weekday,
    date: label.date,
    condition,
    high,
    low,
    accessibilityLabel: `${spokenDay}: ${condition}, high ${high}, low ${low}`,
  };
}

export type HourlyForecastPresentation = {
  /** Local time at the location, e.g. "14:00". */
  readonly time: string;
  /** E.g. "2 °C". */
  readonly temperature: string;
  readonly condition: string;
  /** One sentence for screen readers. */
  readonly accessibilityLabel: string;
};

/** Display texts for one hour of today's forecast (W-06). */
export function presentHourlyForecast(
  hour: HourlyForecast,
  utcOffsetSeconds: number,
): HourlyForecastPresentation {
  const time = formatLocalTime(hour.timeEpochMs, utcOffsetSeconds);
  const temperature = formatTemperature(hour.temperatureCelsius);
  const condition = describeWeatherCode(hour.weatherCode);
  return { time, temperature, condition, accessibilityLabel: `${time}: ${temperature}, ${condition}` };
}

/** A seven-day row in the weather-first layout (SPEC D-33): adds an icon and compact temperatures. */
export type ForecastDayRowPresentation = DailyForecastPresentation & {
  readonly icon: WeatherIconName;
  /** E.g. "2°". */
  readonly highShort: string;
  readonly lowShort: string;
};

/** Builds on `presentDailyForecast`; a day row always uses the day icon. */
export function presentForecastDayRow(
  day: DailyForecast,
  utcOffsetSeconds: number,
  isToday: boolean,
): ForecastDayRowPresentation {
  return {
    ...presentDailyForecast(day, utcOffsetSeconds, isToday),
    icon: weatherIconName(day.weatherCode, true),
    highShort: formatTemperatureShort(day.temperatureMaxCelsius),
    lowShort: formatTemperatureShort(day.temperatureMinCelsius),
  };
}

/** One hour in the weather-first layout (SPEC D-33): adds "Now", an icon and a compact temperature. */
export type ForecastHourItemPresentation = HourlyForecastPresentation & {
  /** "Now" for the hour in progress, otherwise the local time, e.g. "14:00". */
  readonly label: string;
  readonly icon: WeatherIconName;
  /** E.g. "2°". */
  readonly temperatureShort: string;
};

/**
 * Builds on `presentHourlyForecast`. The icon follows the real sunrise and
 * sunset of the hour's day (`isDaytimeAt`). The hour that contains `nowEpochMs`
 * is labelled "Now".
 */
export function presentForecastHourItem(
  hour: HourlyForecast,
  utcOffsetSeconds: number,
  daily: ReadonlyArray<DailyForecast>,
  nowEpochMs: number,
): ForecastHourItemPresentation {
  const forecast = presentHourlyForecast(hour, utcOffsetSeconds);
  const isNow = hour.timeEpochMs <= nowEpochMs && nowEpochMs < hour.timeEpochMs + HOUR_MS;
  return {
    ...forecast,
    label: isNow ? 'Now' : forecast.time,
    icon: weatherIconName(hour.weatherCode, isDaytimeAt(hour.timeEpochMs, daily)),
    temperatureShort: formatTemperatureShort(hour.temperatureCelsius),
    accessibilityLabel: isNow ? `Now, ${forecast.accessibilityLabel}` : forecast.accessibilityLabel,
  };
}
