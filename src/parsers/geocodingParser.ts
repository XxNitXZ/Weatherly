import type { Location } from '../models/Location';
import { readArray, readNumber, readObject, readOptionalString, readString } from './jsonReaders';

/**
 * Turns an Open-Meteo Geocoding response into `Location` values (W-02, W-14).
 *
 * This is the only module that knows the geocoding JSON shape (STYLE.md §10).
 * Fields used per result: `name`, `latitude`, `longitude` (required) and
 * `admin1` → `region`, `country` (optional, used to tell same-named places
 * apart, W-01). Everything else (id, population, timezone, …) is ignored.
 *
 * Pure function: no I/O, same output for the same input.
 *
 * @returns An empty list when nothing matched: the API then leaves out the
 *   `results` key entirely.
 * @throws AppError('parse') if the response or any result is malformed.
 */
export function parseGeocodingResponse(json: unknown): ReadonlyArray<Location> {
  const root = readObject(json, 'response');

  if (root.results === undefined) {
    return [];
  }

  return readArray(root.results, 'results').map((value, index) =>
    parseLocation(value, `results[${index}]`),
  );
}

function parseLocation(value: unknown, path: string): Location {
  const result = readObject(value, path);

  return {
    name: readString(result.name, `${path}.name`),
    region: readOptionalString(result.admin1, `${path}.admin1`),
    country: readOptionalString(result.country, `${path}.country`),
    coordinates: {
      latitude: readNumber(result.latitude, `${path}.latitude`),
      longitude: readNumber(result.longitude, `${path}.longitude`),
    },
  };
}
