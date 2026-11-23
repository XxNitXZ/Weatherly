import fixture from '../fixtures/openMeteoForecast.json';
import type { Location } from '../../src/models/Location';
import type { RootStackParamList } from '../../src/navigation/routes';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';

/**
 * Tests for the `DayDetail` route params (W-07; SPEC D-36).
 *
 * D-36 passes the tapped day in the params because it is a plain value.
 * React Navigation expects serialisable params, so they must survive a JSON
 * round trip unchanged: no `Date`, function or class instance. The params
 * are built from the real saved forecast, exactly as `HomeScreen` builds them.
 */

const STOCKHOLM: Location = {
  name: 'Stockholm',
  region: 'Stockholm',
  country: 'Sverige',
  coordinates: { latitude: 59.33, longitude: 18.07 },
};

function dayDetailParamsFromFixture(dayIndex: number): RootStackParamList['DayDetail'] {
  const report = parseWeatherResponse(fixture);
  return { location: STOCKHOLM, day: report.daily[dayIndex], utcOffsetSeconds: report.utcOffsetSeconds };
}

function jsonRoundTrip<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe('DayDetail route params', () => {
  it.each([0, 3, 6])('survive a JSON round trip unchanged for day %i of the real forecast', (dayIndex) => {
    const params = dayDetailParamsFromFixture(dayIndex);
    expect(jsonRoundTrip(params)).toEqual(params);
  });

  it('carry the tapped day itself, not a copy from another day', () => {
    const report = parseWeatherResponse(fixture);
    const params = dayDetailParamsFromFixture(3);
    expect(params.day.dateEpochMs).toBe(report.daily[3].dateEpochMs);
    expect(params.day.dateEpochMs).not.toBe(report.daily[0].dateEpochMs);
  });

  it('keep a location without region and country (coordinate search) as it is', () => {
    const coordinatePlace: Location = { name: '59.33, 18.07', coordinates: { latitude: 59.33, longitude: 18.07 } };
    const params = { ...dayDetailParamsFromFixture(0), location: coordinatePlace };
    const roundTripped = jsonRoundTrip(params);
    expect(roundTripped).toEqual(params);
    expect(roundTripped).not.toHaveProperty('location.region');
    expect(roundTripped).not.toHaveProperty('location.country');
  });
});
