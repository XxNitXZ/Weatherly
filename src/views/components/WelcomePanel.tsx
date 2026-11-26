import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { skyColors } from '../../theme/sky';
import { MIN_TOUCH_TARGET, iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { interaction } from '../../theme/interaction';

export type WelcomePanelProps = {
  readonly onPressSearch: () => void;
};

/**
 * Shown on first launch, before a place is chosen (SPEC D-33). Invites the
 * user to search; no location permission is needed or asked for.
 */
export function WelcomePanel({ onPressSearch }: WelcomePanelProps) {
  return (
    <View style={styles.panel}>
      <MaterialCommunityIcons
        name="weather-partly-cloudy"
        size={iconSize.hero}
        color={skyColors.onSky}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={styles.title} accessibilityRole="header">
        Weather for any place
      </Text>
      <Text style={styles.text}>
        Search by place name or enter coordinates to see the current weather, the rest of today and the next seven days.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search for a place"
        onPress={onPressSearch}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <MaterialCommunityIcons name="magnify" size={iconSize.s} color={skyColors.onSky} />
        <Text style={styles.buttonText}>Search for a place</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.m,
  },
  title: {
    color: skyColors.onSky,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  text: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.l,
    borderRadius: MIN_TOUCH_TARGET / 2,
    backgroundColor: skyColors.card,
    borderWidth: 1,
    borderColor: skyColors.cardBorder,
    marginTop: spacing.s,
  },
  buttonPressed: {
    opacity: interaction.pressedOpacity,
  },
  buttonText: {
    color: skyColors.onSky,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
