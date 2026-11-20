import fixture from '../fixtures/openMeteoForecast.json';
import { getReport } from '../../src/repositories/weatherRepository';
import { buildForecastUrl } from '../../src/services/api/weatherService';
import {
  expectAppError,
  fakeResponse,
  installFakeFetch,
  restoreFetch,
} from '../helpers/fakeFetch';

/**
 * Tests for `weatherRepository.getReport`: service + parser + timestamp.
 * `fetch` is faked with the real saved Open-Meteo response.
 */

const STOCKHOLM = { latitude: 59.33, longitude: 18.07 };
const NOW_EPOCH_MS = 1_795_170_000_000;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW_EPOCH_MS);
});

afterEach(() => {
  restoreFetch();
  jest.restoreAllMocks();
});

describe('getReport', () => {
  it('requests the forecast URL for the given coordinates', async () => {
    const fetchMock = installFakeFetch();
    fetchMock.mockResolvedValue(fakeResponse(200, JSON.stringify(fixture)));

    await getReport(STOCKHOLM);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(buildForecastUrl(STOCKHOLM));
  });

  it('returns the parsed report with the time it was fetched', async () => {
    installFakeFetch().mockResolvedValue(fakeResponse(200, JSON.stringify(fixture)));

    const result = await getReport(STOCKHOLM);

    expect(result.fetchedAtEpochMs).toBe(NOW_EPOCH_MS);
    expect(result.report.timezone).toBe('Europe/Stockholm');
    expect(result.report.daily).toHaveLength(7);
    expect(result.report.hourly).toHaveLength(168);
  });

  it('passes a service error through unchanged', async () => {
    installFakeFetch().mockResolvedValue(fakeResponse(500, 'Internal Server Error'));

    await expectAppError(getReport(STOCKHOLM), 'http');
  });

  it('passes a parse error through when the JSON is valid but incomplete', async () => {
    const withoutDaily = { ...fixture, daily: undefined };
    installFakeFetch().mockResolvedValue(fakeResponse(200, JSON.stringify(withoutDaily)));

    const error = await expectAppError(getReport(STOCKHOLM), 'parse');
    expect(error.message).toContain('daily');
  });
});
