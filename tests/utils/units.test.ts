import { DEFAULT_SETTINGS } from '../../src/models/AppSettings';
import {
  celsiusToFahrenheit,
  convertTemperature,
  convertWindSpeed,
  displayUnitsOf,
  METRIC_UNITS,
  metresPerSecondToKilometresPerHour,
} from '../../src/utils/units';

/** Tests for the unit conversions (W-12; SPEC D-46). Values are not rounded here. */

describe('celsiusToFahrenheit', () => {
  it.each([
    [0, 32],
    [100, 212],
    [-40, -40],
    [37, 98.6],
    [-17.5, 0.5],
  ])('%p °C is %p °F', (celsius, fahrenheit) => {
    expect(celsiusToFahrenheit(celsius)).toBeCloseTo(fahrenheit, 10);
  });
});

describe('metresPerSecondToKilometresPerHour', () => {
  it.each([
    [0, 0],
    [1, 3.6],
    [10, 36],
    [5.6, 20.16],
  ])('%p m/s is %p km/h', (metresPerSecond, kilometresPerHour) => {
    expect(metresPerSecondToKilometresPerHour(metresPerSecond)).toBeCloseTo(kilometresPerHour, 10);
  });
});

describe('convertTemperature and convertWindSpeed', () => {
  it('leave values in the API units unchanged', () => {
    expect(convertTemperature(1.2, 'celsius')).toBe(1.2);
    expect(convertWindSpeed(3.1, 'metresPerSecond')).toBe(3.1);
  });

  it('convert to the chosen unit without rounding', () => {
    expect(convertTemperature(0.4, 'fahrenheit')).toBeCloseTo(32.72, 10);
    expect(convertWindSpeed(3.1, 'kilometresPerHour')).toBeCloseTo(11.16, 10);
  });
});

describe('displayUnitsOf', () => {
  it('takes the units from the settings', () => {
    expect(displayUnitsOf(DEFAULT_SETTINGS)).toEqual(METRIC_UNITS);
    expect(
      displayUnitsOf({ ...DEFAULT_SETTINGS, temperatureUnit: 'fahrenheit', windSpeedUnit: 'kilometresPerHour' }),
    ).toEqual({ temperature: 'fahrenheit', windSpeed: 'kilometresPerHour' });
  });
});
