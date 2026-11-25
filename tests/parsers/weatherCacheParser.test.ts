import type { Location } from '../../src/models/Location';
import type { CachedWeatherReport } from '../../src/models/Weather';
import {
  WEATHER_CACHE_SCHEMA_VERSION,
  parseStoredWeatherCache,
  toStoredWeatherCache,
} from '../../src/parsers/weatherCacheParser';
import { parseWeatherResponse } from '../../src/parsers/weatherParser';
import fixture from '../fixtures/openMeteoForecast.json';
import longyearbyenFixture from '../fixtures/openMeteoForecastLongyearbyen.json';
import mcMurdoFixture from '../fixtures/openMeteoForecastMcMurdo.json';
import detailsFixture from '../fixtures/openMeteoForecastStockholmDetails.json';
import { REMOVE, copyWith, expectParseError } from '../helpers/jsonFixtures';

/**
 * Tests for the stored weather cache format (W-16; SPEC D-47). The reports
 * are built by `weatherParser` from real saved Open-Meteo responses, so the
 * round trip covers every field the app really receives. Each failure test
 * changes exactly one thing in a valid stored value (`copyWith`).
 */

const STOCKHOLM: Location = {
  name: 'Stockholm',
  region: 'Stockholms län',
  country: 'Sverige',
  coordinates: { latitude: 59.32938, longitude: 18.06871 },
};

const TYPED_PLACE: Location = {
  name: '78.2232, 15.6267',
  coordinates: { latitude: 78.2232, longitude: 15.6267 },
};

const FETCHED_AT_EPOCH_MS = 1_795_170_000_000;

function cachedFrom(json: unknown, location: Location): CachedWeatherReport {
  return { location, report: parseWeatherResponse(json), fetchedAtEpochMs: FETCHED_AT_EPOCH_MS };
}

/** What the device storage gives back: the stored value after JSON text. */
function throughStorage(cached: CachedWeatherReport): unknown {
  return JSON.parse(JSON.stringify(toStoredWeatherCache(cached))) as unknown;
}

const STOCKHOLM_DETAILS = cachedFrom(detailsFixture, STOCKHOLM);
const VALID_STORED = throughStorage(STOCKHOLM_DETAILS);

describe('round trip: store, then read', () => {
  it.each([
    ['Stockholm', fixture, STOCKHOLM],
    ['Stockholm with the day-detail fields', detailsFixture, STOCKHOLM],
    ['Longyearbyen (polar night)', longyearbyenFixture, TYPED_PLACE],
    ['McMurdo (midnight sun)', mcMurdoFixture, TYPED_PLACE],
  ])('gives back exactly the cached report for %s', (_name, json, location) => {
    const cached = cachedFrom(json, location);

    expect(parseStoredWeatherCache(throughStorage(cached))).toEqual(cached);
  });

  it('keeps the place and the fetch time', () => {
    const read = parseStoredWeatherCache(VALID_STORED);

    expect(read.location).toEqual(STOCKHOLM);
    expect(read.fetchedAtEpochMs).toBe(FETCHED_AT_EPOCH_MS);
  });
});

describe('toStoredWeatherCache', () => {
  it('writes the current schema version', () => {
    expect(toStoredWeatherCache(STOCKHOLM_DETAILS).version).toBe(WEATHER_CACHE_SCHEMA_VERSION);
  });

  it('leaves out optional fields that are not set, and never writes null', () => {
    const report = STOCKHOLM_DETAILS.report;
    const cached: CachedWeatherReport = {
      ...STOCKHOLM_DETAILS,
      report: {
        ...report,
        current: { ...report.current, windSpeedMs: undefined },
      },
    };

    const text = JSON.stringify(toStoredWeatherCache(cached));
    const stored = JSON.parse(text) as { report: { current: Record<string, unknown> } };

    expect('windSpeedMs' in stored.report.current).toBe(false);
    expect(text).not.toContain('null');
  });

  it('stores only the fields of the model', () => {
    const report = STOCKHOLM_DETAILS.report;
    const withExtra = {
      ...STOCKHOLM_DETAILS,
      report: { ...report, current: { ...report.current, debugNote: 'not part of the model' } },
    };

    expect(JSON.stringify(toStoredWeatherCache(withExtra))).not.toContain('debugNote');
  });
});

