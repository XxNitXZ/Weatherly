import type { Location } from '../../src/models/Location';
import {
  formatCoordinates,
  formatLocationDetails,
  isSameLocation,
} from '../../src/utils/locationFormatting';

/**
 * Tests for the location display helpers (W-01, W-03). The two Lund
 * locations are real Open-Meteo Geocoding results (`language=sv`, 2026-11-22);
 * the other values are changed copies of them.
 */

const LUND_SWEDEN: Location = {
  name: 'Lund',
  region: 'Skåne län',
  country: 'Sverige',
  coordinates: { latitude: 55.70584, longitude: 13.19321 },
};

describe('formatLocationDetails', () => {
  it('joins region and country', () => {
    expect(formatLocationDetails(LUND_SWEDEN)).toBe('Skåne län, Sverige');
  });

  it('shows only the country when the region is missing', () => {
    expect(formatLocationDetails({ ...LUND_SWEDEN, region: undefined })).toBe('Sverige');
  });

  it('shows only the region when the country is missing', () => {
    expect(formatLocationDetails({ ...LUND_SWEDEN, country: undefined })).toBe('Skåne län');
  });

  it('shows a value only once when region and country are the same', () => {
    expect(formatLocationDetails({ ...LUND_SWEDEN, region: 'Singapore', country: 'Singapore' })).toBe(
      'Singapore',
    );
  });

  it('ignores empty strings', () => {
    expect(formatLocationDetails({ ...LUND_SWEDEN, region: '' })).toBe('Sverige');
  });

  it('returns undefined for a location entered as coordinates', () => {
    const typed: Location = { name: '59.33, 18.07', coordinates: { latitude: 59.33, longitude: 18.07 } };
    expect(formatLocationDetails(typed)).toBeUndefined();
  });
});

describe('formatCoordinates', () => {
  it.each([
    [{ latitude: 59.33, longitude: 18.07 }, '59.33° N, 18.07° E'],
    [{ latitude: -33.87, longitude: 151.21 }, '33.87° S, 151.21° E'],
    [{ latitude: 40.71427, longitude: -74.00597 }, '40.71° N, 74.01° W'],
    [{ latitude: 0, longitude: 0 }, '0.00° N, 0.00° E'],
    [{ latitude: -90, longitude: -180 }, '90.00° S, 180.00° W'],
  ])('%j → %j', (coordinates, expected) => {
    expect(formatCoordinates(coordinates)).toBe(expected);
  });
});

describe('isSameLocation', () => {
  it('is true for an equal copy', () => {
    expect(isSameLocation(LUND_SWEDEN, { ...LUND_SWEDEN })).toBe(true);
  });

  it('is false for a same-named place elsewhere', () => {
    const lundEngland: Location = {
      name: 'Lund',
      region: 'England',
      country: 'Storbritannien',
      coordinates: { latitude: 53.9192, longitude: -0.52211 },
    };
    expect(isSameLocation(LUND_SWEDEN, lundEngland)).toBe(false);
  });

  it('is false when only the name differs', () => {
    expect(isSameLocation(LUND_SWEDEN, { ...LUND_SWEDEN, name: 'Lunds kommun' })).toBe(false);
  });
});
