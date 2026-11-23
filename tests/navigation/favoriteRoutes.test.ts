import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Location } from '../../src/models/Location';
import type { RootStackParamList } from '../../src/navigation/routes';
import { loadFavorites, saveFavorites } from '../../src/repositories/favoritesRepository';
import { buildForecastUrl } from '../../src/services/api/weatherService';
import { isRepeatedWeatherLoad } from '../../src/viewmodels/useWeatherViewModel';

/**
 * Tests for handing a chosen favourite back to the home screen (NIT-245;
 * SPEC D-40). `FavoritesScreen` calls
 * `navigation.popTo('Home', { selectedLocation })`; `HomeScreen` passes the
 * place to the existing weather flow (`handleSelectLocation` →
 * `useWeatherViewModel.load` → `getReport`). React Navigation expects plain,
 * serialisable params, so the place must survive a JSON round trip unchanged,
 * and the weather request must use its exact saved coordinates.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const LUND: Location = {
  name: 'Lund',
  region: 'Skåne län',
  country: 'Sverige',
  coordinates: { latitude: 55.70584, longitude: 13.19321 },
};

const TYPED_SYDNEY: Location = {
  name: '-33.8688, 151.2093',
  coordinates: { latitude: -33.8688, longitude: 151.2093 },
};

function homeParamsFor(favorite: Location): RootStackParamList['Home'] {
  return { selectedLocation: favorite };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Home route params for a chosen favourite', () => {
  it.each([
    ['a geocoded place', LUND],
    ['a place entered as coordinates', TYPED_SYDNEY],
  ])('survive a JSON round trip unchanged for %s', (_label, favorite) => {
    const params = homeParamsFor(favorite);

    expect(JSON.parse(JSON.stringify(params))).toEqual(params);
  });

  it('carry the saved place itself, so its exact coordinates reach the weather request', async () => {
    await saveFavorites([TYPED_SYDNEY, LUND]);
    const [chosen] = await loadFavorites();

    const params = homeParamsFor(chosen);

    expect(params?.selectedLocation).toBe(chosen);
    const url = buildForecastUrl(chosen.coordinates);
    expect(url).toContain('latitude=-33.8688');
    expect(url).toContain('longitude=151.2093');
  });
});

describe('loading the weather for a chosen favourite', () => {
  it('sends no new request when the favourite is the place already shown', async () => {
    await saveFavorites([LUND]);
    const [chosen] = await loadFavorites();

    expect(isRepeatedWeatherLoad(chosen, LUND)).toBe(true);
  });

  it('loads the weather when the favourite is another place than the one shown', async () => {
    await saveFavorites([TYPED_SYDNEY, LUND]);
    const [chosen] = await loadFavorites();

    expect(isRepeatedWeatherLoad(chosen, LUND)).toBe(false);
  });

  it('loads the weather when no place is shown yet', () => {
    expect(isRepeatedWeatherLoad(LUND, null)).toBe(false);
  });
});
