import { useState } from 'react';
import type { Location } from '../models/Location';
import { validateCoordinates, type CoordinateError } from '../utils/coordinateValidation';

export type CoordinateSearchViewModel = {
  /** Why the latitude field was rejected on the last submit, if it was. */
  readonly latitudeError?: CoordinateError;
  /** Why the longitude field was rejected on the last submit, if it was. */
  readonly longitudeError?: CoordinateError;
  /**
   * Validates the typed coordinates (W-03). Returns a `Location` the screen
   * can show the weather for, or `null` when a field is invalid; the field
   * errors then explain why. Never sends a request.
   */
  readonly submit: (latitudeText: string, longitudeText: string) => Location | null;
};

type FieldErrors = {
  readonly latitudeError?: CoordinateError;
  readonly longitudeError?: CoordinateError;
};

/**
 * ViewModel for coordinate search (W-03; STYLE.md §3.2). Separate from
 * `useSearchViewModel` because its state is two field errors, not a list of
 * results loaded from the network.
 *
 * Navigation and loading the weather stay with the screen (STYLE.md §3.3).
 */
export function useCoordinateSearchViewModel(): CoordinateSearchViewModel {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function submit(latitudeText: string, longitudeText: string): Location | null {
    const result = validateCoordinates(latitudeText, longitudeText);

    if (!result.isValid) {
      setFieldErrors({
        latitudeError: result.latitudeError,
        longitudeError: result.longitudeError,
      });
      return null;
    }

    setFieldErrors({});
    const { latitude, longitude } = result.coordinates;
    // Open-Meteo has no reverse geocoding, so the place is named by its coordinates.
    return { name: `${latitude}, ${longitude}`, coordinates: result.coordinates };
  }

  return { ...fieldErrors, submit };
}
