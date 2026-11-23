import { AppError } from '../../src/models/AppError';
import type { Location } from '../../src/models/Location';
import {
  FAVORITES_SCHEMA_VERSION,
  parseStoredFavorites,
  toStoredFavorites,
} from '../../src/parsers/favoritesParser';
import { REMOVE, copyWith, expectParseError } from '../helpers/jsonFixtures';

/**
 * Tests for the stored favorites format (W-08, SPEC D-38). Each failure test
 * changes exactly one thing in a valid stored value (`copyWith`). Lund is a
 * real Open-Meteo Geocoding result; the coordinate entry is named the way
 * `useCoordinateSearchViewModel` names it.
 */

const LUND: Location = {
  name: 'Lund',
  region: 'Skåne län',
  country: 'Sverige',
  coordinates: { latitude: 55.70584, longitude: 13.19321 },
};

const TYPED_PLACE: Location = {
  name: '-33.8688, 151.2093',
  coordinates: { latitude: -33.8688, longitude: 151.2093 },
};

/** A valid stored value, as written by this app: Lund newest, then a typed place. */
const VALID_STORED = {
  version: 1,
  favorites: [
    {
      name: 'Lund',
      region: 'Skåne län',
      country: 'Sverige',
      coordinates: { latitude: 55.70584, longitude: 13.19321 },
    },
    { name: '-33.8688, 151.2093', coordinates: { latitude: -33.8688, longitude: 151.2093 } },
  ],
};

