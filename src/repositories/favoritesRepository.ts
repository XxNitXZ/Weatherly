import type { Location } from '../models/Location';
import { parseStoredFavorites, toStoredFavorites } from '../parsers/favoritesParser';
import { readJson, writeJson } from '../storage/keyValueStorage';
import { normalizeFavorites } from '../utils/favorites';

/**
 * Single source of truth for the saved favorite places (W-08; STYLE.md §11;
 * SPEC D-38, D-40). Reads and writes the versioned format of
 * `favoritesParser` through `keyValueStorage`. No network.
 *
 * Reads and writes run one after another, in the order they were called, for
 * every caller. The home screen and the favorites screen each have their own
 * ViewModel, so without this a read started when the home screen comes back
 * into view could finish before a write the favorites screen started just
 * before, and show an outdated list.
 *
 * Errors are not caught: AppError('storage') when the device storage fails,
 * AppError('parse') when the stored value is not valid JSON or not a valid
 * favorites value. Damaged data is never replaced here; that is only done by
 * an explicit save.
 */

/** The storage key for the favorites list (STYLE.md §5). */
export const FAVORITES_STORAGE_KEY = 'weatherly:favorites';

// The end of the last operation that was started. A failed operation must not
// stop the next one, so the chain continues after errors.
let lastOperation: Promise<unknown> = Promise.resolve();

/** Runs `operation` after every earlier read or write has finished. */
function runInOrder<T>(operation: () => Promise<T>): Promise<T> {
  const result = lastOperation.then(operation, operation);
  lastOperation = result.catch(() => undefined);
  return result;
}

/**
 * The saved favorites, newest first.
 *
 * @returns `[]` when nothing has been saved yet (first launch). Duplicate
 *   places in the stored list are removed, keeping the entry saved first.
 */
export function loadFavorites(): Promise<ReadonlyArray<Location>> {
  return runInOrder(async () => {
    const stored = await readJson(FAVORITES_STORAGE_KEY);
    if (stored === undefined) {
      return [];
    }
    return normalizeFavorites(parseStoredFavorites(stored));
  });
}

/**
 * Replaces the saved favorites with `favorites` (newest first), as versioned
 * JSON without duplicates. Resolves only after the storage has confirmed the
 * write.
 */
export function saveFavorites(favorites: ReadonlyArray<Location>): Promise<void> {
  return runInOrder(() =>
    writeJson(FAVORITES_STORAGE_KEY, toStoredFavorites(normalizeFavorites(favorites))),
  );
}
