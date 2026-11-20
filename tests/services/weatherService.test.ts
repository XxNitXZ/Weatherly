import fixture from '../fixtures/openMeteoForecast.json';
import {
  CURRENT_FIELDS,
  DAILY_FIELDS,
  HOURLY_FIELDS,
  OPEN_METEO_FORECAST_URL,
  buildForecastUrl,
} from '../../src/services/api/weatherService';

/** Splits a URL into its base and decoded query parameters. */
function splitUrl(url: string): { base: string; params: Map<string, string> } {
  const [base, query = ''] = url.split('?');
  const params = new Map<string, string>();
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    params.set(key, decodeURIComponent(value));
  }
  return { base, params };
}

describe('buildForecastUrl', () => {
  const stockholm = { latitude: 59.33, longitude: 18.07 };

  it('uses the Open-Meteo forecast endpoint', () => {
    const { base } = splitUrl(buildForecastUrl(stockholm));

    expect(base).toBe(OPEN_METEO_FORECAST_URL);
  });

  it('includes the coordinates', () => {
    const { params } = splitUrl(buildForecastUrl(stockholm));

    expect(params.get('latitude')).toBe('59.33');
    expect(params.get('longitude')).toBe('18.07');
  });

  it('keeps negative and zero coordinates', () => {
    const { params } = splitUrl(buildForecastUrl({ latitude: -33.87, longitude: 0 }));

    expect(params.get('latitude')).toBe('-33.87');
    expect(params.get('longitude')).toBe('0');
  });

  it('sets the fixed options the parser relies on', () => {
    const { params } = splitUrl(buildForecastUrl(stockholm));

    expect(params.get('timezone')).toBe('auto');
    expect(params.get('forecast_days')).toBe('7');
    expect(params.get('wind_speed_unit')).toBe('ms');
    expect(params.get('timeformat')).toBe('unixtime');
  });

  it('requests the current, hourly and daily fields as comma-separated lists', () => {
    const { params } = splitUrl(buildForecastUrl(stockholm));

    expect(params.get('current')).toBe(CURRENT_FIELDS.join(','));
    expect(params.get('hourly')).toBe(HOURLY_FIELDS.join(','));
    expect(params.get('daily')).toBe(DAILY_FIELDS.join(','));
  });

  // Guards against the request and the parser drifting apart: the fixture is
  // the real response that weatherParser is tested against.
  it('requests exactly the fields present in the parser test fixture', () => {
    const fieldsIn = (block: object): ReadonlyArray<string> =>
      Object.keys(block).filter((key) => key !== 'time' && key !== 'interval');

    expect([...CURRENT_FIELDS].sort()).toEqual([...fieldsIn(fixture.current)].sort());
    expect([...HOURLY_FIELDS].sort()).toEqual([...fieldsIn(fixture.hourly)].sort());
    expect([...DAILY_FIELDS].sort()).toEqual([...fieldsIn(fixture.daily)].sort());
  });
});
