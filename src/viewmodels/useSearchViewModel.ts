import { useEffect, useRef, useState } from 'react';
import { AppError, toAppError } from '../models/AppError';
import type { Location } from '../models/Location';
import { searchLocations } from '../repositories/locationRepository';
import { createLatestRequestGuard } from './latestRequest';
import type { LoadState } from './loadState';

export type SearchViewModel = {
  /** What the search area shows: idle, loading, the result list, or an error. */
  readonly state: LoadState<ReadonlyArray<Location>>;
  /** Searches for places matching `query` (W-01). */
  readonly search: (query: string) => void;
};

/**
 * Trims a typed search query. Returns `null` when nothing is left, so an
 * empty or whitespace-only query never reaches the network (W-01).
 */
export function prepareSearchQuery(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * True when `preparedQuery` repeats the search that is still loading or whose
 * results are shown, so sending it again would only repeat the same request.
 * Case is ignored because the geocoding API ignores it ("Lund", "lund" and
 * "LUND" return the same results, checked 2026-11-22).
 */
export function isRepeatedSearch(preparedQuery: string, activeQuery: string | null): boolean {
  return (
    activeQuery !== null &&
    preparedQuery.toLocaleLowerCase() === activeQuery.toLocaleLowerCase()
  );
}

/**
 * ViewModel for place-name search (W-01, W-02; STYLE.md §3, §7).
 *
 * State flow for `search(query)`:
 * - empty query → `error` with AppError('validation'); no request is sent
 * - otherwise   → `loading`, then
 *   - `success` with the matching locations (an empty list means "no
 *     locations found"; same-named places carry region and country)
 *   - `error` with the AppError (network, timeout, http, parse, unknown)
 *
 * Only the latest search may update the state (`createLatestRequestGuard`,
 * shared with the weather ViewModel): each search gets a number, and a result
 * whose number is no longer the latest is ignored. This prevents an older,
 * slower search from overwriting a newer one (Q12), and results that arrive
 * after the screen is gone are ignored too.
 *
 * Repeating the search that is loading or already shown sends no second
 * request (`isRepeatedSearch`). After an error, the same query can be
 * searched again, which is how the user retries.
 *
 * Navigation stays in the screen (STYLE.md §3.3).
 */
export function useSearchViewModel(): SearchViewModel {
  const [state, setState] = useState<LoadState<ReadonlyArray<Location>>>({ status: 'idle' });
  const [requestGuard] = useState(createLatestRequestGuard);
  // The query whose search is loading or whose results are shown; null otherwise.
  const activeQuery = useRef<string | null>(null);

  useEffect(() => {
    // The screen is gone: make every running search outdated.
    return () => requestGuard.cancelAll();
  }, [requestGuard]);

  async function runSearch(query: string, searchId: number): Promise<void> {
    try {
      const locations = await searchLocations(query);
      if (requestGuard.isLatest(searchId)) {
        setState({ status: 'success', data: locations, isRefreshing: false });
      }
    } catch (error) {
      if (requestGuard.isLatest(searchId)) {
        activeQuery.current = null;
        setState({ status: 'error', error: toAppError(error) });
      }
    }
  }

  function search(query: string): void {
    const preparedQuery = prepareSearchQuery(query);
    if (preparedQuery !== null && isRepeatedSearch(preparedQuery, activeQuery.current)) {
      return;
    }

    // A new search, even an empty one, makes any running search outdated.
    const searchId = requestGuard.start();

    if (preparedQuery === null) {
      activeQuery.current = null;
      setState({ status: 'error', error: new AppError('validation', 'Search query is empty') });
      return;
    }

    activeQuery.current = preparedQuery;
    setState({ status: 'loading' });
    void runSearch(preparedQuery, searchId);
  }

  return { state, search };
}
