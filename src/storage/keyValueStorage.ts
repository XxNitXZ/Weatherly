import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError } from '../models/AppError';

/**
 * Thin wrapper around AsyncStorage (SPEC D-08, STYLE.md §3, §11): the only
 * module that imports it. Values are stored as JSON text.
 *
 * It knows nothing about what is stored. Read values are `unknown`; the
 * repository that owns a key validates them, because storage can hold an
 * older or damaged shape.
 *
 * Every failure becomes an AppError, so no raw storage error reaches a
 * ViewModel:
 * - `storage`: AsyncStorage itself failed to read or write;
 * - `parse`: the stored text is not valid JSON.
 */

/**
 * Reads the JSON value stored under `key`.
 *
 * @returns the parsed value as `unknown`, or `undefined` when nothing is
 *   stored under `key` (e.g. on first launch).
 * @throws AppError('storage') when reading fails, AppError('parse') when the
 *   stored text is not JSON.
 */
export async function readJson(key: string): Promise<unknown> {
  let text: string | null;
  try {
    text = await AsyncStorage.getItem(key);
  } catch (error) {
    throw new AppError('storage', `Could not read "${key}": ${describe(error)}`);
  }

  if (text === null) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new AppError('parse', `"${key}": stored text is not valid JSON: ${describe(error)}`);
  }
}

/**
 * Stores `value` as JSON under `key`, replacing any earlier value. Resolves
 * only after AsyncStorage has confirmed the write.
 *
 * @throws AppError('storage') when writing fails.
 */
export async function writeJson(key: string, value: unknown): Promise<void> {
  const text = JSON.stringify(value);
  try {
    await AsyncStorage.setItem(key, text);
  } catch (error) {
    throw new AppError('storage', `Could not write "${key}": ${describe(error)}`);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