describe('parseStoredWeatherCache: rejected values', () => {
  it('rejects a value that is not an object', () => {
    expectParseError(() => parseStoredWeatherCache('cache'), 'weather cache');
  });

  it('rejects a missing version', () => {
    expectParseError(() => parseStoredWeatherCache(copyWith(VALID_STORED, ['version'], REMOVE)), 'version');
  });

  it('rejects another schema version', () => {
    expectParseError(() => parseStoredWeatherCache(copyWith(VALID_STORED, ['version'], 2)), 'version');
  });

  it('rejects a missing place', () => {
    expectParseError(() => parseStoredWeatherCache(copyWith(VALID_STORED, ['location'], REMOVE)), 'location');
  });

  it('rejects a place with a latitude out of range', () => {
    const stored = copyWith(VALID_STORED, ['location', 'coordinates', 'latitude'], 91);
    expectParseError(() => parseStoredWeatherCache(stored), 'location.coordinates.latitude');
  });

  it('rejects a fetch time that is not a number', () => {
    const stored = copyWith(VALID_STORED, ['fetchedAtEpochMs'], '2026-11-25');
    expectParseError(() => parseStoredWeatherCache(stored), 'fetchedAtEpochMs');
  });

  it('rejects a missing report', () => {
    expectParseError(() => parseStoredWeatherCache(copyWith(VALID_STORED, ['report'], REMOVE)), 'report');
  });

  it('rejects a missing timezone', () => {
    const stored = copyWith(VALID_STORED, ['report', 'timezone'], REMOVE);
    expectParseError(() => parseStoredWeatherCache(stored), 'report.timezone');
  });

  it('rejects a current temperature that is not a number', () => {
    const stored = copyWith(VALID_STORED, ['report', 'current', 'temperatureCelsius'], '4');
    expectParseError(() => parseStoredWeatherCache(stored), 'report.current.temperatureCelsius');
  });

  it('rejects isDay that is not a boolean', () => {
    const stored = copyWith(VALID_STORED, ['report', 'current', 'isDay'], 1);
    expectParseError(() => parseStoredWeatherCache(stored), 'report.current.isDay');
  });

  it('rejects hourly data that is not an array', () => {
    const stored = copyWith(VALID_STORED, ['report', 'hourly'], {});
    expectParseError(() => parseStoredWeatherCache(stored), 'report.hourly');
  });

  it('rejects an hour without a time', () => {
    const stored = copyWith(VALID_STORED, ['report', 'hourly', 5, 'timeEpochMs'], REMOVE);
    expectParseError(() => parseStoredWeatherCache(stored), 'report.hourly[5].timeEpochMs');
  });

  it('rejects a day without a maximum temperature', () => {
    const stored = copyWith(VALID_STORED, ['report', 'daily', 3, 'temperatureMaxCelsius'], REMOVE);
    expectParseError(() => parseStoredWeatherCache(stored), 'report.daily[3].temperatureMaxCelsius');
  });

  it('rejects an optional field stored as null', () => {
    const stored = copyWith(VALID_STORED, ['report', 'daily', 0, 'uvIndexMax'], null);
    expectParseError(() => parseStoredWeatherCache(stored), 'report.daily[0].uvIndexMax');
  });

  it('rejects text that is not a finite number in an optional field', () => {
    const stored = copyWith(VALID_STORED, ['report', 'hourly', 0, 'windSpeedMs'], 'calm');
    expectParseError(() => parseStoredWeatherCache(stored), 'report.hourly[0].windSpeedMs');
  });
});

describe('parseStoredWeatherCache: accepted values', () => {
  it('reads a missing optional field as not set', () => {
    const stored = copyWith(VALID_STORED, ['report', 'daily', 0, 'uvIndexMax'], REMOVE);

    expect(parseStoredWeatherCache(stored).report.daily[0].uvIndexMax).toBeUndefined();
  });

  it('ignores unknown extra fields', () => {
    const stored = copyWith(VALID_STORED, ['report', 'current', 'futureField'], 'ignored');

    expect(parseStoredWeatherCache(stored)).toEqual(STOCKHOLM_DETAILS);
  });
});
