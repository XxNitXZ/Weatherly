import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Location } from '../../models/Location';
import { colors } from '../../theme/colors';
import { interaction } from '../../theme/interaction';
import { CONTENT_MAX_WIDTH, MIN_TOUCH_TARGET, iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { isSameLocation } from '../../utils/locationFormatting';
import type { LoadState } from '../../viewmodels/loadState';
import type { CoordinateSearchViewModel } from '../../viewmodels/useCoordinateSearchViewModel';
import type { SearchViewModel } from '../../viewmodels/useSearchViewModel';
import { CitySearchForm } from '../components/CitySearchForm';
import { CoordinateSearchForm } from '../components/CoordinateSearchForm';
import { LocationResultItem } from '../components/LocationResultItem';
import { SearchModeSwitch, type SearchMode } from '../components/SearchModeSwitch';
import { SearchStatus } from '../components/SearchStatus';

export type LocationSearchSheetProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
  /** Called with a chosen search result or valid coordinates. */
  readonly onSelectLocation: (location: Location) => void;
  /** Marks the current place in the result list. */
  readonly selectedLocation: Location | null;
  /** Owned by `HomeScreen`, so results survive closing and reopening the sheet. */
  readonly searchViewModel: SearchViewModel;
  readonly coordinateViewModel: CoordinateSearchViewModel;
};

/**
 * Search, opened from the home screen's search button (SPEC D-33). Two modes,
 * as before: place name (W-01, W-02) and coordinates (W-03). It reuses the
 * existing search ViewModels, forms, status and result rows unchanged;
 * choosing a place hands it to `onSelectLocation`, and the home screen
 * closes the sheet and loads the weather.
 *
 * Layout: the sheet's own vertical `FlatList`, with the forms as its header
 * and the results as its rows (no nested vertical list).
 */
export function LocationSearchSheet({ visible, onClose, ...contentProps }: LocationSearchSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      // iOS shows a card-style sheet; Android a full-screen page.
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      // Android draws the sheet edge to edge, like the rest of the app; safe
      // areas are handled inside (not yet checked on a device).
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* A modal is a separate native window, so it needs its own provider for safe areas. */}
      <SafeAreaProvider>
        <SearchSheetContent onClose={onClose} {...contentProps} />
      </SafeAreaProvider>
    </Modal>
  );
}

type SearchSheetContentProps = Omit<LocationSearchSheetProps, 'visible'>;

function SearchSheetContent({
  onClose,
  onSelectLocation,
  selectedLocation,
  searchViewModel,
  coordinateViewModel,
}: SearchSheetContentProps) {
  const [mode, setMode] = useState<SearchMode>('city');

  // Results belong to place-name search only, so they are hidden in coordinate mode.
  const results = mode === 'city' ? visibleResults(searchViewModel.state) : [];

  function handleChangeMode(newMode: SearchMode): void {
    Keyboard.dismiss();
    setMode(newMode);
  }

  function handleSearch(query: string): void {
    Keyboard.dismiss();
    searchViewModel.search(query);
  }

  function handleSelectLocation(location: Location): void {
    Keyboard.dismiss();
    onSelectLocation(location);
  }

  function handleSubmitCoordinates(latitudeText: string, longitudeText: string): void {
    const location = coordinateViewModel.submit(latitudeText, longitudeText);
    if (location !== null) {
      handleSelectLocation(location);
    }
  }

  const header = (
    <View style={styles.header}>
      <SearchModeSwitch mode={mode} onChangeMode={handleChangeMode} />
      {/* Both forms stay mounted while the sheet is open, so typed text survives a mode switch. */}
      <View style={mode === 'city' ? undefined : styles.hidden}>
        <CitySearchForm onSubmit={handleSearch} />
      </View>
      <View style={mode === 'coordinates' ? undefined : styles.hidden}>
        <CoordinateSearchForm
          latitudeError={coordinateViewModel.latitudeError}
          longitudeError={coordinateViewModel.longitudeError}
          onSubmit={handleSubmitCoordinates}
        />
      </View>
      {results.length > 0 && (
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Results
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={styles.safeArea}
      // On iOS the page sheet already starts below the status bar.
      edges={Platform.OS === 'ios' ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
    >
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Text style={styles.title} accessibilityRole="header">
          Find a place
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close search"
          onPress={onClose}
          hitSlop={spacing.s}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        >
          <MaterialCommunityIcons name="close" size={iconSize.s} color={colors.text} />
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={results}
          keyExtractor={locationKey}
          renderItem={({ item }) => (
            <LocationResultItem
              location={item}
              isSelected={selectedLocation !== null && isSameLocation(item, selectedLocation)}
              onSelect={handleSelectLocation}
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={mode === 'city' ? <SearchStatus state={searchViewModel.state} /> : undefined}
          ItemSeparatorComponent={ResultSeparator}
          // A tap on a result selects it at once, even while the keyboard is open.
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.content}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The search results to list. Every other state shows `SearchStatus` instead. */
function visibleResults(state: LoadState<ReadonlyArray<Location>>): ReadonlyArray<Location> {
  return state.status === 'success' || state.status === 'refreshFailed' ? state.data : [];
}

function locationKey(location: Location): string {
  const { latitude, longitude } = location.coordinates;
  return `${location.name}:${latitude},${longitude}`;
}

function ResultSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  closeButtonPressed: {
    opacity: interaction.pressedOpacity,
  },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    padding: spacing.m,
  },
  header: {
    gap: spacing.m,
    paddingBottom: spacing.s,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
  },
  hidden: {
    display: 'none',
  },
  separator: {
    height: spacing.s,
  },
});
