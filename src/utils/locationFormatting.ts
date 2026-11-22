import type { Coordinates, Location } from '../models/Location';

/**
 * Display helpers for locations (W-01, W-03). Pure: no React, no I/O.
 */

/**
 * The context line under a place name, e.g. "Skåne län, Sverige", so that
 * same-named places can be told apart (W-01). Missing parts are left out and
 * a repeated value is shown once.
 *
 * @returns `undefined` when the location has neither region nor country
 *   (e.g. a location entered as coordinates).
 */
export function formatLocationDetails(location: Location): string | undefined {
  const parts: string[] = [];
  for (const part of [location.region, location.country]) {
    if (part !== undefined && part !== '' && !parts.includes(part)) {
      parts.push(part);
    }
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/** Coordinates rounded to two decimals with compass letters, e.g. "59.33° N, 18.07° E". */
export function formatCoordinates(coordinates: Coordinates): string {
  const latitude = `${Math.abs(coordinates.latitude).toFixed(2)}° ${coordinates.latitude < 0 ? 'S' : 'N'}`;
  const longitude = `${Math.abs(coordinates.longitude).toFixed(2)}° ${coordinates.longitude < 0 ? 'W' : 'E'}`;
  return `${latitude}, ${longitude}`;
}

/**
 * True when both values describe the same place. Geocoding results carry no
 * ID (the parser does not keep it), so name and exact coordinates are compared.
 */
export function isSameLocation(a: Location, b: Location): boolean {
  return (
    a.name === b.name &&
    a.coordinates.latitude === b.coordinates.latitude &&
    a.coordinates.longitude === b.coordinates.longitude
  );
}
