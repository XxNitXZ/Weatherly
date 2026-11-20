import type { Coordinates } from '../models/Location';

/**
 * Validation of typed coordinates (W-03). Pure: no React, no I/O.
 * Invalid input never reaches the network, because the ViewModel only builds
 * a location when this returns `isValid: true`.
 */

export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;

/** Why one field was rejected. The view turns this into a message. */
export type CoordinateError = 'empty' | 'notANumber' | 'outOfRange';

export type CoordinateValidationResult =
  | { readonly isValid: true; readonly coordinates: Coordinates }
  | {
      readonly isValid: false;
      readonly latitudeError?: CoordinateError;
      readonly longitudeError?: CoordinateError;
    };

/**
 * A decimal number: optional sign, digits, and an optional decimal part.
 * Both `.` and `,` are accepted as the decimal separator, because Swedish
 * keyboards type a comma (SPEC D-25).
 *
 * `Number()` alone is not enough: it turns "" into 0 and accepts "1e2",
 * "0x10" and "Infinity", which are not coordinates a user would type.
 */
const DECIMAL_PATTERN = /^[+-]?\d+([.,]\d+)?$/;

/** Validates both fields and reports an error for each invalid one. */
export function validateCoordinates(
  latitudeText: string,
  longitudeText: string,
): CoordinateValidationResult {
  const latitude = parseCoordinate(latitudeText, MIN_LATITUDE, MAX_LATITUDE);
  const longitude = parseCoordinate(longitudeText, MIN_LONGITUDE, MAX_LONGITUDE);

  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return { isValid: true, coordinates: { latitude, longitude } };
  }

  return {
    isValid: false,
    latitudeError: typeof latitude === 'string' ? latitude : undefined,
    longitudeError: typeof longitude === 'string' ? longitude : undefined,
  };
}

/** Returns the number, or the reason the text is not a valid coordinate. */
function parseCoordinate(text: string, min: number, max: number): number | CoordinateError {
  const trimmed = text.trim();
  if (trimmed === '') {
    return 'empty';
  }
  if (!DECIMAL_PATTERN.test(trimmed)) {
    return 'notANumber';
  }
  const value = Number(trimmed.replace(',', '.'));
  if (value < min || value > max) {
    return 'outOfRange';
  }
  return value;
}
