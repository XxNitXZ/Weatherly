import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Location } from '../../src/models/Location';
import {
  FAVORITES_STORAGE_KEY,
  loadFavorites,
  saveFavorites,
} from '../../src/repositories/favoritesRepository';
import { expectAppError, installFakeFetch, restoreFetch } from '../helpers/fakeFetch';

/**
 * Tests for `favoritesRepository` (W-08, SPEC D-38): parser + storage, with
 * the real `keyValueStorage` on top of the in-memory AsyncStorage Jest mock.
 * The storage outlives each call, so "save, then load" is what a restart of
 * the app does: the repository keeps nothing in memory.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const LUND: Location = {
  name: 'Lund',
  region: 'Skåne län',
  country: 'Sverige',
  coordinates: { latitude: 55.70584, longitude: 13.19321 },
};

const LUND_ENGLAND: Location = {
  name: 'Lund',
  region: 'England',
  country: 'Storbritannien',
  coordinates: { latitude: 53.9192, longitude: -0.52211 },
};

const TYPED_LUND: Location = {
  name: '55.7058, 13.1932',
  coordinates: { latitude: 55.7058, longitude: 13.1932 },
};

const TYPED_SYDNEY: Location = {
  name: '-33.8688, 151.2093',
  coordinates: { latitude: -33.8688, longitude: 151.2093 },
};

async function storedText(): Promise<string | null> {
  return AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  restoreFetch();
});

describe('FAVORITES_STORAGE_KEY', () => {
  it('is in the weatherly namespace', () => {
    expect(FAVORITES_STORAGE_KEY).toBe('weatherly:favorites');
  });
});

describe('loadFavorites', () => {
  it('returns an empty list on first launch', async () => {
    await expect(loadFavorites()).resolves.toEqual([]);
  });

  it('returns valid stored favorites, newest first', async () => {
    await AsyncStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        favorites: [
          { name: 'Lund', region: 'England', country: 'Storbritannien', coordinates: { latitude: 53.9192, longitude: -0.52211 } },
          { name: 'Lund', region: 'Skåne län', country: 'Sverige', coordinates: { latitude: 55.70584, longitude: 13.19321 } },
        ],
      }),
    );

    await expect(loadFavorites()).resolves.toEqual([LUND_ENGLAND, LUND]);
  });

  it('removes stored duplicates, keeping the entry saved first', async () => {
    await AsyncStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        favorites: [
          { name: '55.7058, 13.1932', coordinates: { latitude: 55.7058, longitude: 13.1932 } },
          { name: 'Lund', region: 'Skåne län', country: 'Sverige', coordinates: { latitude: 55.70584, longitude: 13.19321 } },
        ],
      }),
    );

    await expect(loadFavorites()).resolves.toEqual([LUND]);
  });

  it.each([
    ['malformed JSON', '{"version":1,"favorites":[{"name":"Lund"'],
    ['an unsupported version', JSON.stringify({ version: 2, favorites: [] })],
    ['a wrong top-level structure', JSON.stringify([{ name: 'Lund' }])],
    ['a missing field', JSON.stringify({ version: 1, favorites: [{ name: 'Lund' }] })],
    [
      'a coordinate out of range',
      JSON.stringify({ version: 1, favorites: [{ name: 'X', coordinates: { latitude: 91, longitude: 0 } }] }),
    ],
  ])('reports %s as a parse error and leaves the stored text untouched', async (_label, text) => {
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, text);

    await expectAppError(loadFavorites(), 'parse');

    await expect(storedText()).resolves.toBe(text);
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1); // only the test's own write
  });

  it('reports a failing read as a storage error', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('database is locked'));

    await expectAppError(loadFavorites(), 'storage');
  });
});

describe('saveFavorites', () => {
  it('writes versioned JSON under the favorites key', async () => {
    await saveFavorites([LUND, LUND_ENGLAND]);

    const text = await storedText();
    expect(text).not.toBeNull();
    expect(JSON.parse(text ?? '')).toEqual({
      version: 1,
      favorites: [
        { name: 'Lund', region: 'Skåne län', country: 'Sverige', coordinates: { latitude: 55.70584, longitude: 13.19321 } },
        { name: 'Lund', region: 'England', country: 'Storbritannien', coordinates: { latitude: 53.9192, longitude: -0.52211 } },
      ],
    });
  });

  it('writes an empty list as an empty versioned value', async () => {
    await saveFavorites([]);

    await expect(storedText()).resolves.toBe('{"version":1,"favorites":[]}');
  });

  it('removes duplicates before writing, keeping the entry saved first', async () => {
    await saveFavorites([TYPED_LUND, LUND]);

    await expect(loadFavorites()).resolves.toEqual([LUND]);
  });

  it('reports a failing write as a storage error and keeps the earlier favorites', async () => {
    await saveFavorites([LUND]);
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));

    await expectAppError(saveFavorites([LUND_ENGLAND, LUND]), 'storage');

    await expect(loadFavorites()).resolves.toEqual([LUND]);
  });
});

describe('restart persistence', () => {
  it('returns the saved favorites, newest first, in a later load (as after a restart)', async () => {
    await saveFavorites([LUND_ENGLAND, LUND, TYPED_SYDNEY]);

    const restored = await loadFavorites();

    expect(restored.map((favorite) => favorite.coordinates)).toEqual([
      { latitude: 53.9192, longitude: -0.52211 },
      { latitude: 55.70584, longitude: 13.19321 },
      { latitude: -33.8688, longitude: 151.2093 },
    ]);
    expect(restored[0]).toEqual(LUND_ENGLAND);
  });

  it('keeps exact coordinates and missing optional fields through a round trip', async () => {
    await saveFavorites([TYPED_LUND]);

    const [restored] = await loadFavorites();

    expect(restored.coordinates).toEqual({ latitude: 55.7058, longitude: 13.1932 });
    expect(restored.region).toBeUndefined();
    expect(restored.country).toBeUndefined();
  });

  it('recovers after a damaged value is replaced by an explicit save', async () => {
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, 'not json');
    await expectAppError(loadFavorites(), 'parse');

    await saveFavorites([LUND]);

    await expect(loadFavorites()).resolves.toEqual([LUND]);
  });
});

describe('network', () => {
  it('is never used for loading or saving favorites', async () => {
    const fetchMock = installFakeFetch();

    await saveFavorites([LUND]);
    await loadFavorites();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('order of reads and writes (SPEC D-40)', () => {
  it('lets a read started during a write wait for it, so the read sees the new list', async () => {
    await saveFavorites([LUND]);
    let confirmWrite: () => void = () => undefined;
    const realSetItem = jest.requireActual<typeof AsyncStorage>(
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
    ).setItem;
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(
      (key, value) =>
        new Promise<void>((resolve) => {
          confirmWrite = () => {
            void realSetItem(key, value).then(() => resolve());
          };
        }),
    );

    // The favourites screen removes Lund; Home comes back into view and reads.
    const writing = saveFavorites([LUND_ENGLAND]);
    const reading = loadFavorites();
    await Promise.resolve();
    await Promise.resolve();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();

    confirmWrite();
    await writing;
    await expect(reading).resolves.toEqual([LUND_ENGLAND]);
  });

  it('runs the next operation after a failed one', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));

    const failing = saveFavorites([LUND]);
    const next = saveFavorites([LUND_ENGLAND]);

    await expectAppError(failing, 'storage');
    await next;
    await expect(loadFavorites()).resolves.toEqual([LUND_ENGLAND]);
  });

  it('runs operations in the order they were started', async () => {
    const first = saveFavorites([LUND]);
    const second = saveFavorites([LUND_ENGLAND, LUND]);
    const read = loadFavorites();

    await Promise.all([first, second]);
    await expect(read).resolves.toEqual([LUND_ENGLAND, LUND]);
  });
});
