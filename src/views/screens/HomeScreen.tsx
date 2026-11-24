import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, RefreshControl, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Location } from '../../models/Location';
import type { DailyForecast } from '../../models/Weather';
import type { RootStackScreenProps } from '../../navigation/routes';
import { skyBaseColor, skyColors, skyGradient, skyVariantFor } from '../../theme/sky';
import { CONTENT_MAX_WIDTH, spacing } from '../../theme/spacing';
import { selectTodayForecast } from '../../utils/forecastSelection';
import { useCoordinateSearchViewModel } from '../../viewmodels/useCoordinateSearchViewModel';
import { useFavoritesViewModel } from '../../viewmodels/useFavoritesViewModel';
import { useSearchViewModel } from '../../viewmodels/useSearchViewModel';
import { useSettingsViewModel } from '../../viewmodels/useSettingsViewModel';
import { useWeatherViewModel } from '../../viewmodels/useWeatherViewModel';
import { DailyForecastList } from '../components/DailyForecastList';
import { FavoritesSaveNotice } from '../components/FavoritesStatus';
import { HomeHeader } from '../components/HomeHeader';
import { HourlyForecastList } from '../components/HourlyForecastList';
import { WeatherHero } from '../components/WeatherHero';
import { RefreshNotice, WeatherStatus } from '../components/WeatherStatus';
import { WelcomePanel } from '../components/WelcomePanel';
import { LocationSearchSheet } from './LocationSearchSheet';

/**
 * Home screen (US-03.01 – US-03.04, SPEC D-22, D-33): weather first.
 *
 * - **Header:** the selected place, its favorite star, and compact buttons
 *   for the favorites list and search.
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
 *
 * Favorites (US-05.01, US-05.03; SPEC D-40):
 * - The star shows and toggles whether the selected place is saved, through
 *   `useFavoritesViewModel`; it is disabled while favorites are saved or read.
 * - Home reads the favorites again whenever it comes back into view, because
 *   the favorites screen has its own ViewModel and may have removed some.
 * - A place chosen on the favorites screen comes back as the
 *   `selectedLocation` route param and goes through `handleSelectLocation`,
 *   the same weather flow as a search result.
 *
 * Refresh (US-06.02; SPEC D-45): when Home comes back into view, or the app
 * returns from the background, the weather is fetched again if it is at
 * least the chosen refresh interval old. There is no timer: these are the
 * moments someone actually looks at the weather. The shown weather stays
 * until the new one arrives. Pulling down on the weather always fetches
 * again; the spinner shows during every refresh. A failed refresh shows
 * `RefreshNotice` with "Try again" under the header (NIT-383).
 */
export function HomeScreen({ navigation, route }: RootStackScreenProps<'Home'>) {
  const searchViewModel = useSearchViewModel();
  const coordinateViewModel = useCoordinateSearchViewModel();
  const weatherViewModel = useWeatherViewModel();
  const favoritesViewModel = useFavoritesViewModel();
  const { refreshIntervalMinutes } = useSettingsViewModel().settings;
  const [isSearchOpen, setSearchOpen] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const { location, state, forecast } = weatherViewModel;
  const fetched = state.status === 'success' || state.status === 'refreshFailed' ? state.data : undefined;
  const report = fetched?.report;
  const isRefreshing = (state.status === 'success' || state.status === 'refreshFailed') && state.isRefreshing;
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

  // Coming back into view: the favorites screen may have changed the saved
  // favorites, so the star must follow storage, not this screen's old copy.
  const { reload: reloadFavorites } = favoritesViewModel;
  useFocusEffect(
    useCallback(() => {
      reloadFavorites();
    }, [reloadFavorites]),
  );

  // Refresh stale weather when Home comes back into view (from a day, the
  // favorites or the settings screen) or the app returns from the
  // background (SPEC D-45).
  const { refreshIfStale } = weatherViewModel;
  useFocusEffect(
    useCallback(() => {
      refreshIfStale(refreshIntervalMinutes);
    }, [refreshIfStale, refreshIntervalMinutes]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') {
        refreshIfStale(refreshIntervalMinutes);
      }
    });
    return () => subscription.remove();
  }, [refreshIfStale, refreshIntervalMinutes]);

  // A place handed back by another screen (a chosen favorite): load it like a
  // search result, then clear the param so the same place can be chosen again
  // later. Choosing the place already shown sends no request (D-30).
  const placeFromRoute = route.params?.selectedLocation;
  useEffect(() => {
    if (placeFromRoute !== undefined) {
      handleSelectLocation(placeFromRoute);
      navigation.setParams({ selectedLocation: undefined });
    }
    // Runs only when a new place arrives; handleSelectLocation uses no stale values.
  }, [placeFromRoute, navigation]);

  return (
    <View style={[styles.root, sky === 'night' ? styles.skyNight : styles.skyDay]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.column}>
          <HomeHeader
            location={location}
            favorite={
              location === null
                ? undefined
                : {
                    isFavorite: favoritesViewModel.isFavorite(location),
                    isDisabled: !favoritesViewModel.canChange,
                    onToggle: () => favoritesViewModel.toggleFavorite(location),
                  }
            }
            onPressFavorites={() => navigation.navigate('Favorites')}
            onPressSearch={() => setSearchOpen(true)}
            onPressSettings={() => navigation.navigate('Settings')}
          />
          {favoritesViewModel.saveError !== null && (
            <View style={styles.notice}>
              <FavoritesSaveNotice error={favoritesViewModel.saveError} tone="sky" />
            </View>
          )}
          {state.status === 'refreshFailed' && (
            <View style={styles.notice}>
              <RefreshNotice state={state} onRetry={weatherViewModel.refresh} />
            </View>
          )}
        </View>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          refreshControl={
            // Only with weather on screen: before a place is chosen or while it
            // loads, there is nothing to refresh.
            report === undefined ? undefined : (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={weatherViewModel.refresh}
                tintColor={skyColors.onSky}
                colors={[skyColors.onSky]}
                progressBackgroundColor={skyBaseColor.day}
                accessibilityLabel="Refreshing weather"
              />
            )
          }
        >
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
  notice: {
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
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
