import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Location } from '../../models/Location';
import { skyColors } from '../../theme/sky';
import { MIN_TOUCH_TARGET, iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatCoordinates, formatLocationDetails } from '../../utils/locationFormatting';

export type HomeHeaderProps = {
  /** The selected place, or `null` before the first search. */
  readonly location: Location | null;
  readonly onPressSearch: () => void;
};

/**
 * The top of the home screen (SPEC D-33): the selected place as the title,
 * its region and country (or coordinates) underneath, and a compact search
 * button. Before a place is chosen, the app name is shown.
 */
export function HomeHeader({ location, onPressSearch }: HomeHeaderProps) {
  const subtitle =
    location === null
      ? undefined
      : formatLocationDetails(location) ?? formatCoordinates(location.coordinates);

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search for a place"
        accessibilityHint="Opens search by place name or coordinates"
        onPress={onPressSearch}
        hitSlop={spacing.s}
        style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}
      >
        <MaterialCommunityIcons name="magnify" size={iconSize.s} color={skyColors.onSky} />
      </Pressable>
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
  searchButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: skyColors.card,
    borderWidth: 1,
    borderColor: skyColors.cardBorder,
  },
  searchButtonPressed: {
    opacity: 0.7,
  },
});
