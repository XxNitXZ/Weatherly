import lundFixture from '../fixtures/openMeteoGeocodingLund.json';
import type { Location } from '../../src/models/Location';
import { parseGeocodingResponse } from '../../src/parsers/geocodingParser';
import {
  FAVORITE_COORDINATE_TOLERANCE,
  addFavorite,
  containsFavorite,
  isSameFavoritePlace,
  normalizeFavorites,
  removeFavorite,
  toggleFavorite,
} from '../../src/utils/favorites';

/**
 * Tests for the favorite identity rule and list rules (W-08, SPEC D-37).
 * The two Lund places come from a real Open-Meteo Geocoding response
 * (`tests/fixtures/openMeteoGeocodingLund.json`): Lund in Skåne, Sweden and
 * Lund in East Riding of Yorkshire, England. The other places are copies of
 * them with changed names or coordinates.
 */

const [LUND_SWEDEN, LUND_ENGLAND] = parseGeocodingResponse(lundFixture);

/** A place entered as coordinates, named like `useCoordinateSearchViewModel` names it. */
function typed(latitude: number, longitude: number): Location {
  return { name: `${latitude}, ${longitude}`, coordinates: { latitude, longitude } };
}

const KIRUNA: Location = {
  name: 'Kiruna',
  region: 'Norrbottens län',
  country: 'Sverige',
  coordinates: { latitude: 67.85572, longitude: 20.22513 },
};

describe('fixture places', () => {
  it('are the two real, same-named places in Sweden and England', () => {
    expect(LUND_SWEDEN).toEqual({
      name: 'Lund',
      region: 'Skåne län',
      country: 'Sverige',
      coordinates: { latitude: 55.70584, longitude: 13.19321 },
    });
    expect(LUND_ENGLAND.name).toBe('Lund');
    expect(LUND_ENGLAND.country).toBe('Storbritannien');
  });
});

describe('isSameFavoritePlace', () => {
  it('uses a tolerance of 0.0001 degrees', () => {
    expect(FAVORITE_COORDINATE_TOLERANCE).toBe(0.0001);
  });

  it('is true for the same location', () => {
    expect(isSameFavoritePlace(LUND_SWEDEN, { ...LUND_SWEDEN })).toBe(true);
  });

  it('is false for different places with the same name', () => {
    expect(isSameFavoritePlace(LUND_SWEDEN, LUND_ENGLAND)).toBe(false);
  });

  it('is true for the same coordinates under a different name', () => {
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.70584, 13.19321))).toBe(true);
  });

  it('is true for a geocoded place and typed coordinates inside the tolerance', () => {
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.7058, 13.1932))).toBe(true);
  });

  it('is true at exactly the tolerance, in both directions and on both axes', () => {
    // As written these differ by exactly 0.0001; in binary some come out just
    // below and some just above it, so all must be treated the same.
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.70594, 13.19321))).toBe(true);
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.70574, 13.19321))).toBe(true);
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.70584, 13.19331))).toBe(true);
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.70584, 13.19311))).toBe(true);
    expect(isSameFavoritePlace(typed(89.9999, 179.9999), typed(90, 180))).toBe(true);
  });

  it('is false just outside the tolerance in latitude', () => {
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.705941, 13.19321))).toBe(false);
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.705739, 13.19321))).toBe(false);
  });

  it('is false just outside the tolerance in longitude', () => {
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.70584, 13.193311))).toBe(false);
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.70584, 13.193109))).toBe(false);
  });

  it('checks the latitude even when the longitude is equal, and the other way round', () => {
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.8, 13.19321))).toBe(false);
    expect(isSameFavoritePlace(LUND_SWEDEN, typed(55.70584, 13.3))).toBe(false);
  });

  it('treats the -180 and 180 meridians as different places (documented limitation)', () => {
    expect(isSameFavoritePlace(typed(0, -180), typed(0, 180))).toBe(false);
  });
});

describe('containsFavorite', () => {
  it('is false for an empty list', () => {
    expect(containsFavorite([], LUND_SWEDEN)).toBe(false);
  });

  it('finds a place by its coordinates, not its name', () => {
    expect(containsFavorite([LUND_SWEDEN], typed(55.70584, 13.19321))).toBe(true);
    expect(containsFavorite([LUND_SWEDEN], LUND_ENGLAND)).toBe(false);
  });
});

