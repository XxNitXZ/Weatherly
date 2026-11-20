import lundFixture from '../fixtures/openMeteoGeocodingLund.json';
import noResultsFixture from '../fixtures/openMeteoGeocodingNoResults.json';
import { searchLocations } from '../../src/repositories/locationRepository';
import { buildSearchUrl } from '../../src/services/api/geocodingService';
import {
  expectAppError,
  fakeResponse,
  installFakeFetch,
  restoreFetch,
} from '../helpers/fakeFetch';

/**
 * Tests for `locationRepository.searchLocations`: geocoding service + parser.
 * `fetch` is faked with real saved Open-Meteo Geocoding responses.
 */

afterEach(() => {
  restoreFetch();
});

describe('searchLocations', () => {
  it('requests the search URL for the query', async () => {
    const fetchMock = installFakeFetch();
    fetchMock.mockResolvedValue(fakeResponse(200, JSON.stringify(lundFixture)));

    await searchLocations('Lund');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(buildSearchUrl('Lund'));
  });

  it('returns typed locations with region and country', async () => {
    installFakeFetch().mockResolvedValue(fakeResponse(200, JSON.stringify(lundFixture)));

    const locations = await searchLocations('Lund');

    expect(locations).toHaveLength(10);
    expect(locations[0]).toEqual({
      name: 'Lund',
      region: 'Skåne län',
      country: 'Sverige',
      coordinates: { latitude: 55.70584, longitude: 13.19321 },
    });
  });

  it('returns an empty list when nothing matched', async () => {
    installFakeFetch().mockResolvedValue(fakeResponse(200, JSON.stringify(noResultsFixture)));

    await expect(searchLocations('xqzvbn')).resolves.toEqual([]);
  });

  it('passes a service error through unchanged', async () => {
    installFakeFetch().mockRejectedValue(new TypeError('Network request failed'));

    await expectAppError(searchLocations('Lund'), 'network');
  });

  it('passes a parse error through when a result is malformed', async () => {
    const broken = { results: [{ name: 'Lund', latitude: 'north', longitude: 13.2 }] };
    installFakeFetch().mockResolvedValue(fakeResponse(200, JSON.stringify(broken)));

    const error = await expectAppError(searchLocations('Lund'), 'parse');
    expect(error.message).toContain('results[0].latitude');
  });
});
