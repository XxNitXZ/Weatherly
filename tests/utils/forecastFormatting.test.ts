import { METRIC_UNITS } from '../../src/utils/units';
import fixture from '../fixtures/openMeteoForecast.json';
import detailsFixture from '../fixtures/openMeteoForecastStockholmDetails.json';
import longyearbyenFixture from '../fixtures/openMeteoForecastLongyearbyen.json';
import mcMurdoFixture from '../fixtures/openMeteoForecastMcMurdo.json';
import type { DailyForecast, HourlyForecast } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import { REMOVE, copyWith } from '../helpers/jsonFixtures';
import { weatherIconName } from '../../src/utils/weatherIcon';
import {
  formatDayLabel,
  formatLocalDateTime,
  isSameLocalDay,
  presentDailyForecast,
  presentDayConditions,
  presentDayDetail,
  presentHourlyForecast,
  presentSunTimes,
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
    expect(presentDailyForecast(report.daily[0], STOCKHOLM_OFFSET, true, METRIC_UNITS)).toEqual({
      title: 'Today',
      date: '20 Nov',
      condition: 'Light drizzle',
      high: `2${NBSP}°C`,
      low: `0${NBSP}°C`,
      accessibilityLabel: `Today, Friday 20 November: Light drizzle, high 2${NBSP}°C, low 0${NBSP}°C`,
    });
  });

  it('shows the weekday instead of "Today" for the following days', () => {
    const forecast = presentDailyForecast(report.daily[5], STOCKHOLM_OFFSET, false, METRIC_UNITS);

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

    expect(presentDailyForecast(minimal, 3600, false, METRIC_UNITS)).toMatchObject({
      title: 'Fri',
      condition: 'Slight rain',
      high: `4${NBSP}°C`,
      low: `2${NBSP}°C`,
    });
  });

  it('shows the fallback description for an unknown weather code', () => {
    const unknown: DailyForecast = { ...report.daily[0], weatherCode: 42 };
    expect(presentDailyForecast(unknown, STOCKHOLM_OFFSET, false, METRIC_UNITS).condition).toBe('Unknown conditions');
  });

  it('shows minimum and maximum as sent, even when they are in the wrong order', () => {
    const swapped: DailyForecast = { ...report.daily[0], temperatureMaxCelsius: -1, temperatureMinCelsius: 3 };
    const forecast = presentDailyForecast(swapped, STOCKHOLM_OFFSET, false, METRIC_UNITS);

    expect(forecast.high).toBe(`-1${NBSP}°C`);
    expect(forecast.low).toBe(`3${NBSP}°C`);
  });
});

