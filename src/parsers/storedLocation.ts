import { AppError } from '../models/AppError';
import type { Location } from '../models/Location';
import {
  MAX_LATITUDE,
  MAX_LONGITUDE,
  MIN_LATITUDE,
  MIN_LONGITUDE,
} from '../utils/coordinateValidation';
import { readNumber, readObject, readString } from './jsonReaders';

/**
 * How a `Location` is stored on the device, shared by every stored format that
 * contains a place: the favorites (SPEC D-38) and the weather cache (SPEC
 * D-47). One reader means one set of rules for a stored place.
 *
 * ```json
 * { "name": "Lund", "region": "Skåne län", "country": "Sverige",
 *   "coordinates": { "latitude": 55.70584, "longitude": 13.19321 } }
 * ```
 *
 * `region` and `country` are left out when the place has none.
 */
export type StoredLocation = {
  readonly name: string;
  readonly region?: string;
  readonly country?: string;
  readonly coordinates: { readonly latitude: number; readonly longitude: number };
};

/** Only the fields of `Location`; optional fields that are not set are left out. */
export function toStoredLocation(location: Location): StoredLocation {
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

/**
 * Reads a stored place. Strict: anything unexpected throws.
 *
 * @throws AppError('parse') naming the field under `path`: a missing or empty
 *   name, a `region`/`country` that is present but not a string (also `null`),
 *   or a latitude/longitude that is not a finite number or lies outside
 *   [-90, 90] / [-180, 180]. Unknown extra fields are ignored.
 */
export function parseStoredLocation(value: unknown, path: string): Location {
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
