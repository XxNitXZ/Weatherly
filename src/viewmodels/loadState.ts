import type { AppError } from '../models/AppError';

/**
 * UI state of one asynchronous load, shared by all ViewModels (STYLE.md §7).
 *
 * - `idle`: nothing requested yet (e.g. search screen before the first search).
 * - `loading`: first load, no data to show yet.
 * - `success`: usable, up-to-date data. Whether it came from the network or a
 *   fresh cache entry does not matter to the UI, so no source flag exists and
 *   a fresh cache hit never shows an offline warning.
 *   `isRefreshing` is true while a refresh runs and the data stays visible.
 * - `refreshFailed`: a refresh failed, but earlier data (in memory or cached)
 *   is still shown. `error.kind` tells the View whether to show
 *   "offline" (`network`, `timeout`) or a general "could not update" notice.
 *   `isRefreshing` is true while a retry runs.
 * - `error`: the load failed and there is no data to show.
 *
 * Timestamps such as "last updated" belong to `T` (e.g. a cached report with
 * `fetchedAtEpochMs`), not to this type, because not every load is timestamped.
 */
export type LoadState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | {
      readonly status: 'success';
      readonly data: T;
      readonly isRefreshing: boolean;
    }
  | {
      readonly status: 'refreshFailed';
      readonly data: T;
      readonly error: AppError;
      readonly isRefreshing: boolean;
    }
  | { readonly status: 'error'; readonly error: AppError };
