import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Location } from '../../models/Location';
import type { DailyForecast } from '../../models/Weather';
import type { RootStackScreenProps } from '../../navigation/routes';
import { skyBaseColor, skyGradient, skyVariantFor } from '../../theme/sky';
import { CONTENT_MAX_WIDTH, spacing } from '../../theme/spacing';
import { selectTodayForecast } from '../../utils/forecastSelection';
import { useCoordinateSearchViewModel } from '../../viewmodels/useCoordinateSearchViewModel';
import { useSearchViewModel } from '../../viewmodels/useSearchViewModel';
import { useWeatherViewModel } from '../../viewmodels/useWeatherViewModel';
import { DailyForecastList } from '../components/DailyForecastList';
import { HomeHeader } from '../components/HomeHeader';
import { HourlyForecastList } from '../components/HourlyForecastList';
import { WeatherHero } from '../components/WeatherHero';
import { WeatherStatus } from '../components/WeatherStatus';
import { WelcomePanel } from '../components/WelcomePanel';
import { LocationSearchSheet } from './LocationSearchSheet';

/**
 * Home screen (US-03.01 – US-03.04, SPEC D-22, D-33): weather first.
 *
 * - **Header:** the selected place and a compact search button.
 * - **Body:** the current weather as a large hero, then "Rest of today" and
 *   the seven-day forecast, on a day or night sky. Before a place is chosen,
 *   a welcome panel invites a search.
 * - **Search:** opens `LocationSearchSheet` with both search modes. Choosing
 *   a place closes the sheet and calls `weatherViewModel.load(location)`,
 *   the same flow as before.
 * - **A day:** tapping a day opens `DayDetail` with the place, that day and
 *   the report's UTC offset (SPEC D-36). The screen navigates, not a
 *   ViewModel (STYLE.md §3.3). Home stays mounted underneath, so its state
 *   is still there after going back.
 *
 * All weather sections come from one report; no section makes a request.
 * The body is a vertical `ScrollView` with a horizontal hourly list and the
 * seven days as plain rows, so no vertical list is nested.
 */
export function HomeScreen({ navigation }: RootStackScreenProps<'Home'>) {
  const searchViewModel = useSearchViewModel();
  const coordinateViewModel = useCoordinateSearchViewModel();
  const weatherViewModel = useWeatherViewModel();
  const [isSearchOpen, setSearchOpen] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const { location, state, forecast } = weatherViewModel;
  const fetched = state.status === 'success' || state.status === 'refreshFailed' ? state.data : undefined;
  const report = fetched?.report;
  const sky = skyVariantFor(report?.current.isDay);

  function handleSelectLocation(selected: Location): void {
    setSearchOpen(false);
    weatherViewModel.load(selected);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function handleSelectDay(day: DailyForecast): void {
    // The day list is only shown with a place and a report, so both exist here.
    if (location !== null && report !== undefined) {
      navigation.navigate('DayDetail', { location, day, utcOffsetSeconds: report.utcOffsetSeconds });
    }
  }

  function handleRetry(): void {
    if (location !== null) {
      weatherViewModel.load(location);
    }
  }

  return (
    <View style={[styles.root, sky === 'night' ? styles.skyNight : styles.skyDay]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.column}>
          <HomeHeader location={location} onPressSearch={() => setSearchOpen(true)} />
        </View>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
          {location === null ? (
            <WelcomePanel onPressSearch={() => setSearchOpen(true)} />
          ) : report !== undefined && fetched !== undefined && forecast !== null ? (
            <>
              <WeatherHero
                current={report.current}
                utcOffsetSeconds={report.utcOffsetSeconds}
                today={selectTodayForecast(forecast)}
              />
              <HourlyForecastList
                hours={forecast.todayHours}
                utcOffsetSeconds={report.utcOffsetSeconds}
                daily={report.daily}
                nowEpochMs={fetched.fetchedAtEpochMs}
              />
              <DailyForecastList
                days={forecast.days}
                todayDateEpochMs={forecast.todayDateEpochMs}
                utcOffsetSeconds={report.utcOffsetSeconds}
                onSelectDay={handleSelectDay}
              />
            </>
          ) : (
            <WeatherStatus state={state} onRetry={handleRetry} />
          )}
        </ScrollView>
      </SafeAreaView>
      <LocationSearchSheet
        visible={isSearchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectLocation={handleSelectLocation}
        selectedLocation={location}
        searchViewModel={searchViewModel}
        coordinateViewModel={coordinateViewModel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  skyDay: {
    backgroundColor: skyBaseColor.day,
    backgroundImage: skyGradient.day,
  },
  skyNight: {
    backgroundColor: skyBaseColor.night,
    backgroundImage: skyGradient.night,
  },
  safeArea: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.xl,
  },
});
