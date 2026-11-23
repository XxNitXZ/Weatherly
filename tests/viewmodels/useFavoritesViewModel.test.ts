import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError } from '../../src/models/AppError';
import type { Location } from '../../src/models/Location';
import { loadFavorites, saveFavorites } from '../../src/repositories/favoritesRepository';
import { addFavorite, removeFavorite, toggleFavorite } from '../../src/utils/favorites';
import {
  isFavoriteIn,
  loadFavoritesState,
  planFavoritesChange,
  reloadingState,
  saveFavoritesChange,
} from '../../src/viewmodels/useFavoritesViewModel';
import type { LoadState } from '../../src/viewmodels/loadState';

/**
 * Tests for the pure state rules of `useFavoritesViewModel` (W-08, SPEC D-39).
 * The hook itself needs a React renderer, which the project does not use
 * (SPEC Q21), so its rules are exported and tested here, like
 * `isRepeatedWeatherLoad`. The last block runs the rules against the real
 * repository on the AsyncStorage Jest mock.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Favorites = ReadonlyArray<Location>;

const LUND: Location = {
  name: 'Lund',
  region: 'Skåne län',
  country: 'Sverige',
  coordinates: { latitude: 55.70584, longitude: 13.19321 },
};

const KIRUNA: Location = {
  name: 'Kiruna',
  region: 'Norrbottens län',
  country: 'Sverige',
  coordinates: { latitude: 67.85572, longitude: 20.22513 },
};

const TYPED_LUND: Location = {
  name: '55.7058, 13.1932',
  coordinates: { latitude: 55.7058, longitude: 13.1932 },
};

function success(data: Favorites): LoadState<Favorites> {
  return { status: 'success', data, isRefreshing: false };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('loadFavoritesState', () => {
  it('maps an empty first-launch list to success, not an error', async () => {
    await expect(loadFavoritesState(async () => [])).resolves.toEqual(success([]));
  });

  it('maps the loaded favorites to success', async () => {
    await expect(loadFavoritesState(async () => [LUND, KIRUNA])).resolves.toEqual(success([LUND, KIRUNA]));
  });

  it.each(['storage', 'parse'] as const)('maps an AppError(%s) to error with the same kind', async (kind) => {
    const state = await loadFavoritesState(async () => {
      throw new AppError(kind, 'failed');
    });

    expect(state.status).toBe('error');
    expect(state.status === 'error' && state.error.kind).toBe(kind);
  });

  it('maps anything else to error of kind unknown, and never rejects', async () => {
    const state = await loadFavoritesState(async () => {
      throw new TypeError('bug');
    });

    expect(state.status === 'error' && state.error.kind).toBe('unknown');
  });
});

describe('reloadingState', () => {
  it('keeps a shown list visible while it is read again', () => {
    expect(reloadingState(success([LUND]))).toEqual({ status: 'success', data: [LUND], isRefreshing: true });
  });

  it('keeps a list shown after a failed refresh', () => {
    const error = new AppError('storage', 'failed');

    expect(reloadingState({ status: 'refreshFailed', data: [LUND], error, isRefreshing: false })).toEqual({
      status: 'refreshFailed',
      data: [LUND],
      error,
      isRefreshing: true,
    });
  });

  it.each([
    ['idle', { status: 'idle' } as const],
    ['loading', { status: 'loading' } as const],
    ['error', { status: 'error', error: new AppError('parse', 'damaged') } as const],
  ])('shows loading when there is no list (%s)', (_label, state) => {
    expect(reloadingState(state)).toEqual({ status: 'loading' });
  });
});

describe('planFavoritesChange', () => {
  it('returns the list to save for an add, newest first', () => {
    const next = planFavoritesChange([KIRUNA], false, (favorites) => addFavorite(favorites, LUND));

    expect(next).toEqual([LUND, KIRUNA]);
  });

  it('returns the list to save for a remove', () => {
    expect(planFavoritesChange([LUND, KIRUNA], false, (favorites) => removeFavorite(favorites, LUND))).toEqual([
      KIRUNA,
    ]);
  });

  it('writes nothing for a duplicate add, also under another name', () => {
    expect(planFavoritesChange([LUND], false, (favorites) => addFavorite(favorites, LUND))).toBeNull();
    expect(planFavoritesChange([LUND], false, (favorites) => addFavorite(favorites, TYPED_LUND))).toBeNull();
  });

  it('writes nothing when removing a place that is not a favorite', () => {
    expect(planFavoritesChange([KIRUNA], false, (favorites) => removeFavorite(favorites, LUND))).toBeNull();
  });

  it('writes nothing while another write is running (rapid repeated taps)', () => {
    const change = jest.fn((favorites: Favorites) => toggleFavorite(favorites, LUND));

    expect(planFavoritesChange([KIRUNA], true, change)).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });

  it('writes nothing before the favorites were read, so damaged storage is not overwritten', () => {
    const change = jest.fn((favorites: Favorites) => addFavorite(favorites, LUND));

    expect(planFavoritesChange(null, false, change)).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });

  it('does not change the saved list', () => {
    const saved: Favorites = Object.freeze([KIRUNA]);

    planFavoritesChange(saved, false, (favorites) => addFavorite(favorites, LUND));

    expect(saved).toEqual([KIRUNA]);
  });
});

describe('saveFavoritesChange', () => {
  it('makes the new list authoritative once the write is confirmed', async () => {
    const save = jest.fn(async () => undefined);

    const outcome = await saveFavoritesChange([KIRUNA], [LUND, KIRUNA], save);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith([LUND, KIRUNA]);
    expect(outcome).toEqual({ favorites: [LUND, KIRUNA], error: null });
  });

  it('keeps the last saved list and returns the error when the write fails', async () => {
    const outcome = await saveFavoritesChange([KIRUNA], [LUND, KIRUNA], async () => {
      throw new AppError('storage', 'disk full');
    });

    expect(outcome.favorites).toEqual([KIRUNA]);
    expect(outcome.error?.kind).toBe('storage');
  });

  it('maps a failure that is not an AppError to kind unknown, and never rejects', async () => {
    const outcome = await saveFavoritesChange([KIRUNA], [], async () => {
      throw new Error('bug');
    });

    expect(outcome).toEqual({ favorites: [KIRUNA], error: expect.any(AppError) });
    expect(outcome.error?.kind).toBe('unknown');
  });

  it('does not report success before the write is confirmed', async () => {
    let confirmWrite: () => void = () => undefined;
    const save = () => new Promise<void>((resolve) => (confirmWrite = resolve));
    let outcomeFavorites: Favorites | undefined;

    const saving = saveFavoritesChange([KIRUNA], [LUND, KIRUNA], save).then((outcome) => {
      outcomeFavorites = outcome.favorites;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(outcomeFavorites).toBeUndefined();

    confirmWrite();
    await saving;
    expect(outcomeFavorites).toEqual([LUND, KIRUNA]);
  });
});

describe('isFavoriteIn', () => {
  it('is false while loading and after a failed read', () => {
    expect(isFavoriteIn({ status: 'loading' }, LUND)).toBe(false);
    expect(isFavoriteIn({ status: 'error', error: new AppError('parse', 'damaged') }, LUND)).toBe(false);
  });

  it('is true for a saved place, also when entered as coordinates within the tolerance', () => {
    expect(isFavoriteIn(success([LUND]), LUND)).toBe(true);
    expect(isFavoriteIn(success([LUND]), TYPED_LUND)).toBe(true);
  });

  it('is false for a place that is not saved', () => {
    expect(isFavoriteIn(success([LUND]), KIRUNA)).toBe(false);
  });
});

describe('the rules with the real repository', () => {
  /** One user action, the way the hook runs it: plan, then save. */
  async function act(saved: Favorites, change: (favorites: Favorites) => Favorites): Promise<Favorites> {
    const next = planFavoritesChange(saved, false, change);
    if (next === null) {
      return saved;
    }
    return (await saveFavoritesChange(saved, next, saveFavorites)).favorites;
  }

  it('adds, toggles and removes, and storage always matches the state', async () => {
    await expect(loadFavoritesState(loadFavorites)).resolves.toEqual(success([]));

    let favorites = await act([], (list) => addFavorite(list, KIRUNA));
    favorites = await act(favorites, (list) => addFavorite(list, LUND));
    favorites = await act(favorites, (list) => addFavorite(list, TYPED_LUND)); // duplicate
    expect(favorites).toEqual([LUND, KIRUNA]);
    await expect(loadFavorites()).resolves.toEqual(favorites);

    favorites = await act(favorites, (list) => toggleFavorite(list, LUND));
    expect(favorites).toEqual([KIRUNA]);
    await expect(loadFavorites()).resolves.toEqual(favorites);

    favorites = await act(favorites, (list) => removeFavorite(list, KIRUNA));
    expect(favorites).toEqual([]);
    await expect(loadFavorites()).resolves.toEqual([]);
  });

  it('writes only once for repeated identical adds', async () => {
    let favorites: Favorites = [];
    for (let tap = 0; tap < 5; tap += 1) {
      favorites = await act(favorites, (list) => addFavorite(list, LUND));
    }

    expect(favorites).toEqual([LUND]);
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('stays consistent with storage after a failed write, and the next change still works', async () => {
    const saved = await act([], (list) => addFavorite(list, KIRUNA));
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));

    const next = planFavoritesChange(saved, false, (list) => addFavorite(list, LUND));
    const failed = await saveFavoritesChange(saved, next ?? saved, saveFavorites);

    expect(failed.error?.kind).toBe('storage');
    expect(failed.favorites).toEqual([KIRUNA]);
    await expect(loadFavorites()).resolves.toEqual(failed.favorites);

    const retried = await act(failed.favorites, (list) => addFavorite(list, LUND));
    expect(retried).toEqual([LUND, KIRUNA]);
    await expect(loadFavorites()).resolves.toEqual([LUND, KIRUNA]);
  });

  it('maps damaged storage to an error state and leaves the stored text untouched', async () => {
    await AsyncStorage.setItem('weatherly:favorites', '{"version":7}');

    const state = await loadFavoritesState(loadFavorites);

    expect(state.status === 'error' && state.error.kind).toBe('parse');
    // The hook keeps no saved list after a failed read, so no change is planned.
    expect(planFavoritesChange(null, false, (list) => addFavorite(list, LUND))).toBeNull();
    await expect(AsyncStorage.getItem('weatherly:favorites')).resolves.toBe('{"version":7}');
  });
});
