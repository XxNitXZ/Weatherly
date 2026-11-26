import { DEFAULT_SETTINGS, type AppSettings } from '../../src/models/AppSettings';
import { parseStoredSettings, SETTINGS_SCHEMA_VERSION, toStoredSettings } from '../../src/parsers/settingsParser';

/**
 * Tests for the stored settings format (W-10; SPEC D-44). Reading never
 * throws: anything unusable falls back to the defaults, field by field.
 */

const CHANGED: AppSettings = {
  refreshIntervalMinutes: 60,
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'kilometresPerHour',
};

const STORED_CHANGED = {
  version: 1,
  refreshIntervalMinutes: 60,
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'kilometresPerHour',
};

describe('parseStoredSettings', () => {
  it('reads a valid stored value', () => {
    expect(parseStoredSettings(STORED_CHANGED)).toEqual(CHANGED);
  });

  it('gives the defaults when nothing is stored (first launch)', () => {
    expect(parseStoredSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it.each([null, 'settings', 42, [], [STORED_CHANGED]])('gives the defaults for a stored value that is not an object: %p', (json) => {
    expect(parseStoredSettings(json)).toEqual(DEFAULT_SETTINGS);
  });

  it.each([undefined, 0, 2, '1'])('gives the defaults for version %p, even when the fields look valid', (version) => {
    expect(parseStoredSettings({ ...STORED_CHANGED, version })).toEqual(DEFAULT_SETTINGS);
  });

  it('replaces only an invalid field with its default and keeps the others', () => {
    expect(parseStoredSettings({ ...STORED_CHANGED, refreshIntervalMinutes: 45 })).toEqual({
      ...CHANGED,
      refreshIntervalMinutes: 30,
    });
    expect(parseStoredSettings({ ...STORED_CHANGED, temperatureUnit: 'kelvin' })).toEqual({
      ...CHANGED,
      temperatureUnit: 'celsius',
    });
    expect(parseStoredSettings({ ...STORED_CHANGED, windSpeedUnit: null })).toEqual({
      ...CHANGED,
      windSpeedUnit: 'metresPerSecond',
    });
  });

  it('does not accept a number stored as text', () => {
    expect(parseStoredSettings({ ...STORED_CHANGED, refreshIntervalMinutes: '60' }).refreshIntervalMinutes).toBe(30);
  });

  it('replaces a missing field with its default', () => {
    const { windSpeedUnit: _missing, ...withoutWind } = STORED_CHANGED;
    expect(parseStoredSettings(withoutWind)).toEqual({ ...CHANGED, windSpeedUnit: 'metresPerSecond' });
  });

  it('ignores unknown extra fields', () => {
    expect(parseStoredSettings({ ...STORED_CHANGED, theme: 'dark' })).toEqual(CHANGED);
  });
});

describe('toStoredSettings', () => {
  it('writes the versioned format', () => {
    expect(toStoredSettings(CHANGED)).toEqual(STORED_CHANGED);
    expect(toStoredSettings(CHANGED).version).toBe(SETTINGS_SCHEMA_VERSION);
  });

  it.each([DEFAULT_SETTINGS, CHANGED])('is read back unchanged after a JSON round trip: %p', (settings) => {
    expect(parseStoredSettings(JSON.parse(JSON.stringify(toStoredSettings(settings))))).toEqual(settings);
  });
});
