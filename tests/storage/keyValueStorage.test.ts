import AsyncStorage from '@react-native-async-storage/async-storage';
import { readJson, writeJson } from '../../src/storage/keyValueStorage';
import { expectAppError } from '../helpers/fakeFetch';

/**
 * Tests for `keyValueStorage`, the only module that imports AsyncStorage
 * (SPEC D-08). AsyncStorage is replaced by the in-memory Jest mock that ships
 * with the package, so no device storage is needed.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'weatherly:test';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('readJson', () => {
  it('returns undefined when nothing is stored under the key', async () => {
    await expect(readJson(KEY)).resolves.toBeUndefined();
  });

  it('returns the parsed JSON value', async () => {
    await AsyncStorage.setItem(KEY, '{"version":1,"favorites":[]}');

    await expect(readJson(KEY)).resolves.toEqual({ version: 1, favorites: [] });
  });

  it('reports stored text that is not JSON as a parse error', async () => {
    await AsyncStorage.setItem(KEY, '{"version":1,"favorites":[');

    const error = await expectAppError(readJson(KEY), 'parse');

    expect(error.message).toContain(KEY);
  });

  it('reports a failing read as a storage error', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('database is locked'));

    const error = await expectAppError(readJson(KEY), 'storage');

    expect(error.message).toContain(KEY);
    expect(error.message).toContain('database is locked');
  });
});

describe('writeJson', () => {
  it('stores the value as JSON text under the key', async () => {
    await writeJson(KEY, { version: 1, favorites: [] });

    await expect(AsyncStorage.getItem(KEY)).resolves.toBe('{"version":1,"favorites":[]}');
  });

  it('replaces an earlier value', async () => {
    await writeJson(KEY, { a: 1 });
    await writeJson(KEY, { b: 2 });

    await expect(readJson(KEY)).resolves.toEqual({ b: 2 });
  });

  it('reports a failing write as a storage error and leaves the earlier value', async () => {
    await writeJson(KEY, { a: 1 });
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));

    const error = await expectAppError(writeJson(KEY, { b: 2 }), 'storage');

    expect(error.message).toContain('disk full');
    await expect(readJson(KEY)).resolves.toEqual({ a: 1 });
  });

  it('resolves only after AsyncStorage has confirmed the write', async () => {
    let confirmWrite: () => void = () => undefined;
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(
      () => new Promise<void>((resolve) => (confirmWrite = resolve)),
    );
    let isDone = false;

    const writing = writeJson(KEY, { a: 1 }).then(() => {
      isDone = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(isDone).toBe(false);

    confirmWrite();
    await writing;
    expect(isDone).toBe(true);
  });
});
