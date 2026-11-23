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

/** The typed view props of the day detail screen (W-07, NIT-232). */
export type DayDetailPresentation = {
  /** E.g. "Saturday". */
  readonly weekday: string;
  /** E.g. "21 November". */
  readonly date: string;
  /** A day always uses the day icon, as in the seven-day list. */
  readonly icon: WeatherIconName;
  readonly condition: string;
  /** With the full unit, e.g. "2 °C" (SPEC D-33: details keep full units). */
  readonly high: string;
  readonly low: string;
  /** One sentence for screen readers, e.g. "Saturday 21 November: Overcast, high 2 °C, low -3 °C". */
  readonly accessibilityLabel: string;
};

/**
 * Display texts for the top of the day detail screen: the date, the
 * condition and the day's high and low (W-07). The values are shown as the
 * API sent them, like the seven-day list.
 */
export function presentDayDetail(day: DailyForecast, utcOffsetSeconds: number): DayDetailPresentation {
  const label = formatDayLabel(day.dateEpochMs, utcOffsetSeconds);
  const condition = describeWeatherCode(day.weatherCode);
  const high = formatTemperature(day.temperatureMaxCelsius);
  const low = formatTemperature(day.temperatureMinCelsius);

  return {
    weekday: label.weekdayLong,
    date: label.dateLong,
    icon: weatherIconName(day.weatherCode, true),
    condition,
    high,
    low,
    accessibilityLabel: `${label.weekdayLong} ${label.dateLong}: ${condition}, high ${high}, low ${low}`,
  };
}

/** Shown for a missing optional value; the row stays (SPEC D-38). */
export const NOT_AVAILABLE_TEXT = 'Not available';
/** Shown for sunrise and sunset when the sun does not rise (SPEC D-38, OQ-07). */
export const POLAR_NIGHT_TEXT = 'Polar night';
/** Shown for sunrise and sunset when the sun does not set (SPEC D-38, OQ-07). */
export const MIDNIGHT_SUN_TEXT = 'Midnight sun';

/**
 * The shortest calendar day is 23 hours (the day clocks go forward), so a
 * day of midnight sun lasts at least this long from sunrise to sunset.
 */
const MIN_MIDNIGHT_SUN_MS = 23 * 60 * 60 * 1000;

/** The sun card of the day detail screen (W-07, NIT-234). */
export type SunTimesPresentation = {
  /** E.g. "07:53", or a polar text, or "Not available". */
  readonly sunrise: string;
  readonly sunset: string;
};

/**
 * Sunrise and sunset in the location's local time (W-07).
 *
 * Open-Meteo sends no `null` for days without a normal sunrise or sunset
 * (TEST_REPORT §1.2, saved fixtures for Longyearbyen and McMurdo):
 * - polar night: sunrise and sunset are the same moment (the day's start);
 * - midnight sun: sunrise is the day's start and sunset the next day's start.
 *
 * Checking that sunrise is exactly the day's start keeps a real day of 23½
 * hours of daylight near the polar circle from being shown as midnight sun.
 * A missing value keeps its row and reads "Not available" (SPEC D-38).
 */
export function presentSunTimes(day: DailyForecast, utcOffsetSeconds: number): SunTimesPresentation {
  const { sunriseEpochMs, sunsetEpochMs } = day;

  if (sunriseEpochMs !== undefined && sunsetEpochMs !== undefined) {
    if (sunriseEpochMs === sunsetEpochMs) {
      return { sunrise: POLAR_NIGHT_TEXT, sunset: POLAR_NIGHT_TEXT };
    }
    if (sunriseEpochMs === day.dateEpochMs && sunsetEpochMs - sunriseEpochMs >= MIN_MIDNIGHT_SUN_MS) {
      return { sunrise: MIDNIGHT_SUN_TEXT, sunset: MIDNIGHT_SUN_TEXT };
    }
  }

  return {
    sunrise: formatOptionalLocalTime(sunriseEpochMs, utcOffsetSeconds),
    sunset: formatOptionalLocalTime(sunsetEpochMs, utcOffsetSeconds),
  };
}

function formatOptionalLocalTime(epochMs: number | undefined, utcOffsetSeconds: number): string {
  return epochMs === undefined ? NOT_AVAILABLE_TEXT : formatLocalTime(epochMs, utcOffsetSeconds);
}
