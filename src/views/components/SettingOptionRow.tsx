import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { interaction } from '../../theme/interaction';
import { MIN_TOUCH_TARGET, iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { DEFAULT_SUFFIX, type SettingOptionPresentation } from '../../utils/settingsPresentation';

export type SettingOptionRowProps<Value> = {
  readonly option: SettingOptionPresentation<Value>;
  /** Leave out while the option cannot be chosen yet. */
  readonly onSelect?: (value: Value) => void;
};

/**
 * One choosable value in a settings group (W-10): the label on the left, a
 * muted "default" note on the default option, and a checkmark on the
 * selected one. Screen readers hear a radio button with its state, e.g.
 * "Celsius, default, radio button, selected".
 *
 * Without `onSelect` (while the stored settings are read) the row is dimmed
 * and disabled, so it does not look tappable (NIT-270), and screen readers
 * hear "dimmed" or "disabled".
 */
export function SettingOptionRow<Value>({ option, onSelect }: SettingOptionRowProps<Value>) {
  const isDisabled = onSelect === undefined;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={option.accessibilityLabel}
      accessibilityState={{ checked: option.isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => onSelect?.(option.value)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, isDisabled && styles.rowDisabled]}
    >
      <View style={styles.texts}>
        <Text style={[styles.label, option.isSelected && styles.labelSelected]}>{option.label}</Text>
        {option.isDefault && <Text style={styles.default}>{DEFAULT_SUFFIX}</Text>}
      </View>
      {option.isSelected && (
        <MaterialCommunityIcons name="check" size={iconSize.s} color={colors.primary} accessibilityElementsHidden importantForAccessibility="no" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  rowPressed: {
    backgroundColor: colors.primarySubtle,
  },
  rowDisabled: {
    opacity: interaction.disabledOpacity,
  },
  texts: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: spacing.s,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.body,
  },
  labelSelected: {
    fontWeight: fontWeight.semibold,
  },
  default: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
});
