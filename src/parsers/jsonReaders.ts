import { AppError } from '../models/AppError';

/**
 * Shared helpers for parsers (STYLE.md §10). Each one narrows an `unknown`
 * JSON value to a checked type, or throws AppError('parse') with the path of
 * the bad field, so a failure says exactly what was wrong.
 */

export type JsonObject = { readonly [key: string]: unknown };

export function readObject(value: unknown, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw parseError(path, 'an object', value);
  }
  return value as JsonObject;
}

export function readString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw parseError(path, 'a string', value);
  }
  return value;
}

/** `null` and missing values become `undefined`; anything else must be a string. */
export function readOptionalString(value: unknown, path: string): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return readString(value, path);
}

/** Rejects NaN and Infinity as well as non-numbers. */
export function readNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw parseError(path, 'a finite number', value);
  }
  return value;
}

/** `null` and missing values become `undefined`; anything else must be a number. */
export function readOptionalNumber(value: unknown, path: string): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return readNumber(value, path);
}

/** If `expectedLength` is given, the array must have exactly that length. */
export function readArray(
  value: unknown,
  path: string,
  expectedLength?: number,
): ReadonlyArray<unknown> {
  if (!Array.isArray(value)) {
    throw parseError(path, 'an array', value);
  }
  if (expectedLength !== undefined && value.length !== expectedLength) {
    throw new AppError(
      'parse',
      `${path}: expected ${expectedLength} entries, got ${value.length}`,
    );
  }
  return value;
}

function parseError(path: string, expected: string, actual: unknown): AppError {
  const actualType = actual === null ? 'null' : Array.isArray(actual) ? 'array' : typeof actual;
  return new AppError('parse', `${path}: expected ${expected}, got ${actualType}`);
}