describe('parseStoredFavorites', () => {
  it('reads valid versioned favorites in their stored order', () => {
    const favorites = parseStoredFavorites(VALID_STORED);

    expect(favorites).toEqual([LUND, TYPED_PLACE]);
  });

  it('reads an empty list', () => {
    expect(parseStoredFavorites({ version: 1, favorites: [] })).toEqual([]);
  });

  it('leaves missing region and country undefined', () => {
    const [, typedPlace] = parseStoredFavorites(VALID_STORED);

    expect(typedPlace.region).toBeUndefined();
    expect(typedPlace.country).toBeUndefined();
  });

  it('accepts a region without a country and the other way round', () => {
    const regionOnly = copyWith(VALID_STORED, ['favorites', 0, 'country'], REMOVE);
    const countryOnly = copyWith(VALID_STORED, ['favorites', 0, 'region'], REMOVE);

    expect(parseStoredFavorites(regionOnly)[0]).toEqual({ ...LUND, country: undefined });
    expect(parseStoredFavorites(countryOnly)[0]).toEqual({ ...LUND, region: undefined });
  });

  it('accepts the coordinate bounds themselves', () => {
    const corner = copyWith(VALID_STORED, ['favorites', 1, 'coordinates'], {
      latitude: -90,
      longitude: 180,
    });

    expect(parseStoredFavorites(corner)[1].coordinates).toEqual({ latitude: -90, longitude: 180 });
  });

  it('ignores unknown extra fields in an entry', () => {
    const extra = copyWith(VALID_STORED, ['favorites', 0, 'population'], 87244);

    expect(parseStoredFavorites(extra)[0]).toEqual(LUND);
  });

  describe('rejects a wrong top-level structure', () => {
    it.each([
      ['null', null],
      ['an array', [VALID_STORED]],
      ['a string', 'Lund'],
      ['a number', 1],
    ])('%s', (_label, value) => {
      expectParseError(() => parseStoredFavorites(value), 'favorites storage');
    });

    it('a missing favorites list', () => {
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites'], REMOVE)),
        'favorites',
      );
    });

    it('a favorites value that is not an array', () => {
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites'], { 0: VALID_STORED.favorites[0] })),
        'favorites',
      );
    });

    it('an entry that is not an object', () => {
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites', 1], 'Sydney')),
        'favorites[1]',
      );
    });
  });

  describe('rejects unsupported versions', () => {
    it('a missing version (data not written by this format)', () => {
      expectParseError(() => parseStoredFavorites(copyWith(VALID_STORED, ['version'], REMOVE)), 'version');
    });

    it.each([
      ['a newer version', 2],
      ['version 0', 0],
      ['a fractional version', 1.5],
    ])('%s', (_label, version) => {
      expectParseError(() => parseStoredFavorites(copyWith(VALID_STORED, ['version'], version)), 'version');
    });

    it('a version given as text', () => {
      expectParseError(() => parseStoredFavorites(copyWith(VALID_STORED, ['version'], '1')), 'version');
    });

    it('names the unsupported version in the message', () => {
      let caught: unknown;
      try {
        parseStoredFavorites(copyWith(VALID_STORED, ['version'], 2));
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(AppError);
      expect(caught instanceof AppError && caught.message).toContain('unsupported favorites schema version 2');
    });
  });

  describe('rejects missing required Location fields', () => {
    it.each([
      ['name', ['favorites', 0, 'name'], 'favorites[0].name'],
      ['coordinates', ['favorites', 0, 'coordinates'], 'favorites[0].coordinates'],
      ['latitude', ['favorites', 1, 'coordinates', 'latitude'], 'favorites[1].coordinates.latitude'],
      ['longitude', ['favorites', 1, 'coordinates', 'longitude'], 'favorites[1].coordinates.longitude'],
    ] as const)('%s', (_label, path, expectedPath) => {
      expectParseError(() => parseStoredFavorites(copyWith(VALID_STORED, path, REMOVE)), expectedPath);
    });

    it('an empty or blank name', () => {
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites', 0, 'name'], '')),
        'favorites[0].name',
      );
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites', 0, 'name'], '   ')),
        'favorites[0].name',
      );
    });

    it('a name that is not a string', () => {
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites', 0, 'name'], 42)),
        'favorites[0].name',
      );
    });
  });

  describe('rejects optional fields that are present but invalid', () => {
    it.each([
      ['a numeric region', 'region', 12],
      ['a null region', 'region', null],
      ['a country object', 'country', { name: 'Sverige' }],
      ['a null country', 'country', null],
    ])('%s', (_label, field, value) => {
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites', 0, field], value)),
        `favorites[0].${field}`,
      );
    });
  });

  describe('rejects invalid coordinate types', () => {
    it.each([
      ['a string latitude', 'latitude', '55.70584'],
      ['a null latitude', 'latitude', null],
      ['a boolean longitude', 'longitude', true],
      ['an array longitude', 'longitude', [13.19321]],
    ])('%s', (_label, field, value) => {
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites', 0, 'coordinates', field], value)),
        `favorites[0].coordinates.${field}`,
      );
    });

    it('coordinates that are not an object', () => {
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites', 0, 'coordinates'], [55.7, 13.2])),
        'favorites[0].coordinates',
      );
    });

    it.each([
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['-Infinity', Number.NEGATIVE_INFINITY],
    ])('a non-finite latitude (%s)', (_label, value) => {
      // JSON text cannot hold these (JSON.stringify writes null), but the
      // parser must not rely on that. copyWith sets the value after copying.
      const stored = copyWith(VALID_STORED, ['favorites', 0, 'coordinates', 'latitude'], value);

      expectParseError(() => parseStoredFavorites(stored), 'favorites[0].coordinates.latitude');
    });
  });

  describe('rejects coordinates out of range', () => {
    it.each([
      ['latitude above 90', 'latitude', 90.0001],
      ['latitude below -90', 'latitude', -90.0001],
      ['longitude above 180', 'longitude', 180.0001],
      ['longitude below -180', 'longitude', -180.0001],
    ])('%s', (_label, field, value) => {
      expectParseError(
        () => parseStoredFavorites(copyWith(VALID_STORED, ['favorites', 1, 'coordinates', field], value)),
        `favorites[1].coordinates.${field}`,
      );
    });
  });

  it('does not remove duplicates (the repository does)', () => {
    const duplicated = { version: 1, favorites: [VALID_STORED.favorites[0], VALID_STORED.favorites[0]] };

    expect(parseStoredFavorites(duplicated)).toHaveLength(2);
  });
});

describe('toStoredFavorites', () => {
  it('writes the current schema version', () => {
    expect(FAVORITES_SCHEMA_VERSION).toBe(1);
    expect(toStoredFavorites([]).version).toBe(1);
  });

  it('writes exactly the documented format', () => {
    expect(JSON.parse(JSON.stringify(toStoredFavorites([LUND, TYPED_PLACE])))).toEqual(VALID_STORED);
  });

  it('leaves out region and country when the place has none, and never writes null', () => {
    const text = JSON.stringify(toStoredFavorites([TYPED_PLACE]));

    expect(text).not.toContain('region');
    expect(text).not.toContain('country');
    expect(text).not.toContain('null');
  });

  it('writes only the fields of Location', () => {
    const withExtra = { ...LUND, population: 87244 } as Location;

    expect(Object.keys(toStoredFavorites([withExtra]).favorites[0]).sort()).toEqual([
      'coordinates',
      'country',
      'name',
      'region',
    ]);
  });

  it('round-trips through JSON text unchanged', () => {
    const favorites = [LUND, TYPED_PLACE];

    const restored = parseStoredFavorites(JSON.parse(JSON.stringify(toStoredFavorites(favorites))));

    expect(restored).toEqual(favorites);
  });
});
