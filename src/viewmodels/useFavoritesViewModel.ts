import { useEffect, useRef, useState } from 'react';
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
  /** Reads the favorites from storage again, e.g. after another screen changed them. */
  readonly reload: () => void;
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
 * ViewModel for the favorite places (W-08; SPEC D-39). Restores the saved
 * favorites when it is first used, and saves every change before showing it.
 *
 * Rules:
 * - **Storage decides.** The list shown is always the one storage last
 *   confirmed. A change appears only after its write has succeeded; a failed
 *   write keeps the earlier list and sets `saveError`.
 * - **One write at a time.** Changes while a write runs are ignored
 *   (`isSaving`), so rapid repeated taps cannot interleave two writes.
 * - **Damaged storage is kept.** After a failed read, changes are ignored, so
 *   the stored value is not replaced by an empty or partial list.
 * - A write makes any read still running outdated (`createLatestRequestGuard`),
 *   so an older read cannot replace the list just saved. `reload` is ignored
 *   while a write runs.
 *
 * Each screen that calls this hook has its own copy of the list, so a screen
 * calls `reload` when another screen may have changed the favorites. No
 * global state (SPEC D-10). Navigation stays in the screens (STYLE.md §3.3).
 */
export function useFavoritesViewModel(): FavoritesViewModel {
  const [state, setState] = useState<LoadState<Favorites>>({ status: 'loading' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<AppError | null>(null);
  const [loadGuard] = useState(createLatestRequestGuard);
  // The list storage last confirmed; null until a read succeeds and after a failed read.
  const savedFavorites = useRef<Favorites | null>(null);
  // A ref as well as state: two taps within one render must both see the running write.
  const isSavingRef = useRef(false);

  async function runLoad(requestId: number): Promise<void> {
    const next = await loadFavoritesState(loadFavorites);
    if (!loadGuard.isLatest(requestId)) {
      return;
    }
    savedFavorites.current = next.status === 'success' ? next.data : null;
    setState(next);
  }

  function reload(): void {
    if (isSavingRef.current) {
      return;
    }
    const requestId = loadGuard.start();
    setSaveError(null);
    setState(reloadingState);
    void runLoad(requestId);
  }

  async function runSave(saved: Favorites, next: Favorites): Promise<void> {
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    loadGuard.cancelAll();

    const outcome = await saveFavoritesChange(saved, next, saveFavorites);

    savedFavorites.current = outcome.favorites;
    setState({ status: 'success', data: outcome.favorites, isRefreshing: false });
    setSaveError(outcome.error);
    isSavingRef.current = false;
    setIsSaving(false);
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
    // Runs once per mount; `reload` only uses refs and stable setters.
  }, [loadGuard]);

  return {
    state,
    isSaving,
    saveError,
    isFavorite: (location) => isFavoriteIn(state, location),
    addFavorite: (location) => changeFavorites((favorites) => addFavorite(favorites, location)),
    removeFavorite: (location) => changeFavorites((favorites) => removeFavorite(favorites, location)),
    toggleFavorite: (location) => changeFavorites((favorites) => toggleFavorite(favorites, location)),
    reload,
  };
}
