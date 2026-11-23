import { StatusBar } from 'expo-status-bar';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Location } from '../../models/Location';
import type { RootStackScreenProps } from '../../navigation/routes';
import { colors } from '../../theme/colors';
import { CONTENT_MAX_WIDTH, spacing } from '../../theme/spacing';
import { useFavoritesViewModel } from '../../viewmodels/useFavoritesViewModel';
import { FavoriteListItem } from '../components/FavoriteListItem';
import {
  FavoritesSaveNotice,
  FavoritesStatus,
  RESET_FAVORITES_CONFIRMATION,
} from '../components/FavoritesStatus';

/**
 * The saved favorite places (W-09; US-05.03, SPEC D-40), pushed from the home
 * screen's header onto the one native stack.
 *
 * - **List:** newest first, one vertical `FlatList`. Each row shows the name
 *   and region/country (or coordinates) and has a remove button.
 * - **States:** loading, an empty state that explains how to add a favorite,
 *   and an error state with "Try again"; for damaged data also "Delete saved
 *   favourites", which asks for confirmation first.
 * - **Choosing a place:** pops back to `Home` with the place as
 *   `selectedLocation`. Home loads its weather through the existing flow, so
 *   this screen never loads weather and keeps no weather state.
 *
 * It reuses `useFavoritesViewModel`, which reads the favorites when the
 * screen opens. A removal appears only after it has been saved.
 */
export function FavoritesScreen({ navigation }: RootStackScreenProps<'Favorites'>) {
  const favoritesViewModel = useFavoritesViewModel();
  const { state, saveError, canChange, isSaving } = favoritesViewModel;
  const favorites = state.status === 'success' ? state.data : [];

  function handleSelect(location: Location): void {
    navigation.popTo('Home', { selectedLocation: location });
  }

  function handleReset(): void {
    Alert.alert(RESET_FAVORITES_CONFIRMATION.title, RESET_FAVORITES_CONFIRMATION.message, [
      { text: RESET_FAVORITES_CONFIRMATION.cancel, style: 'cancel' },
      {
        text: RESET_FAVORITES_CONFIRMATION.confirm,
        style: 'destructive',
        onPress: favoritesViewModel.resetFavorites,
      },
    ]);
  }

  return (
    // The native header already keeps clear of the status bar and the notch.
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <FlatList
        data={favorites}
        keyExtractor={favoriteKey}
        renderItem={({ item }) => (
          <FavoriteListItem
            location={item}
            canRemove={canChange}
            onSelect={handleSelect}
            onRemove={favoritesViewModel.removeFavorite}
          />
        )}
        ListHeaderComponent={
          saveError === null ? undefined : (
            <View style={styles.notice}>
              <FavoritesSaveNotice error={saveError} tone="light" />
            </View>
          )
        }
        ListEmptyComponent={
          <FavoritesStatus
            state={state}
            onRetry={favoritesViewModel.reload}
            onReset={handleReset}
            isEnabled={!isSaving}
          />
        }
        ItemSeparatorComponent={FavoriteSeparator}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

/** Unique per row: no two favorites lie within the identity tolerance of each other (SPEC D-37). */
function favoriteKey(location: Location): string {
  const { latitude, longitude } = location.coordinates;
  return `${latitude},${longitude}`;
}

function FavoriteSeparator() {
  return <View style={styles.separator} />;
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
    padding: spacing.m,
  },
  notice: {
    paddingBottom: spacing.m,
  },
  separator: {
    height: spacing.s,
  },
});
