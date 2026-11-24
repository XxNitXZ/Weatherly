import { StatusBar } from 'expo-status-bar';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_SETTINGS } from '../../models/AppSettings';
import { colors } from '../../theme/colors';
import { CONTENT_MAX_WIDTH, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { presentSettings, type SettingGroupPresentation } from '../../utils/settingsPresentation';
import { SettingOptionRow } from '../components/SettingOptionRow';

/**
 * The settings screen (W-10, NIT-247): how often the weather is refreshed
 * (W-11) and the temperature and wind-speed units (W-12). Pushed onto the
 * stack from the gear button on Home, with the native header "Settings",
 * in the same light style as the favourites screen.
 *
 * NIT-247 shows the defaults; the options cannot be chosen yet. NIT-248 adds
 * the stored settings and choosing.
 */
export function SettingsScreen() {
  const settings = presentSettings(DEFAULT_SETTINGS);

  return (
    // The native header already keeps clear of the status bar and the notch.
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingGroup group={settings.refreshInterval} />
        <SettingGroup group={settings.temperatureUnit} />
        <SettingGroup group={settings.windSpeedUnit} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingGroup<Value>({ group }: { readonly group: SettingGroupPresentation<Value> }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle} accessibilityRole="header">
        {group.title}
      </Text>
      <View style={styles.card} accessibilityRole="radiogroup">
        {group.options.map((option, index) => (
          <Fragment key={String(option.value)}>
            {index > 0 && <View style={styles.separator} />}
            <SettingOptionRow option={option} />
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
