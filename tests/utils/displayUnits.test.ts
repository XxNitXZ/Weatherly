import fixture from '../fixtures/openMeteoForecast.json';
import detailsFixture from '../fixtures/openMeteoForecastStockholmDetails.json';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import {
  presentDailyForecast,
  presentDayConditions,
  presentDayDetail,
  presentForecastDayRow,
  presentForecastHourItem,
  presentHourlyForecast,
} from '../../src/utils/forecastFormatting';
import { METRIC_UNITS, type DisplayUnits } from '../../src/utils/units';
import {
  formatTemperature,
  formatTemperatureShort,
  formatWindSpeed,
  presentCurrentWeather,
  presentWeatherHero,
} from '../../src/utils/weatherFormatting';

/**
 * The user's units on every screen (W-12, NIT-255; SPEC D-46): the formatters
 * convert first and round once, and every presenter that shows a temperature
 * or a wind speed uses the chosen unit, also in its screen-reader text. Real
 * values from the saved Stockholm forecasts.
 */

const NBSP = '\u00A0';
const IMPERIAL: DisplayUnits = { temperature: 'fahrenheit', windSpeed: 'kilometresPerHour' };
const report = parseWeatherResponse(fixture);
const details = parseWeatherResponse(detailsFixture);
const OFFSET = report.utcOffsetSeconds;
const NOW = fixture.current.time * 1000;

describe('formatters in the chosen unit', () => {
  it('show real temperatures in °F, rounded after converting', () => {
    expect(formatTemperature(1.2, 'fahrenheit')).toBe(`34${NBSP}°F`); // 34.16
    expect(formatTemperature(-2.6, 'fahrenheit')).toBe(`27${NBSP}°F`); // 27.32
    // 0.4 °C is 32.72 °F → 33. Rounding the °C value first would give 32.
    expect(formatTemperature(0.4, 'fahrenheit')).toBe(`33${NBSP}°F`);
    expect(formatTemperatureShort(0.4, 'fahrenheit')).toBe('33°');
  });

  it('never shows "-0" in °F', () => {
    expect(formatTemperature(-17.8, 'fahrenheit')).toBe(`0${NBSP}°F`); // -0.04
  });

  it('show real wind speeds in whole km/h, and m/s with one decimal as before', () => {
    expect(formatWindSpeed(3.1, 'kilometresPerHour')).toBe(`11${NBSP}km/h`); // 11.16
    expect(formatWindSpeed(15.4, 'kilometresPerHour')).toBe(`55${NBSP}km/h`); // 55.44
    expect(formatWindSpeed(0, 'kilometresPerHour')).toBe(`0${NBSP}km/h`);
    expect(formatWindSpeed(3.1, 'metresPerSecond')).toBe(`3.1${NBSP}m/s`);
  });
});

