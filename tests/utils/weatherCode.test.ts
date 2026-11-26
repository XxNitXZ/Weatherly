import fixture from '../fixtures/openMeteoForecast.json';
import { describeWeatherCode, UNKNOWN_WEATHER_DESCRIPTION } from '../../src/utils/weatherCode';

/**
 * Tests for the WMO weather code descriptions (W-04). The expected texts are
 * the Open-Meteo documentation table (checked 2026-11-22).
 */

describe('describeWeatherCode', () => {
  it.each([
    [0, 'Clear sky'],
    [1, 'Mainly clear'],
    [2, 'Partly cloudy'],
    [3, 'Overcast'],
    [45, 'Fog'],
    [48, 'Depositing rime fog'],
    [51, 'Light drizzle'],
    [53, 'Moderate drizzle'],
    [55, 'Dense drizzle'],
    [56, 'Light freezing drizzle'],
    [57, 'Dense freezing drizzle'],
    [61, 'Slight rain'],
    [63, 'Moderate rain'],
    [65, 'Heavy rain'],
    [66, 'Light freezing rain'],
    [67, 'Heavy freezing rain'],
    [71, 'Slight snowfall'],
    [73, 'Moderate snowfall'],
    [75, 'Heavy snowfall'],
    [77, 'Snow grains'],
    [80, 'Slight rain showers'],
    [81, 'Moderate rain showers'],
    [82, 'Violent rain showers'],
    [85, 'Slight snow showers'],
    [86, 'Heavy snow showers'],
    [95, 'Thunderstorm'],
    [96, 'Thunderstorm with slight hail'],
    [97, 'Heavy thunderstorm'],
    [99, 'Thunderstorm with heavy hail'],
  ])('%i → %j', (code, expected) => {
    expect(describeWeatherCode(code)).toBe(expected);
  });

  it.each([4, 50, 98, 100, -1, 2.5])('returns the fallback for the unknown code %p', (code) => {
    expect(describeWeatherCode(code)).toBe(UNKNOWN_WEATHER_DESCRIPTION);
  });

  it('knows every code in the saved real forecast', () => {
    const codes = [...fixture.hourly.weather_code, ...fixture.daily.weather_code, fixture.current.weather_code];
    for (const code of codes) {
      expect(describeWeatherCode(code)).not.toBe(UNKNOWN_WEATHER_DESCRIPTION);
    }
  });
});
