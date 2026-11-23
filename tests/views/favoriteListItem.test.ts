import type { Location } from '../../src/models/Location';
import { presentFavoriteItem } from '../../src/views/components/FavoriteListItem';

/**
 * Tests for the texts of one row on the favorites screen (NIT-244). Lund is a
 * real Open-Meteo Geocoding result; the typed place is named the way
 * `useCoordinateSearchViewModel` names it.
 */

describe('presentFavoriteItem', () => {
  it('shows the name with region and country', () => {
    const lund: Location = {
      name: 'Lund',
      region: 'Skåne län',
      country: 'Sverige',
      coordinates: { latitude: 55.70584, longitude: 13.19321 },
    };

    expect(presentFavoriteItem(lund)).toEqual({
      title: 'Lund',
      subtitle: 'Skåne län, Sverige',
      selectLabel: 'Lund, Skåne län, Sverige',
      removeLabel: 'Remove Lund from favourites',
    });
  });

  it('shows only the country when the region is missing', () => {
    const place: Location = { name: 'Monaco', country: 'Monaco', coordinates: { latitude: 43.73, longitude: 7.42 } };

    expect(presentFavoriteItem(place).subtitle).toBe('Monaco');
  });

  it('falls back to the coordinates for a place entered as coordinates', () => {
    const typed: Location = { name: '-33.8688, 151.2093', coordinates: { latitude: -33.8688, longitude: 151.2093 } };

    const item = presentFavoriteItem(typed);

    expect(item.subtitle).toBe('33.87° S, 151.21° E');
    expect(item.removeLabel).toBe('Remove -33.8688, 151.2093 from favourites');
  });
});
