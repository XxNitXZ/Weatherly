import { useCallback, useEffect, useRef, useState } from 'react';
import { toAppError, type AppError } from '../models/AppError';
import type { Location } from '../models/Location';
import { loadFavorites, saveFavorites } from '../repositories/favoritesRepository';
import {
  addFavorite,
  containsFavorite,
  removeFavorite,
  toggleFavorite,
} from '../utils/favorites';
import { createLatestRequestGuard } from './latestRequest';
import type { LoadState } from './loadState';

type Favorites = ReadonlyArray<Location>;

export type FavoritesViewModel = {
  /**
   * The saved favorites, newest first: `loading` while they are read, then
   * `success` (an empty list on first launch) or `error` when the storage
   * could not be read or holds damaged data. `data` is always the list the
   * storage last confirmed.
   */
  readonly state: LoadState<Favorites>;
  /** True while a change is being written; further changes are ignored until it ends. */
  readonly isSaving: boolean;
  /** Why the last change could not be saved, or `null`. `state` then still shows the saved list. */
  readonly saveError: AppError | null;
  /** True when the place of `location` is a saved favorite. */
  readonly isFavorite: (location: Location) => boolean;
  /** Saves `location` as the newest favorite; a place that is already a favorite is ignored. */
  readonly addFavorite: (location: Location) => void;
  /** Removes the favorite for the place of `location`, if there is one. */
  readonly removeFavorite: (location: Location) => void;
  /** Removes the place when it is a favorite, otherwise adds it. */
  readonly toggleFavorite: (location: Location) => void;
  /**
   * Reads the favorites from storage again, e.g. when a screen comes back
   * into view after another screen changed them. The same function on every
   * render, so a screen can use it in a focus effect.
   */
  readonly reload: () => void;
  /**
   * True when a change would be accepted now: the list was read successfully,
   * is not being read again, and no write is running. Views disable their
   * favorite buttons otherwise.
   */
  readonly canChange: boolean;
  /**
   * Deletes all saved favorites, also a damaged stored value, by saving an
   * empty list. Only after a failed read (`state.status === 'error'`) and only
   * when the user has confirmed it on screen; never called automatically
   * (SPEC D-40).
   */
  readonly resetFavorites: () => void;
};

/** What a write left behind: the list storage now holds, and the error if the write failed. */
export type FavoritesSaveOutcome = {
  readonly favorites: Favorites;
  readonly error: AppError | null;
};

/**
 * Reads the favorites with `load` and maps the result to a state: `success`
 * with the list, or `error` with an AppError (anything else becomes kind
 * `unknown`). Never rejects.
 */
export async function loadFavoritesState(load: () => Promise<Favorites>): Promise<LoadState<Favorites>> {
  try {
    return { status: 'success', data: await load(), isRefreshing: false };
  } catch (error) {
    return { status: 'error', error: toAppError(error) };
  }
}

/**
 * The state while favorites are read again: a list already shown stays
 * visible with `isRefreshing`, otherwise `loading`.
 */
export function reloadingState(state: LoadState<Favorites>): LoadState<Favorites> {
  if (state.status === 'success' || state.status === 'refreshFailed') {
    return { ...state, isRefreshing: true };
  }
  return { status: 'loading' };
}

/**
 * The list to write for a change, or `null` when nothing may or needs to be
 * written:
 * - `saved` is `null`: the favorites were never read successfully. This
 *   includes damaged storage, which must not be overwritten by a change.
 * - `isSaving`: another write is running. Allowing a second one could let an
 *   older list overwrite a newer one, so rapid repeated taps are ignored.
 * - the change returns `saved` itself: a duplicate add or a remove of a place
 *   that is not a favorite, so there is nothing to write.
 */
export function planFavoritesChange(
  saved: Favorites | null,
  isSaving: boolean,
  change: (favorites: Favorites) => Favorites,
): Favorites | null {
  if (saved === null || isSaving) {
    return null;
  }
  const next = change(saved);
  return next === saved ? null : next;
}

/**
 * Writes `next` with `save` and reports which list storage holds afterwards.
 * Only a confirmed write makes `next` the result; when the write fails, the
 * last saved list stays authoritative and the error is returned. Never
 * rejects.
 */
export async function saveFavoritesChange(
  saved: Favorites,
  next: Favorites,
  save: (favorites: Favorites) => Promise<void>,
): Promise<FavoritesSaveOutcome> {
  try {
    await save(next);
    return { favorites: next, error: null };
  } catch (error) {
    return { favorites: saved, error: toAppError(error) };
  }
}

/** True when `state` holds a list that contains the place of `location`. */
export function isFavoriteIn(state: LoadState<Favorites>, location: Location): boolean {
  if (state.status !== 'success' && state.status !== 'refreshFailed') {
    return false;
  }
  return containsFavorite(state.data, location);
}

/**
 * True when a change may start: the list was read successfully and is not
 * being read again, and no write is running (SPEC D-39, D-40). While a list
 * is read again it may be outdated, so a change made from it could bring
 * back a favorite another screen has just removed.
 */
export function canChangeFavorites(state: LoadState<Favorites>, isSaving: boolean): boolean {
  return !isSaving && state.status === 'success' && !state.isRefreshing;
}

