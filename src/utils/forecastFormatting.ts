import type { DailyForecast, HourlyForecast } from '../models/Weather';
import { describeWeatherCode } from './weatherCode';
import {
  formatCompassDirection,
  formatDaylight,
  formatHours,
  formatLocalTime,
  formatPercent,
  formatPrecipitation,
  formatSnowfall,
  formatTemperature,
  formatTemperatureShort,
  formatUvIndex,
  formatWindSpeed,
} from './weatherFormatting';
import type { DisplayUnits } from './units';
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

/** True when both times fall on the same calendar date at the place (fixed UTC offset). */
export function isSameLocalDay(aEpochMs: number, bEpochMs: number, utcOffsetSeconds: number): boolean {
  const a = new Date(aEpochMs + utcOffsetSeconds * 1000);
  const b = new Date(bEpochMs + utcOffsetSeconds * 1000);
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** A moment as weekday, date and time at the place: shown and spoken forms. */
export type LocalDateTimeText = {
  /** E.g. "Mon 23 Nov, 14:00". */
  readonly text: string;
  /** E.g. "Monday 23 November, 14:00", for screen readers. */
  readonly spoken: string;
};

/**
 * Weekday, date and time of any moment at the place, e.g. an observation
 * time. Unlike `formatDayLabel`, which expects a day's local midnight, this
 * reads the moment itself, so 14:00 stays on its own date.
 */
export function formatLocalDateTime(epochMs: number, utcOffsetSeconds: number): LocalDateTimeText {
  const local = new Date(epochMs + utcOffsetSeconds * 1000);
  const weekdayLong = WEEKDAYS[local.getUTCDay()];
  const month = MONTHS[local.getUTCMonth()];
  const day = local.getUTCDate();
  const time = formatLocalTime(epochMs, utcOffsetSeconds);
  return {
    text: `${weekdayLong.slice(0, 3)} ${day} ${month.slice(0, 3)}, ${time}`,
    spoken: `${weekdayLong} ${day} ${month}, ${time}`,
  };
}

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
  units: DisplayUnits,
): DailyForecastPresentation {
  const label = formatDayLabel(day.dateEpochMs, utcOffsetSeconds);
  const condition = describeWeatherCode(day.weatherCode);
  const high = formatTemperature(day.temperatureMaxCelsius, units.temperature);
  const low = formatTemperature(day.temperatureMinCelsius, units.temperature);
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
  units: DisplayUnits,
): HourlyForecastPresentation {
  const time = formatLocalTime(hour.timeEpochMs, utcOffsetSeconds);
  const temperature = formatTemperature(hour.temperatureCelsius, units.temperature);
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
  units: DisplayUnits,
): ForecastDayRowPresentation {
  return {
    ...presentDailyForecast(day, utcOffsetSeconds, isToday, units),
    icon: weatherIconName(day.weatherCode, true),
    highShort: formatTemperatureShort(day.temperatureMaxCelsius, units.temperature),
    lowShort: formatTemperatureShort(day.temperatureMinCelsius, units.temperature),
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
  units: DisplayUnits,
): ForecastHourItemPresentation {
  const forecast = presentHourlyForecast(hour, utcOffsetSeconds, units);
  const isNow = hour.timeEpochMs <= nowEpochMs && nowEpochMs < hour.timeEpochMs + HOUR_MS;
  return {
    ...forecast,
    label: isNow ? 'Now' : forecast.time,
    icon: weatherIconName(hour.weatherCode, isDaytimeAt(hour.timeEpochMs, daily)),
    temperatureShort: formatTemperatureShort(hour.temperatureCelsius, units.temperature),
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
  /**
   * E.g. "high -2 °C · low -5 °C"; `undefined` when either value is missing,
   * so the hero leaves the line out, like the home screen's hero.
   */
  readonly feelsLike?: string;
  /** One sentence for screen readers, e.g. "Saturday 21 November: Overcast, high 2 °C, low -3 °C". */
  readonly accessibilityLabel: string;
};

/**
 * Display texts for the top of the day detail screen: the date, the
 * condition and the day's high and low (W-07). The values are shown as the
 * API sent them, like the seven-day list.
 */
export function presentDayDetail(
  day: DailyForecast,
  utcOffsetSeconds: number,
  units: DisplayUnits,
): DayDetailPresentation {
  const label = formatDayLabel(day.dateEpochMs, utcOffsetSeconds);
  const condition = describeWeatherCode(day.weatherCode);
  const high = formatTemperature(day.temperatureMaxCelsius, units.temperature);
  const low = formatTemperature(day.temperatureMinCelsius, units.temperature);
  const { apparentTemperatureMaxCelsius: feelsMax, apparentTemperatureMinCelsius: feelsMin } = day;
  const hasFeelsLike = feelsMax !== undefined && feelsMin !== undefined;
  const feelsHigh = hasFeelsLike ? formatTemperature(feelsMax, units.temperature) : '';
  const feelsLow = hasFeelsLike ? formatTemperature(feelsMin, units.temperature) : '';
  const summary = `${label.weekdayLong} ${label.dateLong}: ${condition}, high ${high}, low ${low}`;

  return {
    weekday: label.weekdayLong,
    date: label.dateLong,
    icon: weatherIconName(day.weatherCode, true),
    condition,
    high,
    low,
    feelsLike: hasFeelsLike ? `high ${feelsHigh} · low ${feelsLow}` : undefined,
    // "·" is left out of the spoken text, where it can be read as "dot".
    accessibilityLabel: hasFeelsLike ? `${summary}. Feels like high ${feelsHigh}, low ${feelsLow}` : summary,
  };
}

/** Shown for a missing optional value; the row stays (SPEC D-42). */
export const NOT_AVAILABLE_TEXT = 'Not available';
/** Shown for sunrise and sunset when the sun does not rise (SPEC D-42, OQ-07). */
export const POLAR_NIGHT_TEXT = 'Polar night';
/** Shown for sunrise and sunset when the sun does not set (SPEC D-42, OQ-07). */
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
 * A missing value keeps its row and reads "Not available" (SPEC D-42).
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
  return formatOptional(epochMs, (value) => formatLocalTime(value, utcOffsetSeconds));
}

/**
 * The values of the precipitation, wind and sun-extra rows of the day detail
 * screen (W-07, SPEC D-43). Every value is optional in the API; a missing
 * one keeps its row and reads "Not available" (SPEC D-42).
 */
export type DayConditionsPresentation = {
  readonly precipitationTotal: string;
  readonly precipitationChance: string;
  readonly rain: string;
  readonly snowfall: string;
  readonly precipitationHours: string;
  readonly windSpeedMax: string;
  readonly windGustsMax: string;
  readonly windDirection: string;
  readonly uvIndexMax: string;
  readonly daylight: string;
};

export function presentDayConditions(day: DailyForecast, units: DisplayUnits): DayConditionsPresentation {
  const formatWind = (metresPerSecond: number) => formatWindSpeed(metresPerSecond, units.windSpeed);
  return {
    precipitationTotal: formatOptional(day.precipitationSumMm, formatPrecipitation),
    precipitationChance: formatOptional(day.precipitationProbabilityMaxPercent, formatPercent),
    rain: formatOptional(day.rainSumMm, formatPrecipitation),
    snowfall: formatOptional(day.snowfallSumCm, formatSnowfall),
    precipitationHours: formatOptional(day.precipitationHours, formatHours),
    windSpeedMax: formatOptional(day.windSpeedMaxMs, formatWind),
    windGustsMax: formatOptional(day.windGustsMaxMs, formatWind),
    windDirection: formatOptional(day.windDirectionDominantDegrees, formatCompassDirection),
    uvIndexMax: formatOptional(day.uvIndexMax, formatUvIndex),
    daylight: formatOptional(day.daylightDurationSeconds, formatDaylight),
  };
}

function formatOptional(value: number | undefined, format: (value: number) => string): string {
  return value === undefined ? NOT_AVAILABLE_TEXT : format(value);
}
