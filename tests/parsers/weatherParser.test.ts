import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import fixture from '../fixtures/openMeteoForecast.json';
import { REMOVE, copyWith, expectParseError } from '../helpers/jsonFixtures';

/**
 * Tests for `parseWeatherResponse` (W-14, W-15, W-19; lab test area "JSON parsing").
 *
 * The fixture is a real Open-Meteo response for Stockholm (59.33, 18.07),
 * saved on 2026-11-20 with the request parameters `weatherService` will use.
 * Each failure test copies it and changes exactly one thing.
 */

/** A copy of the fixture with one value replaced or removed. */
function fixtureWith(path: ReadonlyArray<string | number>, value: unknown): unknown {
  return copyWith(fixture, path, value);
}

/** Asserts that parsing `json` throws AppError('parse') naming `expectedPath`. */
function expectWeatherParseError(json: unknown, expectedPath: string): void {
  expectParseError(() => parseWeatherResponse(json), expectedPath);
}

describe('parseWeatherResponse', () => {
  describe('valid response', () => {
    it('reads the timezone and UTC offset', () => {
      const report = parseWeatherResponse(fixture);

      expect(report.timezone).toBe('Europe/Stockholm');
      expect(report.utcOffsetSeconds).toBe(3600);
    });

    it('parses current conditions and converts seconds to milliseconds', () => {
      const report = parseWeatherResponse(fixture);

      expect(report.current).toEqual({
        timeEpochMs: 1795169700000,
        temperatureCelsius: 1.2,
        weatherCode: 3,
        isDay: true,
        apparentTemperatureCelsius: -2.6,
        relativeHumidityPercent: 89,
        windSpeedMs: 3.1,
      });
    });

    it('turns the hourly arrays into one entry per hour', () => {
      const report = parseWeatherResponse(fixture);

      expect(report.hourly).toHaveLength(168);
      expect(report.hourly[0]).toEqual({
        timeEpochMs: 1795129200000,
        temperatureCelsius: 0.7,
        weatherCode: 51,
        precipitationProbabilityPercent: 61,
        windSpeedMs: 2.7,
      });
    });

    it('turns the daily arrays into one entry per day', () => {
      const report = parseWeatherResponse(fixture);

      expect(report.daily).toHaveLength(7);
      expect(report.daily[0]).toEqual({
        dateEpochMs: 1795129200000,
        weatherCode: 51,
        temperatureMaxCelsius: 1.8,
        temperatureMinCelsius: 0.4,
        precipitationSumMm: 1.4,
        precipitationProbabilityMaxPercent: 69,
        windSpeedMaxMs: 5.6,
        sunriseEpochMs: 1795157589000,
        sunsetEpochMs: 1795183969000,
      });
    });

    it('maps is_day 0 to false', () => {
      const report = parseWeatherResponse(fixtureWith(['current', 'is_day'], 0));

      expect(report.current.isDay).toBe(false);
    });
  });

  describe('missing required fields', () => {
    it('throws a parse error when the current temperature is missing', () => {
      expectWeatherParseError(fixtureWith(['current', 'temperature_2m'], REMOVE), 'current.temperature_2m');
    });

    it('throws a parse error when the daily weather codes are missing', () => {
      expectWeatherParseError(fixtureWith(['daily', 'weather_code'], REMOVE), 'daily.weather_code');
    });

    it('throws a parse error when the hourly block is missing', () => {
      expectWeatherParseError(fixtureWith(['hourly'], REMOVE), 'hourly');
    });

    it('throws a parse error when the timezone is missing', () => {
      expectWeatherParseError(fixtureWith(['timezone'], REMOVE), 'timezone');
    });
  });

  describe('invalid data', () => {
    it('throws a parse error when a temperature is a string', () => {
      expectWeatherParseError(
        fixtureWith(['hourly', 'temperature_2m', 5], '0.7'),
        'hourly.temperature_2m[5]',
      );
    });

    it('throws a parse error when a required value is null', () => {
      expectWeatherParseError(
        fixtureWith(['hourly', 'temperature_2m', 0], null),
        'hourly.temperature_2m[0]',
      );
    });

    it('throws a parse error when an array is shorter than its time array', () => {
      const json = fixtureWith(['daily', 'weather_code'], fixture.daily.weather_code.slice(0, 6));

      expectWeatherParseError(json, 'daily.weather_code');
    });

    it('throws a parse error when an optional array has the wrong length', () => {
      const json = fixtureWith(['daily', 'sunrise'], fixture.daily.sunrise.slice(0, 3));

      expectWeatherParseError(json, 'daily.sunrise');
    });

    it('throws a parse error when the response is not an object', () => {
      expectWeatherParseError(null, 'response');
      expectWeatherParseError([], 'response');
      expectWeatherParseError('not json', 'response');
    });
  });

  describe('optional fields', () => {
    it('turns a null optional value into undefined', () => {
      const report = parseWeatherResponse(fixtureWith(['daily', 'sunrise', 0], null));

      expect(report.daily[0].sunriseEpochMs).toBeUndefined();
      expect(report.daily[1].sunriseEpochMs).toBe(1795244127000);
    });

    it('turns a missing optional array into undefined for every entry', () => {
      const report = parseWeatherResponse(
        fixtureWith(['hourly', 'precipitation_probability'], REMOVE),
      );

      expect(report.hourly).toHaveLength(168);
      expect(report.hourly.every((hour) => hour.precipitationProbabilityPercent === undefined)).toBe(
        true,
      );
    });

    it('turns a missing optional current value into undefined', () => {
      const report = parseWeatherResponse(fixtureWith(['current', 'wind_speed_10m'], REMOVE));

      expect(report.current.windSpeedMs).toBeUndefined();
      expect(report.current.temperatureCelsius).toBe(1.2);
    });
  });
});
