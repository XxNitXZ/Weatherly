import { AppError } from '../models/AppError';
import { DEFAULT_SETTINGS, type AppSettings } from '../models/AppSettings';
import { parseStoredSettings, toStoredSettings } from '../parsers/settingsParser';
import { readJson, writeJson } from '../storage/keyValueStorage';

/**
 * Single source of truth for the stored settings (W-10; STYLE.md §11; SPEC
 * D-44). Reads and writes the versioned format of `settingsParser` through
 * `keyValueStorage`. No network.
 *
 * Writes run one after another, in the order they were called, so two quick
 * taps on the settings screen are stored in that order and the last choice
 * wins.
 */

/** The storage key for the settings (STYLE.md §5). */
export const SETTINGS_STORAGE_KEY = 'weatherly:settings';

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
 * The stored settings. Nothing stored, damaged JSON or unusable values give
 * the defaults (see `parseStoredSettings`).
 *
 * @throws AppError('storage') only when the device storage cannot be read.
 */
export function loadSettings(): Promise<AppSettings> {
  return runInOrder(async () => {
    try {
      return parseStoredSettings(await readJson(SETTINGS_STORAGE_KEY));
    } catch (error) {
      if (error instanceof AppError && error.kind === 'parse') {
        return DEFAULT_SETTINGS;
      }
      throw error;
    }
  });
}

/**
 * Replaces the stored settings. Resolves only after the storage has confirmed
 * the write.
 *
 * @throws AppError('storage') when writing fails.
 */
export function saveSettings(settings: AppSettings): Promise<void> {
  return runInOrder(() => writeJson(SETTINGS_STORAGE_KEY, toStoredSettings(settings)));
}
