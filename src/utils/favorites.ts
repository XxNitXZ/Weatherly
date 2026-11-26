import type { Location } from '../models/Location';

/**
 * Favorite identity and list rules (W-08; SPEC D-37). Pure: no React, no I/O.
 *
 * A favorites list is ordered newest first and never holds two entries for
 * the same place. Every function returns a new array and never changes the
 * one it was given. When nothing changes, the original array is returned, so
 * a caller can tell "no change" (and skip a write) by reference equality.
 */

/**
 * The largest difference, in degrees, at which two latitudes (or two
 * longitudes) still count as the same favorite place: about 11 m north–south.
 * Inclusive: a difference of exactly 0.0001 is still the same place.
 */
export const FAVORITE_COORDINATE_TOLERANCE = 0.0001;

/**
 * Absorbs binary rounding, so the boundary is the same for every pair of
 * decimal values. Without it, 55.70584 vs 55.70594 is "inside" (the computed
 * difference is 0.0000999…) but 55.70584 vs 55.70574 is "outside"
 * (0.0001000…03), although both differ by exactly 0.0001 as written.
 * 1e-9 degrees is about 0.1 mm, far below any real difference between places.
 */
const ROUNDING_ALLOWANCE = 1e-9;

function isWithinTolerance(a: number, b: number): boolean {
  return Math.abs(a - b) <= FAVORITE_COORDINATE_TOLERANCE + ROUNDING_ALLOWANCE;
}

/**
 * True when two locations are the same favorite place: both the latitude and
 * the longitude differ by at most `FAVORITE_COORDINATE_TOLERANCE`.
 *
 * Only coordinates are compared, never names:
 * - the same place found by name ("Lund") and entered as coordinates
 *   ("55.70584, 13.19321") is one favorite;
 * - same-named places elsewhere (Lund, Sweden and Lund, England) stay apart.
 *
 * Deliberately separate from `isSameLocation`, which compares the name and
 * exact coordinates to decide whether the weather must be loaded again.
 *
 * Boundary behaviour, accepted as limitations:
 * - the rule is not transitive: A may match B and B match C while A and C,
 *   0.0002° apart, do not;
 * - longitudes -180 and 180 (the same meridian) count as different, and so do
 *   two longitudes at a pole.
 */
export function isSameFavoritePlace(a: Location, b: Location): boolean {
  return (
    isWithinTolerance(a.coordinates.latitude, b.coordinates.latitude) &&
    isWithinTolerance(a.coordinates.longitude, b.coordinates.longitude)
  );
}

/** True when `favorites` already holds an entry for the place of `location`. */
export function containsFavorite(favorites: ReadonlyArray<Location>, location: Location): boolean {
  return favorites.some((favorite) => isSameFavoritePlace(favorite, location));
}

/**
 * Adds `location` as the newest favorite (first in the list), keeping the
 * object and its exact coordinates as they are.
 *
 * @returns the original array when the place is already a favorite: the entry
 *   saved first is kept, so a geocoded name is never replaced by coordinates.
 */
export function addFavorite(
  favorites: ReadonlyArray<Location>,
  location: Location,
): ReadonlyArray<Location> {
  if (containsFavorite(favorites, location)) {
    return favorites;
  }
  return [location, ...favorites];
}

/**
 * Removes the favorite for the place of `location`, found with the same
 * identity rule as `addFavorite`.
 *
 * @returns the original array when the place is not a favorite.
 */
export function removeFavorite(
  favorites: ReadonlyArray<Location>,
  location: Location,
): ReadonlyArray<Location> {
  if (!containsFavorite(favorites, location)) {
    return favorites;
  }
  return favorites.filter((favorite) => !isSameFavoritePlace(favorite, location));
}

/** Removes the place when it is a favorite, otherwise adds it as the newest. */
export function toggleFavorite(
  favorites: ReadonlyArray<Location>,
  location: Location,
): ReadonlyArray<Location> {
  return containsFavorite(favorites, location)
    ? removeFavorite(favorites, location)
    : addFavorite(favorites, location);
}

/**
 * Removes duplicate places from a newest-first list, e.g. one read from
 * storage that was written by older code or edited by hand. Of each set of
 * duplicates, the entry saved first (the one furthest back in the list) is
 * kept, in its own position; the order of the kept entries does not change.
 *
 * @returns the original array when it has no duplicates.
 */
export function normalizeFavorites(favorites: ReadonlyArray<Location>): ReadonlyArray<Location> {
  const keptOldestFirst: Location[] = [];
  for (let index = favorites.length - 1; index >= 0; index -= 1) {
    const favorite = favorites[index];
    if (!containsFavorite(keptOldestFirst, favorite)) {
      keptOldestFirst.push(favorite);
    }
  }
  if (keptOldestFirst.length === favorites.length) {
    return favorites;
  }
  return keptOldestFirst.reverse();
}
