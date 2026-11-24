import {
  DEFAULT_SETTINGS,
  REFRESH_INTERVAL_OPTIONS,
  TEMPERATURE_UNIT_OPTIONS,
  WIND_SPEED_UNIT_OPTIONS,
  type AppSettings,
} from '../../src/models/AppSettings';
import { presentSettings, type SettingGroupPresentation } from '../../src/utils/settingsPresentation';

/**
 * Tests for the settings screen texts (W-10, NIT-247): which option is
 * selected, which is marked as the default, and what screen readers hear.
 */

function selectedValues<Value>(group: SettingGroupPresentation<Value>): ReadonlyArray<Value> {
  return group.options.filter((option) => option.isSelected).map((option) => option.value);
}

const CHANGED: AppSettings = {
  refreshIntervalMinutes: 60,
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'kilometresPerHour',
};

describe('settings options and defaults', () => {
  it('offer every default value, so the default can always be shown and chosen', () => {
    expect(REFRESH_INTERVAL_OPTIONS).toContain(DEFAULT_SETTINGS.refreshIntervalMinutes);
    expect(TEMPERATURE_UNIT_OPTIONS).toContain(DEFAULT_SETTINGS.temperatureUnit);
    expect(WIND_SPEED_UNIT_OPTIONS).toContain(DEFAULT_SETTINGS.windSpeedUnit);
  });

  it('are 30 minutes, Celsius and metres per second by default', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      refreshIntervalMinutes: 30,
      temperatureUnit: 'celsius',
      windSpeedUnit: 'metresPerSecond',
    });
  });
});

describe('presentSettings', () => {
  it('presents the defaults with titles, short labels and the default marked', () => {
    const settings = presentSettings(DEFAULT_SETTINGS);

    expect(settings.refreshInterval.title).toBe('Refresh weather every');
    expect(settings.refreshInterval.options).toEqual([
      { value: 15, label: '15 min', accessibilityLabel: '15 minutes', isSelected: false, isDefault: false },
      { value: 30, label: '30 min', accessibilityLabel: '30 minutes, default', isSelected: true, isDefault: true },
      { value: 60, label: '60 min', accessibilityLabel: '60 minutes', isSelected: false, isDefault: false },
    ]);
    expect(settings.temperatureUnit.title).toBe('Temperature');
    expect(settings.temperatureUnit.options.map((option) => option.label)).toEqual(['°C', '°F']);
    expect(settings.windSpeedUnit.title).toBe('Wind speed');
    expect(settings.windSpeedUnit.options.map((option) => option.label)).toEqual(['m/s', 'km/h']);
  });

  it('selects exactly one option per group, for the defaults and for changed settings', () => {
    [DEFAULT_SETTINGS, CHANGED].forEach((values) => {
      const settings = presentSettings(values);
      expect(selectedValues(settings.refreshInterval)).toEqual([values.refreshIntervalMinutes]);
      expect(selectedValues(settings.temperatureUnit)).toEqual([values.temperatureUnit]);
      expect(selectedValues(settings.windSpeedUnit)).toEqual([values.windSpeedUnit]);
    });
  });

  it('keeps the default marked on the default option when another one is selected', () => {
    const temperature = presentSettings(CHANGED).temperatureUnit.options;

    expect(temperature).toEqual([
      { value: 'celsius', label: '°C', accessibilityLabel: 'Celsius, default', isSelected: false, isDefault: true },
      { value: 'fahrenheit', label: '°F', accessibilityLabel: 'Fahrenheit', isSelected: true, isDefault: false },
    ]);
  });

  it('spells the units out for screen readers', () => {
    const wind = presentSettings(DEFAULT_SETTINGS).windSpeedUnit.options;
    expect(wind.map((option) => option.accessibilityLabel)).toEqual([
      'metres per second, default',
      'kilometres per hour',
    ]);
  });
});
