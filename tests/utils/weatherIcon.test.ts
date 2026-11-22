import fixture from '../fixtures/openMeteoForecast.json';
import type { DailyForecast } from '../../src/models/Weather';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import { isDaytimeAt, UNKNOWN_WEATHER_ICON, weatherIconName } from '../../src/utils/weatherIcon';

/**
 * Tests for choosing weather icons (SPEC D-34). Day and night come from the
 * real sunrise and sunset in the saved forecast: on 20 Nov 2026 in Stockholm
 * the sun rose at 07:53 and set at 15:12 local time.
 */

const HOUR_MS = 60 * 60 * 1000;
const report = parseWeatherResponse(fixture);

describe('weatherIconName', () => {
  it.each([
    [0, 'weather-sunny', 'weather-night'],
    [1, 'weather-partly-cloudy', 'weather-night-partly-cloudy'],
    [2, 'weather-partly-cloudy', 'weather-night-partly-cloudy'],
    [3, 'weather-cloudy', 'weather-cloudy'],
    [45, 'weather-fog', 'weather-fog'],
    [48, 'weather-fog', 'weather-fog'],
    [51, 'weather-rainy', 'weather-rainy'],
    [53, 'weather-rainy', 'weather-rainy'],
    [55, 'weather-rainy', 'weather-rainy'],
    [56, 'weather-snowy-rainy', 'weather-snowy-rainy'],
    [57, 'weather-snowy-rainy', 'weather-snowy-rainy'],
    [61, 'weather-rainy', 'weather-rainy'],
    [63, 'weather-rainy', 'weather-rainy'],
    [65, 'weather-pouring', 'weather-pouring'],
    [66, 'weather-snowy-rainy', 'weather-snowy-rainy'],
    [67, 'weather-snowy-rainy', 'weather-snowy-rainy'],
    [71, 'weather-snowy', 'weather-snowy'],
    [73, 'weather-snowy', 'weather-snowy'],
    [75, 'weather-snowy-heavy', 'weather-snowy-heavy'],
    [77, 'weather-snowy', 'weather-snowy'],
    [80, 'weather-partly-rainy', 'weather-rainy'],
    [81, 'weather-partly-rainy', 'weather-rainy'],
    [82, 'weather-pouring', 'weather-pouring'],
    [85, 'weather-partly-snowy', 'weather-snowy'],
    [86, 'weather-snowy-heavy', 'weather-snowy-heavy'],
    [95, 'weather-lightning-rainy', 'weather-lightning-rainy'],
    [96, 'weather-hail', 'weather-hail'],
    [97, 'weather-lightning-rainy', 'weather-lightning-rainy'],
    [99, 'weather-hail', 'weather-hail'],
  ])('code %i → %s by day, %s by night', (code, dayIcon, nightIcon) => {
    expect(weatherIconName(code, true)).toBe(dayIcon);
    expect(weatherIconName(code, false)).toBe(nightIcon);
  });

  it.each([4, 50, 98, 100, -1, 2.5])('uses the "unknown" icon for the unlisted code %p', (code) => {
    expect(weatherIconName(code, true)).toBe(UNKNOWN_WEATHER_ICON);
  });

  it('has an icon for every code in the saved real forecast', () => {
    const codes = [...fixture.hourly.weather_code, ...fixture.daily.weather_code, fixture.current.weather_code];
    for (const code of codes) {
      expect(weatherIconName(code, true)).not.toBe(UNKNOWN_WEATHER_ICON);
    }
  });
});

describe('isDaytimeAt', () => {
  const day0 = report.daily[0];
  const hourAt = (localHour: number) => day0.dateEpochMs + localHour * HOUR_MS;

  it('treats hours between the real sunrise (07:53) and sunset (15:12) as daylight', () => {
    expect(isDaytimeAt(hourAt(8), report.daily)).toBe(true); // 08:00 – 09:00
    expect(isDaytimeAt(hourAt(14), report.daily)).toBe(true); // 14:00 – 15:00
  });

  it('treats hours before sunrise and after sunset as night, judged at the middle of the hour', () => {
    expect(isDaytimeAt(hourAt(7), report.daily)).toBe(false); // middle 07:30, before 07:53
    expect(isDaytimeAt(hourAt(15), report.daily)).toBe(false); // middle 15:30, after 15:12
    expect(isDaytimeAt(hourAt(2), report.daily)).toBe(false);
  });

  it('has no daylight on a polar-night day (sunrise = sunset = midnight, as the API sends it)', () => {
    const polarNight: DailyForecast = { ...day0, sunriseEpochMs: day0.dateEpochMs, sunsetEpochMs: day0.dateEpochMs };
    const hours = Array.from({ length: 24 }, (_, hour) => isDaytimeAt(hourAt(hour), [polarNight]));
    expect(hours.every((isDay) => !isDay)).toBe(true);
  });

  it('is daylight all day under the midnight sun (sunset at the next midnight)', () => {
    const midnightSun: DailyForecast = {
      ...day0,
      sunriseEpochMs: day0.dateEpochMs,
      sunsetEpochMs: day0.dateEpochMs + 24 * HOUR_MS,
    };
    const hours = Array.from({ length: 24 }, (_, hour) => isDaytimeAt(hourAt(hour), [midnightSun]));
    expect(hours.every((isDay) => isDay)).toBe(true);
  });

  it('falls back to day icons when sunrise or sunset is missing', () => {
    const noSun: DailyForecast = { ...day0, sunriseEpochMs: undefined, sunsetEpochMs: undefined };
    expect(isDaytimeAt(hourAt(2), [noSun])).toBe(true);
  });

  it('falls back to day icons when the hour is outside the forecast days', () => {
    expect(isDaytimeAt(day0.dateEpochMs - 5 * HOUR_MS, report.daily)).toBe(true);
    expect(isDaytimeAt(hourAt(2), [])).toBe(true);
  });
});
