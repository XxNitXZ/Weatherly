import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '../../navigation/routes';
import { skyBaseColor, skyColors, skyGradient } from '../../theme/sky';
import { CONTENT_MAX_WIDTH, spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { formatLocationDetails } from '../../utils/locationFormatting';
import { DayDetailHero } from '../components/DayDetailHero';

/**
 * Detail screen for one forecast day (W-07).
 *
 * All data comes from the route params; the screen sends no request and
 * needs no ViewModel, because it has no state of its own (SPEC D-36). The
 * components turn the day into texts through pure presenters.
 *
 * Layout (NIT-232): the day sky of the home screen (SPEC D-33) under a
 * native header in the same colour, which shows the place name and the
 * back button. A future day has no day/night state, so the day sky is
 * always used. The content scrolls as one and keeps the home screen's
 * maximum width. Only the bottom safe area is applied, because the header
 * covers the top.
 *
 * The hero shows the date, condition and high/low (NIT-233), with the
 * place below it. US-04.02 adds the sun card (NIT-234); US-04.03 adds wind
 * and precipitation.
 */
export function DayDetailScreen({ route }: RootStackScreenProps<'DayDetail'>) {
  const { location, day, utcOffsetSeconds } = route.params;
  const locationDetails = formatLocationDetails(location);

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <DayDetailHero day={day} utcOffsetSeconds={utcOffsetSeconds} />
        {locationDetails !== undefined && <Text style={styles.details}>{locationDetails}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: skyBaseColor.day,
    backgroundImage: skyGradient.day,
  },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.xl,
  },
  details: {
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
