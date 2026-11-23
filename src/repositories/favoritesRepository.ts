import type { Location } from '../models/Location';
import { parseStoredFavorites, toStoredFavorites } from '../parsers/favoritesParser';
import { readJson, writeJson } from '../storage/keyValueStorage';
import { normalizeFavorites } from '../utils/favorites';

/**
 * Single source of truth for the saved favorite places (W-08; STYLE.md §11;
 * SPEC D-38). Reads and writes the versioned format of `favoritesParser`
 * through `keyValueStorage`. No network.
 *
 * Errors are not caught: AppError('storage') when the device storage fails,
 * AppError('parse') when the stored value is not valid JSON or not a valid
 * favorites value. Damaged data is never replaced here; that is only done by
 * an explicit save.
 */

/** The storage key for the favorites list (STYLE.md §5). */
export const FAVORITES_STORAGE_KEY = 'weatherly:favorites';

/**
 * The saved favorites, newest first.
 *
 * @returns `[]` when nothing has been saved yet (first launch). Duplicate
 *   places in the stored list are removed, keeping the entry saved first.
 */
export async function loadFavorites(): Promise<ReadonlyArray<Location>> {
  const stored = await readJson(FAVORITES_STORAGE_KEY);
  if (stored === undefined) {
    return [];
  }
  return normalizeFavorites(parseStoredFavorites(stored));
}

/**
 * Replaces the saved favorites with `favorites` (newest first), as versioned
 * JSON without duplicates. Resolves only after the storage has confirmed the
 * write.
 */
export async function saveFavorites(favorites: ReadonlyArray<Location>): Promise<void> {
  await writeJson(FAVORITES_STORAGE_KEY, toStoredFavorites(normalizeFavorites(favorites)));
}
