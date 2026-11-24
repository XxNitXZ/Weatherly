import {
  DEFAULT_SETTINGS,
  REFRESH_INTERVAL_OPTIONS,
  TEMPERATURE_UNIT_OPTIONS,
  WIND_SPEED_UNIT_OPTIONS,
  type AppSettings,
  type RefreshIntervalMinutes,
  type TemperatureUnit,
  type WindSpeedUnit,
} from '../models/AppSettings';

/**
 * Display texts for the settings screen (W-10, NIT-247). Pure: the screen
 * only draws what this returns. English names, as everywhere in the app.
 */

/** One choosable value in a settings group. */
export type SettingOptionPresentation<Value> = {
  readonly value: Value;
  /** Short text on screen, e.g. "15 min", "°C", "km/h". */
  readonly label: string;
  /** Spoken in full, e.g. "15 minutes, default". */
  readonly accessibilityLabel: string;
  readonly isSelected: boolean;
  readonly isDefault: boolean;
};

export type SettingGroupPresentation<Value> = {
  readonly title: string;
  readonly options: ReadonlyArray<SettingOptionPresentation<Value>>;
};

export type SettingsPresentation = {
  readonly refreshInterval: SettingGroupPresentation<RefreshIntervalMinutes>;
  readonly temperatureUnit: SettingGroupPresentation<TemperatureUnit>;
  readonly windSpeedUnit: SettingGroupPresentation<WindSpeedUnit>;
};

/** Added to the label of the default option, so the default is always visible. */
export const DEFAULT_SUFFIX = 'default';

const TEMPERATURE_UNIT_TEXT: Readonly<Record<TemperatureUnit, { short: string; spoken: string }>> = {
  celsius: { short: '°C', spoken: 'Celsius' },
  fahrenheit: { short: '°F', spoken: 'Fahrenheit' },
};

const WIND_SPEED_UNIT_TEXT: Readonly<Record<WindSpeedUnit, { short: string; spoken: string }>> = {
  metresPerSecond: { short: 'm/s', spoken: 'metres per second' },
  kilometresPerHour: { short: 'km/h', spoken: 'kilometres per hour' },
};

export function presentSettings(settings: AppSettings): SettingsPresentation {
  return {
    refreshInterval: {
      title: 'Refresh weather every',
      options: REFRESH_INTERVAL_OPTIONS.map((minutes) =>
        option(minutes, `${minutes} min`, `${minutes} minutes`, settings.refreshIntervalMinutes, DEFAULT_SETTINGS.refreshIntervalMinutes),
      ),
    },
    temperatureUnit: {
      title: 'Temperature',
      options: TEMPERATURE_UNIT_OPTIONS.map((unit) =>
        option(unit, TEMPERATURE_UNIT_TEXT[unit].short, TEMPERATURE_UNIT_TEXT[unit].spoken, settings.temperatureUnit, DEFAULT_SETTINGS.temperatureUnit),
      ),
    },
    windSpeedUnit: {
      title: 'Wind speed',
      options: WIND_SPEED_UNIT_OPTIONS.map((unit) =>
        option(unit, WIND_SPEED_UNIT_TEXT[unit].short, WIND_SPEED_UNIT_TEXT[unit].spoken, settings.windSpeedUnit, DEFAULT_SETTINGS.windSpeedUnit),
      ),
    },
  };
}

function option<Value>(
  value: Value,
  label: string,
  spoken: string,
  selected: Value,
  defaultValue: Value,
): SettingOptionPresentation<Value> {
  const isDefault = value === defaultValue;
  return {
    value,
    label,
    accessibilityLabel: isDefault ? `${spoken}, ${DEFAULT_SUFFIX}` : spoken,
    isSelected: value === selected,
    isDefault,
  };
}
