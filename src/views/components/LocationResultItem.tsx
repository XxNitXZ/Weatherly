import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Location } from '../../models/Location';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { interaction } from '../../theme/interaction';
import { formatLocationDetails } from '../../utils/locationFormatting';

export type LocationResultItemProps = {
  readonly location: Location;
  readonly isSelected: boolean;
  readonly onSelect: (location: Location) => void;
};

/**
 * One place-search result (W-01, W-02): the name plus region and country, so
 * same-named places can be told apart. Pressing it selects the place.
 */
export function LocationResultItem({ location, isSelected, onSelect }: LocationResultItemProps) {
  const details = formatLocationDetails(location);
  const label = details === undefined ? location.name : `${location.name}, ${details}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Selects this place"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(location)}
      style={({ pressed }) => [
        styles.item,
        isSelected && styles.itemSelected,
        pressed && styles.itemPressed,
      ]}
    >
      <View style={styles.texts}>
        <Text style={styles.name}>{location.name}</Text>
        {details !== undefined && <Text style={styles.details}>{details}</Text>}
      </View>
      {isSelected && <Text style={styles.selectedMark}>Selected</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    backgroundColor: colors.background,
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  itemPressed: {
    opacity: interaction.pressedOpacity,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  details: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  selectedMark: {
    color: colors.primary,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
});
