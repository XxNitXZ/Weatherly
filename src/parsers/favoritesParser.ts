import { AppError } from '../models/AppError';
import type { Location } from '../models/Location';
import {
  MAX_LATITUDE,
  MAX_LONGITUDE,
  MIN_LATITUDE,
  MIN_LONGITUDE,
} from '../utils/coordinateValidation';
import { readArray, readNumber, readObject, readString } from './jsonReaders';

/**
 * The stored favorites format (W-08; SPEC D-38): the only module that knows
 * its JSON shape, in both directions.
 *
 * ```json
 * { "version": 1,
 *   "favorites": [{ "name": "Lund", "region": "Skåne län", "country": "Sverige",
 *                   "coordinates": { "latitude": 55.70584, "longitude": 13.19321 } }] }
 * ```
 *
 * Each entry has exactly the fields of `Location`. `region` and `country` are
 * left out when the place has none. The list is newest first.
 *
 * Reading is strict, like the API parsers: anything unexpected throws
 * AppError('parse') with the path of the bad field, and nothing is repaired
 * or guessed. Unknown extra fields in an entry are ignored.
 */

/** The version this code writes and the only one it reads. */
export const FAVORITES_SCHEMA_VERSION = 1;

type StoredLocation = {
  readonly name: string;
  readonly region?: string;
  readonly country?: string;
  readonly coordinates: { readonly latitude: number; readonly longitude: number };
};

export type StoredFavorites = {
  readonly version: typeof FAVORITES_SCHEMA_VERSION;
  readonly favorites: ReadonlyArray<StoredLocation>;
};

/**
 * Turns a stored favorites value into `Location` values, in stored order.
 * Duplicates are not removed here (the repository does that).
 *
 * @throws AppError('parse') when the value is not an object, the version is
 *   missing or not `FAVORITES_SCHEMA_VERSION`, `favorites` is not an array,
 *   or any entry is invalid: a missing or empty name, a `region`/`country`
 *   that is present but not a string (also `null`), or a latitude/longitude
 *   that is not a finite number or lies outside [-90, 90] / [-180, 180].
 */
export function parseStoredFavorites(json: unknown): ReadonlyArray<Location> {
  const root = readObject(json, 'favorites storage');

  const version = readNumber(root.version, 'version');
  if (version !== FAVORITES_SCHEMA_VERSION) {
    throw new AppError(
      'parse',
      `version: unsupported favorites schema version ${version}, expected ${FAVORITES_SCHEMA_VERSION}`,
    );
  }

  return readArray(root.favorites, 'favorites').map((value, index) =>
    parseStoredLocation(value, `favorites[${index}]`),
  );
}

/**
 * The value to store for `favorites` (newest first): the current version and
 * only the fields of each `Location`.
 */
export function toStoredFavorites(favorites: ReadonlyArray<Location>): StoredFavorites {
  return {
    version: FAVORITES_SCHEMA_VERSION,
    favorites: favorites.map(toStoredLocation),
  };
}

function toStoredLocation(location: Location): StoredLocation {
  return {
    name: location.name,
    ...(location.region !== undefined ? { region: location.region } : {}),
    ...(location.country !== undefined ? { country: location.country } : {}),
    coordinates: {
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
    },
  };
}

function parseStoredLocation(value: unknown, path: string): Location {
  const entry = readObject(value, path);
  const coordinates = readObject(entry.coordinates, `${path}.coordinates`);

  return {
    name: readNonEmptyString(entry.name, `${path}.name`),
    region: readStoredOptionalString(entry.region, `${path}.region`),
    country: readStoredOptionalString(entry.country, `${path}.country`),
    coordinates: {
      latitude: readNumberInRange(
        coordinates.latitude,
        `${path}.coordinates.latitude`,
        MIN_LATITUDE,
        MAX_LATITUDE,
      ),
      longitude: readNumberInRange(
        coordinates.longitude,
        `${path}.coordinates.longitude`,
        MIN_LONGITUDE,
        MAX_LONGITUDE,
      ),
    },
  };
}

function readNonEmptyString(value: unknown, path: string): string {
  const text = readString(value, path);
  if (text.trim() === '') {
    throw new AppError('parse', `${path}: expected a non-empty string`);
  }
  return text;
}

/**
 * Missing means "none". Unlike `readOptionalString` for API data, `null` is
 * rejected: this app never writes `null`, so a stored `null` means the data
 * was not written by this code.
 */
function readStoredOptionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : readString(value, path);
}

function readNumberInRange(value: unknown, path: string, min: number, max: number): number {
  const number = readNumber(value, path);
  if (number < min || number > max) {
    throw new AppError('parse', `${path}: expected a number in [${min}, ${max}], got ${number}`);
  }
  return number;
}
