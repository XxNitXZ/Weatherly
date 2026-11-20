import type { Location } from '../models/Location';
import { parseGeocodingResponse } from '../parsers/geocodingParser';
import { fetchLocations } from '../services/api/geocodingService';

/**
 * Place search (W-01, W-02). Deliberately thin (SPEC D-17): it only joins the
 * geocoding service and parser, so the ViewModel receives typed `Location`
 * values and never touches raw JSON. No caching.
 *
 * Errors are not caught: an `AppError` ('network', 'timeout', 'http',
 * 'parse') reaches the caller unchanged, so the ViewModel can choose the
 * right message.
 *
 * @param query A trimmed, non-empty place name (checked by the ViewModel).
 * @returns The matching locations; an empty list when nothing matched.
 */
export async function searchLocations(query: string): Promise<ReadonlyArray<Location>> {
  const json = await fetchLocations(query);
  return parseGeocodingResponse(json);
}
