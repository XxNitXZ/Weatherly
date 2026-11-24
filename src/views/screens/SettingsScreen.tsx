import { StatusBar } from 'expo-status-bar';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { CONTENT_MAX_WIDTH, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { presentSettings, type SettingGroupPresentation } from '../../utils/settingsPresentation';
import { SETTINGS_SAVE_ERROR_MESSAGE, useSettingsViewModel } from '../../viewmodels/useSettingsViewModel';
import { SettingOptionRow } from '../components/SettingOptionRow';

/**
 * The settings screen (W-10, NIT-247): how often the weather is refreshed
 * (W-11) and the temperature and wind-speed units (W-12). Pushed onto the
 * stack from the gear button on Home, with the native header "Settings",
 * in the same light style as the favourites screen.
 *
 * The current settings come from the shared `useSettingsViewModel` (SPEC
 * D-44). A tap applies a choice at once and saves it in the background. The
 * options stay disabled until the stored settings have been read, so a
 * choice cannot be overwritten by the read finishing later.
 */
export function SettingsScreen() {
  const { settings: current, isLoaded, saveError, updateSettings } = useSettingsViewModel();
  const settings = presentSettings(current);

  return (
    // The native header already keeps clear of the status bar and the notch.
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        {saveError !== null && (
          <Text style={styles.saveError} accessibilityRole="alert">
            {SETTINGS_SAVE_ERROR_MESSAGE}
          </Text>
        )}
        <SettingGroup
          group={settings.refreshInterval}
          onSelect={isLoaded ? (refreshIntervalMinutes) => updateSettings({ refreshIntervalMinutes }) : undefined}
        />
        <SettingGroup
          group={settings.temperatureUnit}
          onSelect={isLoaded ? (temperatureUnit) => updateSettings({ temperatureUnit }) : undefined}
        />
        <SettingGroup
          group={settings.windSpeedUnit}
          onSelect={isLoaded ? (windSpeedUnit) => updateSettings({ windSpeedUnit }) : undefined}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingGroupProps<Value> = {
  readonly group: SettingGroupPresentation<Value>;
  /** Leave out while the options cannot be chosen yet. */
  readonly onSelect?: (value: Value) => void;
};

function SettingGroup<Value>({ group, onSelect }: SettingGroupProps<Value>) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle} accessibilityRole="header">
        {group.title}
      </Text>
      <View style={styles.card} accessibilityRole="radiogroup">
        {group.options.map((option, index) => (
          <Fragment key={String(option.value)}>
            {index > 0 && <View style={styles.separator} />}
            <SettingOptionRow option={option} onSelect={onSelect} />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.l,
    padding: spacing.m,
  },
  group: {
    gap: spacing.s,
  },
  saveError: {
    color: colors.error,
    fontSize: fontSize.body,
  },
  groupTitle: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.s,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.m,
  },
});