describe('presenters in °F and km/h', () => {
  it('home hero: current, feels-like, wind, high and low, and the spoken summary', () => {
    const hero = presentWeatherHero(report.current, OFFSET, report.daily[0], IMPERIAL);

    expect(hero).toMatchObject({
      temperature: `34${NBSP}°F`,
      temperatureShort: '34°',
      feelsLike: `27${NBSP}°F`,
      wind: `11${NBSP}km/h`,
      highShort: '35°',
      lowShort: '33°',
    });
    expect(hero.accessibilityLabel).toContain(`Now 34${NBSP}°F`);
    expect(hero.accessibilityLabel).toContain(`High 35${NBSP}°F, low 33${NBSP}°F`);
    expect(hero.accessibilityLabel).toContain(`wind 11${NBSP}km/h`);
  });

  it('hourly item: the hour in progress', () => {
    expect(presentForecastHourItem(report.hourly[11], OFFSET, report.daily, NOW, IMPERIAL)).toMatchObject({
      temperature: `34${NBSP}°F`,
      temperatureShort: '34°',
      accessibilityLabel: `Now, 11:00: 34${NBSP}°F, Light drizzle`,
    });
  });

  it('seven-day row: today', () => {
    expect(presentForecastDayRow(report.daily[0], OFFSET, true, IMPERIAL)).toMatchObject({
      high: `35${NBSP}°F`,
      low: `33${NBSP}°F`,
      highShort: '35°',
      lowShort: '33°',
      accessibilityLabel: `Today, Friday 20 November: Light drizzle, high 35${NBSP}°F, low 33${NBSP}°F`,
    });
  });

  it('day detail: high, low, feels-like and the spoken sentence', () => {
    // 2.7 / 1.3 °C, feels like -2.3 / -4.6 °C.
    expect(presentDayDetail(details.daily[0], details.utcOffsetSeconds, IMPERIAL)).toMatchObject({
      high: `37${NBSP}°F`,
      low: `34${NBSP}°F`,
      feelsLike: `high 28${NBSP}°F · low 24${NBSP}°F`,
      accessibilityLabel: `Monday 23 November: Moderate drizzle, high 37${NBSP}°F, low 34${NBSP}°F. Feels like high 28${NBSP}°F, low 24${NBSP}°F`,
    });
  });

  it('day detail Wind card: max speed and gusts; other rows unchanged', () => {
    const imperial = presentDayConditions(details.daily[0], IMPERIAL);
    const metric = presentDayConditions(details.daily[0], METRIC_UNITS);

    expect(imperial.windSpeedMax).toBe(`31${NBSP}km/h`); // 8.5 m/s = 30.6
    expect(imperial.windGustsMax).toBe(`55${NBSP}km/h`); // 15.4 m/s = 55.44
    expect({ ...imperial, windSpeedMax: '', windGustsMax: '' }).toEqual({ ...metric, windSpeedMax: '', windGustsMax: '' });
  });
});

/** Every string anywhere in `value` (objects and arrays included). */
function allTexts(value: unknown): ReadonlyArray<string> {
  if (typeof value === 'string') {
    return [value];
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(allTexts);
  }
  return [];
}

/** Every text the screens show for the real forecasts, in `units`. */
function everyScreenText(units: DisplayUnits): ReadonlyArray<string> {
  return [report, details].flatMap((forecast) => [
    ...allTexts(presentCurrentWeather(forecast.current, forecast.utcOffsetSeconds, units)),
    ...allTexts(presentWeatherHero(forecast.current, forecast.utcOffsetSeconds, forecast.daily[0], units)),
    ...forecast.hourly.flatMap((hour) => [
      ...allTexts(presentHourlyForecast(hour, forecast.utcOffsetSeconds, units)),
      ...allTexts(presentForecastHourItem(hour, forecast.utcOffsetSeconds, forecast.daily, NOW, units)),
    ]),
    ...forecast.daily.flatMap((day, index) => [
      ...allTexts(presentDailyForecast(day, forecast.utcOffsetSeconds, index === 0, units)),
      ...allTexts(presentForecastDayRow(day, forecast.utcOffsetSeconds, index === 0, units)),
      ...allTexts(presentDayDetail(day, forecast.utcOffsetSeconds, units)),
      ...allTexts(presentDayConditions(day, units)),
    ]),
  ]);
}

describe('units applied consistently', () => {
  it('with °F and km/h, no text on any screen shows °C or m/s', () => {
    const texts = everyScreenText(IMPERIAL);

    expect(texts.length).toBeGreaterThan(1000);
    expect(texts.filter((text) => text.includes('°C') || text.includes('m/s'))).toEqual([]);
    expect(texts.some((text) => text.includes('°F'))).toBe(true);
    expect(texts.some((text) => text.includes('km/h'))).toBe(true);
  });

  it('with °C and m/s, no text on any screen shows °F or km/h', () => {
    const texts = everyScreenText(METRIC_UNITS);
    expect(texts.filter((text) => text.includes('°F') || text.includes('km/h'))).toEqual([]);
  });
});