/**
 * True when the saved favorites may be deleted: only after a failed read
 * (damaged or unreadable storage) and while no write is running (SPEC D-40).
 */
export function canResetFavorites(state: LoadState<Favorites>, isSaving: boolean): boolean {
  return !isSaving && state.status === 'error';
}

/**
 * Replaces the saved favorites with an empty list using `save` (the
 * repository's `saveFavorites`, so the same storage path and format).
 *
 * @returns `null` once the write is confirmed, otherwise the AppError. Never rejects.
 */
export async function resetStoredFavorites(
  save: (favorites: Favorites) => Promise<void>,
): Promise<AppError | null> {
  try {
    await save([]);
    return null;
  } catch (error) {
    return toAppError(error);
  }
}

/**
 * ViewModel for the favorite places (W-08; SPEC D-39, D-40). Restores the
 * saved favorites when it is first used, and saves every change before
 * showing it.
 *
 * Rules:
 * - **Storage decides.** The list shown is always the one storage last
 *   confirmed. A change appears only after its write has succeeded; a failed
 *   write keeps the earlier list and sets `saveError`.
 * - **One write at a time.** Changes while a write runs are ignored
 *   (`isSaving`), so rapid repeated taps cannot interleave two writes.
 * - **No change from an outdated list.** While the list is read again
 *   (`reload`), changes are ignored, so a list another screen has changed
 *   cannot be written back. `reload` itself is ignored while a write runs.
 * - **Damaged storage is kept.** After a failed read, changes are ignored, so
 *   the stored value is not replaced by an empty or partial list. Only
 *   `resetFavorites`, after the user confirmed it, deletes it.
 * - A write makes any read still running outdated (`createLatestRequestGuard`),
 *   so an older read cannot replace the list just saved.
 *
 * Each screen that calls this hook has its own copy of the list, so a screen
 * calls `reload` when it comes back into view (SPEC D-40). The repository
 * runs reads and writes in order, so a read started after another screen's
 * write sees that write. No global state (SPEC D-10). Navigation stays in the
 * screens (STYLE.md §3.3).
 */
export function useFavoritesViewModel(): FavoritesViewModel {
  const [state, setState] = useState<LoadState<Favorites>>({ status: 'loading' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<AppError | null>(null);
  const [loadGuard] = useState(createLatestRequestGuard);
  // The list storage last confirmed; null until a read succeeds, while a
  // read runs, and after a failed read. Changes start only from a list.
  const savedFavorites = useRef<Favorites | null>(null);
  // A ref as well as state: two taps within one render must both see the running write.
  const isSavingRef = useRef(false);

  // Stable (only refs, the stable guard and state setters), so screens can
  // call it from a focus effect without re-running the effect every render.
  const reload = useCallback((): void => {
    if (isSavingRef.current) {
      return;
    }
    const requestId = loadGuard.start();
    savedFavorites.current = null;
    setSaveError(null);
    setState(reloadingState);

    void (async () => {
      const next = await loadFavoritesState(loadFavorites);
      if (!loadGuard.isLatest(requestId)) {
        return;
      }
      savedFavorites.current = next.status === 'success' ? next.data : null;
      setState(next);
    })();
  }, [loadGuard]);

  function startWrite(): void {
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    loadGuard.cancelAll();
  }

  function endWrite(): void {
    isSavingRef.current = false;
    setIsSaving(false);
  }

  async function runReset(): Promise<void> {
    startWrite();
    const error = await resetStoredFavorites(saveFavorites);
    if (error === null) {
      savedFavorites.current = [];
      setState({ status: 'success', data: [], isRefreshing: false });
    } else {
      // The damaged value may still be stored, so the error state stays.
      setSaveError(error);
    }
    endWrite();
  }

  function resetFavorites(): void {
    if (!canResetFavorites(state, isSavingRef.current)) {
      return;
    }
    void runReset();
  }

  async function runSave(saved: Favorites, next: Favorites): Promise<void> {
    startWrite();

    const outcome = await saveFavoritesChange(saved, next, saveFavorites);

    savedFavorites.current = outcome.favorites;
    setState({ status: 'success', data: outcome.favorites, isRefreshing: false });
    setSaveError(outcome.error);
    endWrite();
  }

  function changeFavorites(change: (favorites: Favorites) => Favorites): void {
    const saved = savedFavorites.current;
    const next = planFavoritesChange(saved, isSavingRef.current, change);
    if (saved === null || next === null) {
      return;
    }
    void runSave(saved, next);
  }

  useEffect(() => {
    reload();
    // The screen is gone: ignore a read that is still running.
    return () => loadGuard.cancelAll();
  }, [loadGuard, reload]);

  return {
    state,
    isSaving,
    saveError,
    isFavorite: (location) => isFavoriteIn(state, location),
    addFavorite: (location) => changeFavorites((favorites) => addFavorite(favorites, location)),
    removeFavorite: (location) => changeFavorites((favorites) => removeFavorite(favorites, location)),
    toggleFavorite: (location) => changeFavorites((favorites) => toggleFavorite(favorites, location)),
    reload,
    canChange: canChangeFavorites(state, isSaving),
    resetFavorites,
  };
}
