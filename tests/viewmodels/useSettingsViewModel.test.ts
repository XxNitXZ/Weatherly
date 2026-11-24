import { DEFAULT_SETTINGS, type AppSettings } from '../../src/models/AppSettings';
import { applySettingsChange } from '../../src/viewmodels/useSettingsViewModel';

/**
 * Tests for the pure part of the settings ViewModel (SPEC D-44). The hook and
 * provider need a React renderer and are checked on the simulator (SPEC Q21).
 */

// The ViewModel module imports the repository, which imports AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('applySettingsChange', () => {
  it('replaces only the changed field', () => {
    expect(applySettingsChange(DEFAULT_SETTINGS, { temperatureUnit: 'fahrenheit' })).toEqual({
      refreshIntervalMinutes: 30,
      temperatureUnit: 'fahrenheit',
      windSpeedUnit: 'metresPerSecond',
    });
  });

  it('can change several fields at once', () => {
    const changed: AppSettings = { refreshIntervalMinutes: 15, temperatureUnit: 'fahrenheit', windSpeedUnit: 'kilometresPerHour' };
    expect(applySettingsChange(DEFAULT_SETTINGS, changed)).toEqual(changed);
  });

  it('does not modify the current settings', () => {
    const current: AppSettings = { ...DEFAULT_SETTINGS };
    applySettingsChange(current, { refreshIntervalMinutes: 60 });
    expect(current).toEqual(DEFAULT_SETTINGS);
  });
});
