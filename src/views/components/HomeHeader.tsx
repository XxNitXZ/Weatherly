import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Location } from '../../models/Location';
import { skyColors } from '../../theme/sky';
import { MIN_TOUCH_TARGET, iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatCoordinates, formatLocationDetails } from '../../utils/locationFormatting';

/** The favorite star for the selected place. The screen gets every value from `useFavoritesViewModel`. */
export type FavoriteToggle = {
  readonly isFavorite: boolean;
  /** True while favorites are saved or read, or could not be read. */
  readonly isDisabled: boolean;
  readonly onToggle: () => void;
};

export type HomeHeaderProps = {
  /** The selected place, or `null` before the first search. */
  readonly location: Location | null;
  /** The star for `location`; leave out when no place is selected. */
  readonly favorite?: FavoriteToggle;
  readonly onPressFavorites: () => void;
  readonly onPressSearch: () => void;
  readonly onPressSettings: () => void;
};

/** The icon and screen-reader texts of the favorite star. */
export type FavoriteTogglePresentation = {
  readonly icon: 'star' | 'star-outline';
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
};

/**
 * The star for a place (NIT-239): filled when it is a favorite, outlined when
 * not. The label says what a tap will do, with the place's name, so a screen
 * reader user hears e.g. "Add Lund to favourites".
 */
export function presentFavoriteToggle(
  placeName: string,
  isFavorite: boolean,
  isDisabled: boolean,
): FavoriteTogglePresentation {
  return {
    icon: isFavorite ? 'star' : 'star-outline',
    accessibilityLabel: isFavorite ? `Remove ${placeName} from favourites` : `Add ${placeName} to favourites`,
    accessibilityHint: isDisabled ? 'Favourites are not available right now' : undefined,
  };
}

/**
 * The top of the home screen (SPEC D-33): the selected place as the title,
 * its region and country (or coordinates) underneath, then compact buttons:
 * the favorite star for the selected place (only when a place is selected),
 * the favorites list, search and settings. Before a place is chosen, the app name is
 * shown. Presentational: the screen and its ViewModels decide what a tap does.
 */
export function HomeHeader({ location, favorite, onPressFavorites, onPressSearch, onPressSettings }: HomeHeaderProps) {
  const subtitle =
    location === null
      ? undefined
      : formatLocationDetails(location) ?? formatCoordinates(location.coordinates);
  const star =
    location !== null && favorite !== undefined
      ? presentFavoriteToggle(location.name, favorite.isFavorite, favorite.isDisabled)
      : undefined;

  return (
    <View style={styles.header}>
      <View style={styles.titles} accessible accessibilityRole="header">
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {location === null ? 'Weatherly' : location.name}
        </Text>
        {subtitle !== undefined && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.buttons}>
        {star !== undefined && favorite !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={star.accessibilityLabel}
            accessibilityHint={star.accessibilityHint}
            accessibilityState={{ selected: favorite.isFavorite, disabled: favorite.isDisabled }}
            disabled={favorite.isDisabled}
            onPress={favorite.onToggle}
            hitSlop={spacing.xs}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
              favorite.isDisabled && styles.iconButtonDisabled,
            ]}
          >
            <MaterialCommunityIcons name={star.icon} size={iconSize.s} color={skyColors.onSky} />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Favourites"
          accessibilityHint="Opens your saved places"
          onPress={onPressFavorites}
          hitSlop={spacing.xs}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <MaterialCommunityIcons name="star-box-multiple-outline" size={iconSize.s} color={skyColors.onSky} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search for a place"
          accessibilityHint="Opens search by place name or coordinates"
          onPress={onPressSearch}
          hitSlop={spacing.xs}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <MaterialCommunityIcons name="magnify" size={iconSize.s} color={skyColors.onSky} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          accessibilityHint="Opens refresh and unit settings"
          onPress={onPressSettings}
          hitSlop={spacing.xs}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <MaterialCommunityIcons name="cog-outline" size={iconSize.s} color={skyColors.onSky} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.s,
  },
  titles: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: skyColors.onSky,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
  },
  buttons: {
    flexDirection: 'row',
    // Wide enough apart that the buttons' enlarged touch areas (hitSlop) do not overlap.
    gap: spacing.s,
  },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: skyColors.card,
    borderWidth: 1,
    borderColor: skyColors.cardBorder,
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
});