describe('presentHourlyForecast', () => {
  it('presents the first remaining hour of the real forecast', () => {
    // hourly[11] is 10:00 UTC = 11:00 in Stockholm: 1.2 °C, code 51.
    expect(presentHourlyForecast(report.hourly[11], STOCKHOLM_OFFSET, METRIC_UNITS)).toEqual({
      time: '11:00',
      temperature: `1${NBSP}°C`,
      condition: 'Light drizzle',
      accessibilityLabel: `11:00: 1${NBSP}°C, Light drizzle`,
    });
  });

  it('shows the local hour of a location west of Greenwich', () => {
    const hour: HourlyForecast = { timeEpochMs: Date.UTC(2026, 10, 20, 3), temperatureCelsius: -1.6, weatherCode: 0 };

    expect(presentHourlyForecast(hour, -5 * 3600, METRIC_UNITS)).toMatchObject({ time: '22:00', temperature: `-2${NBSP}°C` });
  });

  it('works without the optional hourly values and with an unknown code', () => {
    const hour: HourlyForecast = { timeEpochMs: Date.UTC(2026, 10, 19, 23), temperatureCelsius: 0.4, weatherCode: 42 };

    expect(presentHourlyForecast(hour, 3600, METRIC_UNITS)).toEqual({
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
    expect(presentDayDetail(report.daily[1], STOCKHOLM_OFFSET, METRIC_UNITS)).toEqual({
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
    const detail = presentDayDetail(report.daily[6], STOCKHOLM_OFFSET, METRIC_UNITS);

    expect(detail.weekday).toBe('Thursday');
    expect(detail.condition).toBe('Overcast');
    expect(detail.high).toBe(`-4${NBSP}°C`);
    expect(detail.low).toBe(`-7${NBSP}°C`);
    expect(detail.accessibilityLabel).toBe(`Thursday 26 November: Overcast, high -4${NBSP}°C, low -7${NBSP}°C`);
  });

  it('uses the same date as the seven-day row it was opened from', () => {
    report.daily.forEach((entry) => {
      const label = formatDayLabel(entry.dateEpochMs, STOCKHOLM_OFFSET);
      const detail = presentDayDetail(entry, STOCKHOLM_OFFSET, METRIC_UNITS);
      expect(`${detail.weekday} ${detail.date}`).toBe(`${label.weekdayLong} ${label.dateLong}`);
    });
  });

  it('always uses the day icon, also for a clear sky', () => {
    const clear: DailyForecast = { ...report.daily[0], weatherCode: 0 };
    expect(presentDayDetail(clear, STOCKHOLM_OFFSET, METRIC_UNITS).icon).toBe(weatherIconName(0, true));
    expect(presentDayDetail(clear, STOCKHOLM_OFFSET, METRIC_UNITS).icon).not.toBe(weatherIconName(0, false));
  });

  it('shows the fallback description for an unknown weather code', () => {
    const unknown: DailyForecast = { ...report.daily[0], weatherCode: 42 };
    const detail = presentDayDetail(unknown, STOCKHOLM_OFFSET, METRIC_UNITS);

    expect(detail.condition).toBe('Unknown conditions');
    expect(detail.accessibilityLabel).toContain('Unknown conditions');
  });

  it('shows minimum and maximum as sent, even when they are in the wrong order', () => {
    const swapped: DailyForecast = { ...report.daily[0], temperatureMaxCelsius: -1, temperatureMinCelsius: 3 };
    const detail = presentDayDetail(swapped, STOCKHOLM_OFFSET, METRIC_UNITS);

    expect(detail.high).toBe(`-1${NBSP}°C`);
    expect(detail.low).toBe(`3${NBSP}°C`);
  });
});

describe('presentSunTimes', () => {
  // Real forecasts fetched on 2026-11-23 with the app's own request:
  // Longyearbyen (78.22, 15.65) is in polar night, McMurdo (-77.85, 166.67)
  // has midnight sun. Open-Meteo marks both without `null`.
  const longyearbyen = parseWeatherResponse(longyearbyenFixture);
  const mcMurdo = parseWeatherResponse(mcMurdoFixture);

  it('shows the real Stockholm sunrise and sunset in local time', () => {
    expect(presentSunTimes(report.daily[0], STOCKHOLM_OFFSET)).toEqual({ sunrise: '07:53', sunset: '15:12' });
    expect(presentSunTimes(report.daily[1], STOCKHOLM_OFFSET)).toEqual({ sunrise: '07:55', sunset: '15:11' });
  });

  it('shows "Polar night" for every real Longyearbyen day (sunrise = sunset)', () => {
    longyearbyen.daily.forEach((entry) => {
      expect(presentSunTimes(entry, longyearbyen.utcOffsetSeconds)).toEqual({
        sunrise: 'Polar night',
        sunset: 'Polar night',
      });
    });
  });

  it('shows "Midnight sun" for every real McMurdo day (sunrise at the day start, sunset 24 h later)', () => {
    mcMurdo.daily.forEach((entry) => {
      expect(presentSunTimes(entry, mcMurdo.utcOffsetSeconds)).toEqual({
        sunrise: 'Midnight sun',
        sunset: 'Midnight sun',
      });
    });
  });

  it('does not take a long real day for midnight sun when sunrise is after the day start', () => {
    // 23½ hours of daylight, starting 15 minutes after midnight.
    const start = report.daily[0].dateEpochMs;
    const longDay: DailyForecast = {
      ...report.daily[0],
      sunriseEpochMs: start + 15 * 60 * 1000,
      sunsetEpochMs: start + 23.75 * HOUR_MS,
    };
    expect(presentSunTimes(longDay, STOCKHOLM_OFFSET)).toEqual({ sunrise: '00:15', sunset: '23:45' });
  });

  it('keeps the row and shows "Not available" for a missing value', () => {
    const { sunsetEpochMs: _sunset, ...noSunset } = report.daily[0];
    const { sunriseEpochMs: _sunrise, ...noSunrise } = report.daily[0];
    const { sunriseEpochMs: _r, sunsetEpochMs: _s, ...neither } = report.daily[0];

    expect(presentSunTimes(noSunset, STOCKHOLM_OFFSET)).toEqual({ sunrise: '07:53', sunset: 'Not available' });
    expect(presentSunTimes(noSunrise, STOCKHOLM_OFFSET)).toEqual({ sunrise: 'Not available', sunset: '15:12' });
    expect(presentSunTimes(neither, STOCKHOLM_OFFSET)).toEqual({ sunrise: 'Not available', sunset: 'Not available' });
  });

  it('uses the given UTC offset, also west of Greenwich and with half hours', () => {
    // Stockholm's 07:53 / 15:12 is 06:53 / 14:12 UTC.
    expect(presentSunTimes(report.daily[0], -5 * 3600)).toEqual({ sunrise: '01:53', sunset: '09:12' });
    expect(presentSunTimes(report.daily[0], 5.5 * 3600)).toEqual({ sunrise: '12:23', sunset: '19:42' });
  });
});

describe('presentDayDetail – feels like (SPEC D-43)', () => {
  const details = parseWeatherResponse(detailsFixture);

  it('adds the real feels-like high and low to the text and the spoken sentence', () => {
    // daily[0]: Monday 23 November, code 53, 2.7 / 1.3 °C, feels like -2.3 / -4.6 °C.
    const detail = presentDayDetail(details.daily[0], details.utcOffsetSeconds, METRIC_UNITS);

    expect(detail.feelsLike).toBe(`high -2${NBSP}°C · low -5${NBSP}°C`);
    expect(detail.accessibilityLabel).toBe(
      `Monday 23 November: Moderate drizzle, high 3${NBSP}°C, low 1${NBSP}°C. Feels like high -2${NBSP}°C, low -5${NBSP}°C`,
    );
  });

  it('leaves feels-like out when either value is missing', () => {
    const { apparentTemperatureMinCelsius: _min, ...noMin } = details.daily[0];
    const { apparentTemperatureMaxCelsius: _max, ...noMax } = details.daily[0];

    [noMin, noMax].forEach((day) => {
      const detail = presentDayDetail(day, details.utcOffsetSeconds, METRIC_UNITS);
      expect(detail.feelsLike).toBeUndefined();
      expect(detail.accessibilityLabel).not.toContain('Feels like');
    });
  });
});

describe('presentDayConditions', () => {
  const details = parseWeatherResponse(detailsFixture);

  it('presents a real rainy day', () => {
    expect(presentDayConditions(details.daily[0], METRIC_UNITS)).toEqual({
      precipitationTotal: `7.5${NBSP}mm`,
      precipitationChance: `100${NBSP}%`,
      rain: `7.5${NBSP}mm`,
      snowfall: `0.0${NBSP}cm`,
      precipitationHours: `22${NBSP}h`,
      windSpeedMax: `8.5${NBSP}m/s`,
      windGustsMax: `15.4${NBSP}m/s`,
      windDirection: 'N',
      uvIndexMax: '0',
      daylight: `7${NBSP}h 7${NBSP}min`,
    });
  });

  it('presents a real dry day', () => {
    // daily[5]: no precipitation, wind from 203° (SW).
    expect(presentDayConditions(details.daily[5], METRIC_UNITS)).toMatchObject({
      precipitationTotal: `0.0${NBSP}mm`,
      precipitationChance: `2${NBSP}%`,
      precipitationHours: `0${NBSP}h`,
      windGustsMax: `5.3${NBSP}m/s`,
      windDirection: 'SW',
      uvIndexMax: '1',
    });
  });

  it('keeps every row and shows "Not available" when the API sent none of the values', () => {
    const bare: DailyForecast = {
      dateEpochMs: details.daily[0].dateEpochMs,
      weatherCode: 3,
      temperatureMaxCelsius: 1,
      temperatureMinCelsius: -1,
    };
    const rows = Object.values(presentDayConditions(bare, METRIC_UNITS));

    expect(rows).toHaveLength(10);
    expect(rows.every((value) => value === 'Not available')).toBe(true);
  });

  it('shows "Not available" only in the row whose value is missing', () => {
    const { windGustsMaxMs: _gusts, ...noGusts } = details.daily[0];
    const conditions = presentDayConditions(noGusts, METRIC_UNITS);

    expect(conditions.windGustsMax).toBe('Not available');
    expect(conditions.windSpeedMax).toBe(`8.5${NBSP}m/s`);
  });

  it('shows zero as a value, not as "Not available"', () => {
    const conditions = presentDayConditions(details.daily[3], METRIC_UNITS);
    expect(conditions.precipitationTotal).toBe(`0.0${NBSP}mm`);
    expect(conditions.snowfall).toBe(`0.0${NBSP}cm`);
  });
});

describe('day detail from the API response (missing values end to end, NIT-237)', () => {
  // The whole chain the detail screen uses: real JSON → parser → presenters →
  // row texts. Each case changes exactly one thing in the real response.
  type Rows = Record<string, string>;

  function rowsFor(json: unknown, dayIndex: number): Rows {
    const report = parseWeatherResponse(json);
    const day = report.daily[dayIndex];
    const sun = presentSunTimes(day, report.utcOffsetSeconds);
    return { ...presentDayConditions(day, METRIC_UNITS), sunrise: sun.sunrise, sunset: sun.sunset };
  }

  const ROW_FOR_FIELD: ReadonlyArray<readonly [string, string]> = [
    ['precipitation_sum', 'precipitationTotal'],
    ['precipitation_probability_max', 'precipitationChance'],
    ['rain_sum', 'rain'],
    ['snowfall_sum', 'snowfall'],
    ['precipitation_hours', 'precipitationHours'],
    ['wind_speed_10m_max', 'windSpeedMax'],
    ['wind_gusts_10m_max', 'windGustsMax'],
    ['wind_direction_10m_dominant', 'windDirection'],
    ['uv_index_max', 'uvIndexMax'],
    ['daylight_duration', 'daylight'],
    ['sunrise', 'sunrise'],
    ['sunset', 'sunset'],
  ];

  const complete = rowsFor(detailsFixture, 0);

  it('has a real value in every row when the API sends everything', () => {
    expect(Object.keys(complete)).toHaveLength(ROW_FOR_FIELD.length);
    expect(Object.values(complete)).not.toContain('Not available');
  });

  it.each(ROW_FOR_FIELD)('without %s, only the %s row reads "Not available"', (field, row) => {
    const rows = rowsFor(copyWith(detailsFixture, ['daily', field], REMOVE), 0);

    expect(rows[row]).toBe('Not available');
    expect({ ...rows, [row]: complete[row] }).toEqual(complete);
  });

  it('a null for one day gives "Not available" on that day only', () => {
    const json = copyWith(detailsFixture, ['daily', 'wind_gusts_10m_max', 2], null);

    expect(rowsFor(json, 2).windGustsMax).toBe('Not available');
    expect(rowsFor(json, 1).windGustsMax).toBe(`13.4${NBSP}m/s`);
    expect(rowsFor(json, 3).windGustsMax).toBe(`6.2${NBSP}m/s`);
  });

  it.each(['apparent_temperature_max', 'apparent_temperature_min'])(
    'without %s, the hero leaves the feels-like line out',
    (field) => {
      const report = parseWeatherResponse(copyWith(detailsFixture, ['daily', field], REMOVE));
      const detail = presentDayDetail(report.daily[0], report.utcOffsetSeconds, METRIC_UNITS);

      expect(detail.feelsLike).toBeUndefined();
      expect(detail.high).toBe(`3${NBSP}°C`);
    },
  );

  it('an older response without the detail fields shows "Not available" in exactly the new rows', () => {
    const rows = rowsFor(fixture, 0);
    const newRows = ['rain', 'snowfall', 'precipitationHours', 'windGustsMax', 'windDirection', 'uvIndexMax', 'daylight'];

    newRows.forEach((row) => expect(rows[row]).toBe('Not available'));
    expect(rows.precipitationTotal).toBe(`1.4${NBSP}mm`);
    expect(rows.sunrise).toBe('07:53');
  });

  it('shows zero as a value, not as missing, on a real dry day', () => {
    // daily[4]: no precipitation at all, 0 h.
    const rows = rowsFor(detailsFixture, 4);

    expect(rows.precipitationTotal).toBe(`0.0${NBSP}mm`);
    expect(rows.rain).toBe(`0.0${NBSP}mm`);
    expect(rows.snowfall).toBe(`0.0${NBSP}cm`);
    expect(rows.precipitationHours).toBe(`0${NBSP}h`);
  });
});

describe('isSameLocalDay (SPEC D-48)', () => {
  const STOCKHOLM_WINTER = 3600;
  const MCMURDO_SUMMER = 13 * 3600;

  it('is true for 00:10 and 23:50 on the same day at the place', () => {
    // 00:10 and 23:50 on 20 Nov in Stockholm (UTC+1).
    expect(isSameLocalDay(Date.UTC(2026, 10, 19, 23, 10), Date.UTC(2026, 10, 20, 22, 50), STOCKHOLM_WINTER)).toBe(true);
  });

  it('is false for 23:30 and 00:10 the next day at the place', () => {
    expect(isSameLocalDay(Date.UTC(2026, 10, 20, 22, 30), Date.UTC(2026, 10, 20, 23, 10), STOCKHOLM_WINTER)).toBe(false);
  });

  it("uses the place's date, not the UTC date (McMurdo, UTC+13)", () => {
    // Both on 20 Nov in UTC, but 20 Nov 23:00 and 21 Nov 01:00 in McMurdo.
    expect(isSameLocalDay(Date.UTC(2026, 10, 20, 10, 0), Date.UTC(2026, 10, 20, 12, 0), MCMURDO_SUMMER)).toBe(false);
  });
});

describe('formatLocalDateTime (SPEC D-48)', () => {
  it('gives the weekday, date and time at the place, short and spoken', () => {
    // 14:00 on Mon 23 Nov 2026 in Stockholm (UTC+1).
    expect(formatLocalDateTime(Date.UTC(2026, 10, 23, 13, 0), 3600)).toEqual({
      text: 'Mon 23 Nov, 14:00',
      spoken: 'Monday 23 November, 14:00',
    });
  });

  it('keeps an afternoon time on its own date', () => {
    // 23:30 local: reading it at "noon + 12 h" would move it to the next day.
    expect(formatLocalDateTime(Date.UTC(2026, 10, 23, 22, 30), 3600).text).toBe('Mon 23 Nov, 23:30');
  });

  it("uses the place's date when it is a day ahead of UTC", () => {
    // 20 Nov 19:00 UTC is Sat 21 Nov 08:00 in McMurdo (UTC+13).
    expect(formatLocalDateTime(Date.UTC(2026, 10, 20, 19, 0), 13 * 3600).text).toBe('Sat 21 Nov, 08:00');
  });
});