describe('addFavorite', () => {
  it('adds the newest favorite first', () => {
    const favorites = addFavorite(addFavorite([], KIRUNA), LUND_SWEDEN);

    expect(favorites).toEqual([LUND_SWEDEN, KIRUNA]);
  });

  it('keeps the location object and its exact coordinates', () => {
    const favorites = addFavorite([], LUND_SWEDEN);

    expect(favorites[0]).toBe(LUND_SWEDEN);
    expect(favorites[0].coordinates).toEqual({ latitude: 55.70584, longitude: 13.19321 });
  });

  it('does not add the same location twice', () => {
    const once = addFavorite([], LUND_SWEDEN);
    const twice = addFavorite(once, { ...LUND_SWEDEN });

    expect(twice).toBe(once);
    expect(twice).toHaveLength(1);
  });

  it('keeps the entry saved first when the same place is added under another name', () => {
    const favorites = addFavorite([LUND_SWEDEN], typed(55.7058, 13.1932));

    expect(favorites).toEqual([LUND_SWEDEN]);
    expect(favorites[0].name).toBe('Lund');
  });

  it('adds a same-named place elsewhere as a separate favorite', () => {
    expect(addFavorite([LUND_SWEDEN], LUND_ENGLAND)).toEqual([LUND_ENGLAND, LUND_SWEDEN]);
  });

  it('does not change the original array', () => {
    const original: ReadonlyArray<Location> = Object.freeze([KIRUNA]);

    const favorites = addFavorite(original, LUND_SWEDEN);

    expect(original).toEqual([KIRUNA]);
    expect(favorites).not.toBe(original);
  });
});

describe('removeFavorite', () => {
  it('removes the favorite for the place', () => {
    expect(removeFavorite([LUND_SWEDEN, KIRUNA], LUND_SWEDEN)).toEqual([KIRUNA]);
  });

  it('finds the favorite by its coordinates, so the typed place removes the geocoded one', () => {
    expect(removeFavorite([LUND_SWEDEN, KIRUNA], typed(55.7058, 13.1932))).toEqual([KIRUNA]);
  });

  it('leaves a same-named place elsewhere', () => {
    expect(removeFavorite([LUND_SWEDEN, LUND_ENGLAND], LUND_ENGLAND)).toEqual([LUND_SWEDEN]);
  });

  it('returns the original array when the place is not a favorite', () => {
    const favorites = [KIRUNA];

    expect(removeFavorite(favorites, LUND_SWEDEN)).toBe(favorites);
  });

  it('does not change the original array', () => {
    const original: ReadonlyArray<Location> = Object.freeze([LUND_SWEDEN, KIRUNA]);

    removeFavorite(original, LUND_SWEDEN);

    expect(original).toEqual([LUND_SWEDEN, KIRUNA]);
  });
});

describe('toggleFavorite', () => {
  it('adds a place that is not a favorite, as the newest', () => {
    expect(toggleFavorite([KIRUNA], LUND_SWEDEN)).toEqual([LUND_SWEDEN, KIRUNA]);
  });

  it('removes a place that is a favorite', () => {
    expect(toggleFavorite([LUND_SWEDEN, KIRUNA], LUND_SWEDEN)).toEqual([KIRUNA]);
  });

  it('returns to the starting list when toggled twice', () => {
    const start = [KIRUNA];

    expect(toggleFavorite(toggleFavorite(start, LUND_SWEDEN), LUND_SWEDEN)).toEqual(start);
  });
});

describe('normalizeFavorites', () => {
  it('returns the original array when there are no duplicates', () => {
    const favorites = [LUND_SWEDEN, LUND_ENGLAND, KIRUNA];

    expect(normalizeFavorites(favorites)).toBe(favorites);
  });

  it('keeps the entry saved first (furthest back) of a duplicate place, in its own position', () => {
    const newer = typed(55.7058, 13.1932);

    expect(normalizeFavorites([newer, KIRUNA, LUND_SWEDEN])).toEqual([KIRUNA, LUND_SWEDEN]);
  });

  it('keeps the newest-first order of the remaining entries', () => {
    const favorites = [KIRUNA, LUND_ENGLAND, { ...KIRUNA }, LUND_SWEDEN];

    expect(normalizeFavorites(favorites)).toEqual([LUND_ENGLAND, KIRUNA, LUND_SWEDEN]);
  });

  it('does not change the original array', () => {
    const original: ReadonlyArray<Location> = Object.freeze([LUND_SWEDEN, { ...LUND_SWEDEN }]);

    expect(normalizeFavorites(original)).toEqual([LUND_SWEDEN]);
    expect(original).toHaveLength(2);
  });
});
