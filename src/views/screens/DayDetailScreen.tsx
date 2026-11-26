import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '../../navigation/routes';
import { skyBaseColor, skyColors, skyGradient } from '../../theme/sky';
import { CONTENT_MAX_WIDTH, spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { presentDayConditions, presentSunTimes } from '../../utils/forecastFormatting';
import { formatLocationDetails } from '../../utils/locationFormatting';
import { screenLayoutFor } from '../../utils/screenLayout';
import { displayUnitsOf } from '../../utils/units';
import { useSettingsViewModel } from '../../viewmodels/useSettingsViewModel';
import { DayDetailHero } from '../components/DayDetailHero';
import { DetailRow } from '../components/DetailRow';
import { WeatherCard } from '../components/WeatherCard';

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
 * place below it (NIT-233), then the Precipitation, Wind and Sun cards
 * (NIT-234, NIT-236; SPEC D-42, D-43). Precipitation and wind come first,
 * because they are what the story is about and why most people open a day.
 *
 * Landscape (US-08.02; SPEC D-50): the same single column; in a short window
 * the hero uses its compact size (`screenLayoutFor`), and everything else
 * stays reachable by scrolling. The left and right safe areas keep the
 * content clear of the notch.
 */
export function DayDetailScreen({ route }: RootStackScreenProps<'DayDetail'>) {
  const { location, day, utcOffsetSeconds } = route.params;
  const locationDetails = formatLocationDetails(location);
  const sun = presentSunTimes(day, utcOffsetSeconds);
  const units = displayUnitsOf(useSettingsViewModel().settings);
  const conditions = presentDayConditions(day, units);
  const layout = screenLayoutFor(useWindowDimensions());

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <DayDetailHero day={day} utcOffsetSeconds={utcOffsetSeconds} units={units} isCompact={layout.isShortHeight} />
        {locationDetails !== undefined && <Text style={styles.details}>{locationDetails}</Text>}
        <View style={styles.cards}>
          <WeatherCard title="Precipitation">
            <DetailRow label="Total" value={conditions.precipitationTotal} />
            <DetailRow label="Chance" value={conditions.precipitationChance} />
            <DetailRow label="Rain" value={conditions.rain} />
            <DetailRow label="Snow" value={conditions.snowfall} />
            <DetailRow label="Duration" value={conditions.precipitationHours} />
          </WeatherCard>
          <WeatherCard title="Wind">
            <DetailRow label="Max speed" value={conditions.windSpeedMax} />
            <DetailRow label="Max gusts" value={conditions.windGustsMax} />
            {/* Where the wind blows from: the meteorological convention. */}
            <DetailRow label="Coming from" value={conditions.windDirection} />
          </WeatherCard>
          <WeatherCard title="Sun">
            <DetailRow label="Sunrise" value={sun.sunrise} />
            <DetailRow label="Sunset" value={sun.sunset} />
            <DetailRow label="Daylight" value={conditions.daylight} />
            <DetailRow label="UV index" value={conditions.uvIndexMax} />
          </WeatherCard>
        </View>
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
  cards: {
    gap: spacing.m,
    marginTop: spacing.l,
  },
});
