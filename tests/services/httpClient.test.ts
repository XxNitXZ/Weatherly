import { getJson } from '../../src/services/api/httpClient';
import {
  expectAppError,
  fakeResponse,
  installFakeFetch,
  restoreFetch,
} from '../helpers/fakeFetch';

/**
 * Tests for `getJson`: every way a request can end maps to exactly one
 * outcome (W-18, W-19, W-23). `fetch` is faked; no real network is used.
 */

const URL = 'https://example.test/data';
const OPTIONS = { timeoutMs: 1000 };

afterEach(() => {
  restoreFetch();
  jest.useRealTimers();
});

describe('getJson', () => {
  it('returns the parsed JSON for a 200 response', async () => {
    const fetchMock = installFakeFetch();
    fetchMock.mockResolvedValue(fakeResponse(200, '{"temperature": 1.2}'));

    await expect(getJson(URL, OPTIONS)).resolves.toEqual({ temperature: 1.2 });
    expect(fetchMock).toHaveBeenCalledWith(URL, expect.objectContaining({ signal: expect.anything() }));
  });

  it('throws a network error when fetch fails (no connection)', async () => {
    installFakeFetch().mockRejectedValue(new TypeError('Network request failed'));

    const error = await expectAppError(getJson(URL, OPTIONS), 'network');
    expect(error.message).toContain('Network request failed');
  });

  it('throws a timeout error when no response arrives in time', async () => {
    jest.useFakeTimers();
    // A request that never answers, but rejects when it is aborted, like real fetch.
    installFakeFetch().mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );

    const request = getJson(URL, OPTIONS);
    jest.advanceTimersByTime(1000);

    const error = await expectAppError(request, 'timeout');
    expect(error.message).toContain('1000 ms');
  });

  it('does not time out when the response arrives in time', async () => {
    jest.useFakeTimers();
    installFakeFetch().mockResolvedValue(fakeResponse(200, '[]'));

    const request = getJson(URL, OPTIONS);
    jest.advanceTimersByTime(999);

    await expect(request).resolves.toEqual([]);
  });

  it.each([404, 500, 503])('throws an http error for status %i', async (status) => {
    installFakeFetch().mockResolvedValue(fakeResponse(status, '{"error": true}'));

    const error = await expectAppError(getJson(URL, OPTIONS), 'http');
    expect(error.message).toContain(`HTTP ${status}`);
  });

  it('throws a parse error when the body is not valid JSON', async () => {
    installFakeFetch().mockResolvedValue(fakeResponse(200, '<html>Bad gateway</html>'));

    await expectAppError(getJson(URL, OPTIONS), 'parse');
  });

  it('throws a network error when the connection breaks while reading the body', async () => {
    const brokenBody = {
      ok: true,
      status: 200,
      text: () => Promise.reject(new TypeError('Connection reset')),
    } as unknown as Response;
    installFakeFetch().mockResolvedValue(brokenBody);

    await expectAppError(getJson(URL, OPTIONS), 'network');
  });
});
