import {
  GEOCODING_LANGUAGE,
  OPEN_METEO_GEOCODING_URL,
  SEARCH_RESULT_COUNT,
  buildSearchUrl,
} from '../../src/services/api/geocodingService';

/** Splits a URL into its base, raw query string and decoded parameters. */
function splitUrl(url: string): { base: string; rawQuery: string; params: Map<string, string> } {
  const [base, rawQuery = ''] = url.split('?');
  const params = new Map<string, string>();
  for (const pair of rawQuery.split('&')) {
    const [key, value = ''] = pair.split('=');
    params.set(key, decodeURIComponent(value));
  }
  return { base, rawQuery, params };
}

describe('buildSearchUrl', () => {
  it('uses the Open-Meteo geocoding endpoint', () => {
    expect(splitUrl(buildSearchUrl('Lund')).base).toBe(OPEN_METEO_GEOCODING_URL);
  });

  it('sets the name, result count, language and format', () => {
    const { params } = splitUrl(buildSearchUrl('Lund'));

    expect(params.get('name')).toBe('Lund');
    expect(params.get('count')).toBe(String(SEARCH_RESULT_COUNT));
    expect(params.get('language')).toBe(GEOCODING_LANGUAGE);
    expect(params.get('format')).toBe('json');
  });

  it('uses Swedish so Swedish spellings are found', () => {
    expect(GEOCODING_LANGUAGE).toBe('sv');
  });

  it('encodes Swedish letters', () => {
    const { rawQuery, params } = splitUrl(buildSearchUrl('Göteborg'));

    expect(rawQuery).toContain('name=G%C3%B6teborg');
    expect(params.get('name')).toBe('Göteborg');
  });

  it('encodes spaces and characters that would break the query string', () => {
    const { rawQuery, params } = splitUrl(buildSearchUrl('New York & Co?'));

    expect(rawQuery).toContain('name=New%20York%20%26%20Co%3F');
    expect(params.get('name')).toBe('New York & Co?');
    expect(params.get('count')).toBe(String(SEARCH_RESULT_COUNT));
  });
});
