import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, type AppSettings } from '../../src/models/AppSettings';
import { loadSettings, saveSettings, SETTINGS_STORAGE_KEY } from '../../src/repositories/settingsRepository';
import { expectAppError } from '../helpers/fakeFetch';

/**
 * Tests for `settingsRepository` (W-10; SPEC D-44): parser + storage, with the
 * real `keyValueStorage` on top of the in-memory AsyncStorage Jest mock. The
 * storage outlives each call, so "save, then load" is what a restart does.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const CHANGED: AppSettings = {
  refreshIntervalMinutes: 60,
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'kilometresPerHour',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('settingsRepository', () => {
  it('gives the defaults when nothing has been saved (first launch)', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('reads back what was saved, as after a restart', async () => {
    await saveSettings(CHANGED);
    await expect(loadSettings()).resolves.toEqual(CHANGED);
  });

  it('stores the versioned format under its own key', async () => {
    await saveSettings(CHANGED);
    const text = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(JSON.parse(text ?? 'null')).toEqual({ version: 1, ...CHANGED });
  });

  it('gives the defaults when the stored text is not JSON', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, '{ not json');
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('throws a storage error when the device storage cannot be read', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('database is locked'));
    await expectAppError(loadSettings(), 'storage');
  });

  it('throws a storage error when saving fails, and keeps the earlier value', async () => {
    await saveSettings(CHANGED);
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));

    await expectAppError(saveSettings(DEFAULT_SETTINGS), 'storage');
    await expect(loadSettings()).resolves.toEqual(CHANGED);
  });

  it('stores two quick saves in the order they were made, so the last choice wins', async () => {
    const realSetItem = jest.mocked(AsyncStorage.setItem).getMockImplementation();
    // The first write is slow; without ordering, it would finish last.
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await realSetItem?.(key, value);
    });

    const first = saveSettings({ ...DEFAULT_SETTINGS, temperatureUnit: 'fahrenheit' });
    const second = saveSettings(CHANGED);
    await Promise.all([first, second]);

    await expect(loadSettings()).resolves.toEqual(CHANGED);
  });
});
