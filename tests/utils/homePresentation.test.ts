import fixture from '../fixtures/openMeteoForecast.json';
import type { CurrentWeather, HourlyForecast } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import { presentForecastDayRow, presentForecastHourItem } from '../../src/utils/forecastFormatting';
import { selectForecast, selectTodayForecast } from '../../src/utils/forecastSelection';
import { formatTemperatureShort, presentWeatherHero } from '../../src/utils/weatherFormatting';
import { skyVariantFor } from '../../src/theme/sky';

/**
 * Tests for the presentation of the weather-first home screen (SPEC D-33):
 * the hero, the compact seven-day rows and hourly items, and the sky. Uses
 * the saved real forecast (Stockholm, fetched 2026-11-20 at 11:15 local).
 */

const NBSP = ' ';
const HOUR_MS = 60 * 60 * 1000;
const report = parseWeatherResponse(fixture);
const fetchedAtEpochMs = fixture.current.time * 1000;
const OFFSET = report.utcOffsetSeconds;

describe('formatTemperatureShort', () => {
  it.each([
    [1.2, '1°'],
    [-2.6, '-3°'],
    [-0.4, '0°'],
    [25.5, '26°'],
  ])('%p → %j', (celsius, expected) => {
    expect(formatTemperatureShort(celsius)).toBe(expected);
  });
});

describe('selectTodayForecast', () => {
  it("returns today's daily entry from the selection", () => {
    expect(selectTodayForecast(selectForecast(report, fetchedAtEpochMs))).toBe(report.daily[0]);
  });

  it('returns undefined when today is not in the data', () => {
    const beforeFirstDay = selectForecast(report, report.daily[0].dateEpochMs - 1);
    expect(selectTodayForecast(beforeFirstDay)).toBeUndefined();
  });
});

describe('presentWeatherHero', () => {
  it("shows the real current weather with today's high and low", () => {
    const hero = presentWeatherHero(report.current, OFFSET, report.daily[0]);

    expect(hero).toMatchObject({
      temperatureShort: '1°',
      condition: 'Overcast',
      icon: 'weather-cloudy',
      highShort: '2°', // 1.8 °C
      lowShort: '0°', // 0.4 °C
      observedAt: '11:15',
    });
    expect(hero.accessibilityLabel).toBe(
      `Now 1${NBSP}°C, Overcast. High 2${NBSP}°C, low 0${NBSP}°C. ` +
        `Feels like -3${NBSP}°C, humidity 89${NBSP}%, wind 3.1${NBSP}m/s. Observed at 11:15 local time.`,
    );
  });

  it('leaves out the high and low when today is not in the forecast', () => {
    const hero = presentWeatherHero(report.current, OFFSET, undefined);

    expect(hero.highShort).toBeUndefined();
    expect(hero.lowShort).toBeUndefined();
    expect(hero.accessibilityLabel).not.toContain('High');
  });

  it('leaves out missing optional values and starts the details with a capital letter', () => {
    const current: CurrentWeather = { ...report.current, apparentTemperatureCelsius: undefined, windSpeedMs: undefined };
    const hero = presentWeatherHero(current, OFFSET, undefined);

    expect(hero.accessibilityLabel).toBe(
      `Now 1${NBSP}°C, Overcast. Humidity 89${NBSP}%. Observed at 11:15 local time.`,
    );
  });

  it('uses the night icon when it is dark at the location', () => {
    const clearNight: CurrentWeather = { ...report.current, weatherCode: 0, isDay: false };
    expect(presentWeatherHero(clearNight, OFFSET, undefined).icon).toBe('weather-night');
  });
});

describe('presentForecastDayRow', () => {
  it('adds an icon and compact temperatures to the existing day texts', () => {
    expect(presentForecastDayRow(report.daily[0], OFFSET, true)).toMatchObject({
      title: 'Today',
      date: '20 Nov',
      condition: 'Light drizzle',
      icon: 'weather-rainy',
      highShort: '2°',
      lowShort: '0°',
      high: `2${NBSP}°C`,
    });
  });

  it('keeps the full units in the screen-reader label', () => {
    expect(presentForecastDayRow(report.daily[5], OFFSET, false).accessibilityLabel).toBe(
      `Wednesday 25 November: Overcast, high 0${NBSP}°C, low -5${NBSP}°C`,
    );
  });
});

describe('presentForecastHourItem', () => {
  it('labels the hour in progress "Now"', () => {
    // hourly[11] is 11:00 – 12:00 local; the report was fetched at 11:15.
    expect(presentForecastHourItem(report.hourly[11], OFFSET, report.daily, fetchedAtEpochMs)).toMatchObject({
      label: 'Now',
      temperatureShort: '1°',
      icon: 'weather-rainy',
      accessibilityLabel: `Now, 11:00: 1${NBSP}°C, Light drizzle`,
    });
  });

  it('labels later hours with their local time', () => {
    const item = presentForecastHourItem(report.hourly[12], OFFSET, report.daily, fetchedAtEpochMs);

    expect(item.label).toBe('12:00');
    expect(item.accessibilityLabel).toBe(`12:00: ${item.temperature}, ${item.condition}`);
  });

  it('chooses the day or night icon from the real sunrise and sunset', () => {
    const clearAt = (localHour: number): HourlyForecast => ({
      timeEpochMs: report.daily[0].dateEpochMs + localHour * HOUR_MS,
      temperatureCelsius: 0,
      weatherCode: 0,
    });

    expect(presentForecastHourItem(clearAt(12), OFFSET, report.daily, fetchedAtEpochMs).icon).toBe('weather-sunny');
    expect(presentForecastHourItem(clearAt(21), OFFSET, report.daily, fetchedAtEpochMs).icon).toBe('weather-night');
  });
});

describe('skyVariantFor', () => {
  it.each([
    [true, 'day'],
    [false, 'night'],
    [undefined, 'day'],
  ] as const)('isDay %p → %s sky', (isDay, expected) => {
    expect(skyVariantFor(isDay)).toBe(expected);
  });
});
