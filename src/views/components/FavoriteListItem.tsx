import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Location } from '../../models/Location';
import { colors } from '../../theme/colors';
import { interaction } from '../../theme/interaction';
import { MIN_TOUCH_TARGET, iconSize, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatCoordinates, formatLocationDetails } from '../../utils/locationFormatting';

/** The texts of one favorite row. */
export type FavoriteItemPresentation = {
  readonly title: string;
  /** Region and country, or the coordinates when the place has neither. */
  readonly subtitle: string;
  readonly selectLabel: string;
  readonly removeLabel: string;
};

/**
 * The texts for one saved place (W-09): its name, then region and country
 * like the home header and search results, or its coordinates as a fallback
 * (a place entered as coordinates has no region or country).
 */
export function presentFavoriteItem(location: Location): FavoriteItemPresentation {
  const subtitle = formatLocationDetails(location) ?? formatCoordinates(location.coordinates);
  return {
    title: location.name,
    subtitle,
    selectLabel: `${location.name}, ${subtitle}`,
    removeLabel: `Remove ${location.name} from favourites`,
  };
}

export type FavoriteListItemProps = {
  readonly location: Location;
  /** False while the favorites are saved or read, so a second change cannot start. */
  readonly canRemove: boolean;
  readonly onSelect: (location: Location) => void;
  readonly onRemove: (location: Location) => void;
};

/**
 * One saved place on the favorites screen: tapping the row shows its weather
 * on the home screen; the bin button removes it. Presentational: the screen
 * and the ViewModel decide what happens.
 */
export function FavoriteListItem({ location, canRemove, onSelect, onRemove }: FavoriteListItemProps) {
  const item = presentFavoriteItem(location);

  return (
    <View style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.selectLabel}
        accessibilityHint="Shows the weather for this place"
        onPress={() => onSelect(location)}
        style={({ pressed }) => [styles.select, pressed && styles.pressed]}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.removeLabel}
        accessibilityState={{ disabled: !canRemove }}
        disabled={!canRemove}
        onPress={() => onRemove(location)}
        hitSlop={spacing.xs}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed, !canRemove && styles.disabled]}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={iconSize.s} color={colors.error} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingLeft: spacing.m,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    backgroundColor: colors.background,
  },
  select: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.s,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  remove: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: interaction.pressedOpacity,
  },
  disabled: {
    opacity: interaction.disabledOpacity,
  },
});
