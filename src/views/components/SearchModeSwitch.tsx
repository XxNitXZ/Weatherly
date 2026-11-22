import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';

/** How the user looks for a place: by name (W-01) or by coordinates (W-03). */
export type SearchMode = 'city' | 'coordinates';

const MODE_LABELS: ReadonlyArray<{ readonly mode: SearchMode; readonly label: string }> = [
  { mode: 'city', label: 'Place name' },
  { mode: 'coordinates', label: 'Coordinates' },
];

export type SearchModeSwitchProps = {
  readonly mode: SearchMode;
  readonly onChangeMode: (mode: SearchMode) => void;
};

/** Two tabs that switch between place-name and coordinate search. Presentational. */
export function SearchModeSwitch({ mode, onChangeMode }: SearchModeSwitchProps) {
  return (
    <View style={styles.switch} accessibilityRole="tablist">
      {MODE_LABELS.map(({ mode: tabMode, label }) => {
        const isSelected = tabMode === mode;
        return (
          <Pressable
            key={tabMode}
            accessibilityRole="tab"
            accessibilityLabel={`Search by ${label.toLowerCase()}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChangeMode(tabMode)}
            style={[styles.tab, isSelected && styles.tabSelected]}
          >
            <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.s,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  tabTextSelected: {
    color: colors.onPrimary,
  },
});
