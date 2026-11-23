import type { Location } from '../../src/models/Location';
import { addFavorite } from '../../src/utils/favorites';
import { presentFavoriteToggle } from '../../src/views/components/HomeHeader';
import { canChangeFavorites, isFavoriteIn } from '../../src/viewmodels/useFavoritesViewModel';
import type { LoadState } from '../../src/viewmodels/loadState';

/**
 * Tests for the favorite star in the home header (NIT-239; SPEC D-40). The
 * header is presentational: `HomeScreen` passes `isFavorite(location)` and
 * `!canChange` from `useFavoritesViewModel`, and `presentFavoriteToggle`
 * turns them into the icon and labels. These tests combine both, the way the
 * screen does, without a React renderer (SPEC Q21).
 */

// The ViewModel module imports the repository, which imports AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const LUND: Location = {
  name: 'Lund',
  region: 'Skåne län',
  country: 'Sverige',
  coordinates: { latitude: 55.70584, longitude: 13.19321 },
};

const KIRUNA: Location = {
  name: 'Kiruna',
  region: 'Norrbottens län',
  country: 'Sverige',
  coordinates: { latitude: 67.85572, longitude: 20.22513 },
};

type Favorites = ReadonlyArray<Location>;

function saved(data: Favorites, isRefreshing = false): LoadState<Favorites> {
  return { status: 'success', data, isRefreshing };
}

/** What the header shows for `location`, given the favorites state, as `HomeScreen` wires it. */
function starFor(location: Location, state: LoadState<Favorites>, isSaving = false) {
  return presentFavoriteToggle(location.name, isFavoriteIn(state, location), !canChangeFavorites(state, isSaving));
}

describe('presentFavoriteToggle', () => {
  it('shows an outlined star with an "add" label for a place that is not saved', () => {
    expect(presentFavoriteToggle('Lund', false, false)).toEqual({
      icon: 'star-outline',
      accessibilityLabel: 'Add Lund to favourites',
      accessibilityHint: undefined,
    });
  });

  it('shows a filled star with a "remove" label for a saved place', () => {
    expect(presentFavoriteToggle('Lund', true, false)).toEqual({
      icon: 'star',
      accessibilityLabel: 'Remove Lund from favourites',
      accessibilityHint: undefined,
    });
  });

  it('explains a disabled star to screen-reader users', () => {
    expect(presentFavoriteToggle('Lund', true, true).accessibilityHint).toBe(
      'Favourites are not available right now',
    );
  });

  it('names a place entered as coordinates by its coordinates', () => {
    expect(presentFavoriteToggle('59.33, 18.07', false, false).accessibilityLabel).toBe(
      'Add 59.33, 18.07 to favourites',
    );
  });
});

describe('the star on the home screen', () => {
  it('follows the persisted list: outlined before a toggle, filled after the saved list contains the place', () => {
    const before = saved([]);
    const after = saved(addFavorite([], LUND));

    expect(starFor(LUND, before).icon).toBe('star-outline');
    expect(starFor(LUND, after).icon).toBe('star');
  });

  it('changes with the selected place: Lund saved, Kiruna not', () => {
    const state = saved([LUND]);

    expect(starFor(LUND, state).icon).toBe('star');
    expect(starFor(KIRUNA, state).icon).toBe('star-outline');
    expect(starFor(KIRUNA, state).accessibilityLabel).toBe('Add Kiruna to favourites');
  });

  it('is filled for the same place entered as coordinates within the tolerance', () => {
    const typedLund: Location = { name: '55.7058, 13.1932', coordinates: { latitude: 55.7058, longitude: 13.1932 } };

    expect(starFor(typedLund, saved([LUND])).icon).toBe('star');
  });

  it('is disabled while a change is being saved', () => {
    expect(starFor(LUND, saved([LUND]), true).accessibilityHint).toBeDefined();
  });

  it('is disabled while the favorites are read again after coming back to Home', () => {
    expect(canChangeFavorites(saved([LUND], true), false)).toBe(false);
    // The last list stays visible, so the star does not flicker while reading.
    expect(starFor(LUND, saved([LUND], true)).icon).toBe('star');
  });

  it('is outlined and disabled while loading and when the favorites cannot be read', () => {
    const loading = starFor(LUND, { status: 'loading' });

    expect(loading.icon).toBe('star-outline');
    expect(loading.accessibilityHint).toBeDefined();
  });
});
