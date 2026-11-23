import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { RootStackScreenProps } from '../../navigation/routes';
import { colors } from '../../theme/colors';
import { CONTENT_MAX_WIDTH, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatDayLabel } from '../../utils/forecastFormatting';
import { formatLocationDetails } from '../../utils/locationFormatting';

/**
 * Detail screen for one forecast day (W-07).
 *
 * Minimal version from US-04.01 (NIT-229): it shows which day and place were
 * opened, so navigation can be checked. US-04.02 and US-04.03 add the day's
 * weather. All data comes from the route params; the screen sends no request
 * (SPEC D-36). The native header shows the place name and the back button.
 */
export function DayDetailScreen({ route }: RootStackScreenProps<'DayDetail'>) {
  const { location, day, utcOffsetSeconds } = route.params;
  const dayLabel = formatDayLabel(day.dateEpochMs, utcOffsetSeconds);
  const locationDetails = formatLocationDetails(location);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="dark" />
      <Text style={styles.weekday} accessibilityRole="header">
        {dayLabel.weekdayLong}
      </Text>
      <Text style={styles.date}>{dayLabel.dateLong}</Text>
      {locationDetails !== undefined && <Text style={styles.details}>{locationDetails}</Text>}
    </ScrollView>
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
    gap: spacing.xs,
    padding: spacing.m,
  },
  weekday: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  date: {
    color: colors.text,
    fontSize: fontSize.body,
  },
  details: {
    color: colors.textMuted,
    fontSize: fontSize.body,
  },
});
