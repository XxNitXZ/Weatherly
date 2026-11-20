import { parseGeocodingResponse } from '../../src/parsers/geocodingParser';
import lundFixture from '../fixtures/openMeteoGeocodingLund.json';
import noResultsFixture from '../fixtures/openMeteoGeocodingNoResults.json';
import { REMOVE, copyWith, expectParseError } from '../helpers/jsonFixtures';

/**
 * Tests for `parseGeocodingResponse` (W-02, W-14, W-19; lab test area "JSON parsing").
 *
 * Fixtures are real Open-Meteo Geocoding responses saved on 2026-11-20 with
 * `language=sv`: "Lund" (10 results) and "xqzvbn" (no matches).
 */

/** A copy of the Lund fixture with one value replaced or removed. */
function lundWith(path: ReadonlyArray<string | number>, value: unknown): unknown {
  return copyWith(lundFixture, path, value);
}

/** Asserts that parsing `json` throws AppError('parse') naming `expectedPath`. */
function expectGeocodingParseError(json: unknown, expectedPath: string): void {
  expectParseError(() => parseGeocodingResponse(json), expectedPath);
}

describe('parseGeocodingResponse', () => {
  describe('valid response', () => {
    it('returns one location per result', () => {
      const locations = parseGeocodingResponse(lundFixture);

      expect(locations).toHaveLength(10);
    });

    it('maps name, region, country and coordinates', () => {
      const locations = parseGeocodingResponse(lundFixture);

      expect(locations[0]).toEqual({
        name: 'Lund',
        region: 'Skåne län',
        country: 'Sverige',
        coordinates: { latitude: 55.70584, longitude: 13.19321 },
      });
    });

    it('keeps same-named places apart by region and country', () => {
      const locations = parseGeocodingResponse(lundFixture);

      expect(locations[1]).toEqual({
        name: 'Lund',
        region: 'England',
        country: 'Storbritannien',
        coordinates: { latitude: 53.9192, longitude: -0.52211 },
      });
    });

    it('returns an empty list when nothing matched (no results key)', () => {
      expect(parseGeocodingResponse(noResultsFixture)).toEqual([]);
    });
  });

  describe('optional fields', () => {
    it('turns a missing country into undefined', () => {
      const locations = parseGeocodingResponse(lundWith(['results', 0, 'country'], REMOVE));

      expect(locations[0].country).toBeUndefined();
      expect(locations[0].name).toBe('Lund');
    });

    it('turns a missing region (admin1) into undefined', () => {
      const locations = parseGeocodingResponse(lundWith(['results', 0, 'admin1'], REMOVE));

      expect(locations[0].region).toBeUndefined();
    });
  });

  describe('missing or invalid required fields', () => {
    it.each(['name', 'latitude', 'longitude'])(
      'throws a parse error when %s is missing',
      (field) => {
        expectGeocodingParseError(
          lundWith(['results', 3, field], REMOVE),
          `results[3].${field}`,
        );
      },
    );

    it('throws a parse error when a latitude is a string', () => {
      expectGeocodingParseError(
        lundWith(['results', 0, 'latitude'], '55.7'),
        'results[0].latitude',
      );
    });

    it('throws a parse error when a country is not a string', () => {
      expectGeocodingParseError(lundWith(['results', 0, 'country'], 46), 'results[0].country');
    });

    it('throws a parse error when results is not an array', () => {
      expectGeocodingParseError(lundWith(['results'], { name: 'Lund' }), 'results');
    });

    it('throws a parse error when a result is not an object', () => {
      expectGeocodingParseError(lundWith(['results', 2], 'Lund'), 'results[2]');
    });

    it('throws a parse error when the response is not an object', () => {
      expectGeocodingParseError(null, 'response');
      expectGeocodingParseError([], 'response');
    });
  });
});
