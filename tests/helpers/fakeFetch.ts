import { AppError, type AppErrorKind } from '../../src/models/AppError';

/**
 * Test helpers that replace the global `fetch`, so tests never use the network
 * (STYLE.md §13). Call `restoreFetch()` in `afterEach`.
 */

const originalFetch = globalThis.fetch;

type FetchMock = jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

/** Installs a `jest.fn()` as the global `fetch` and returns it. */
export function installFakeFetch(): FetchMock {
  const fetchMock: FetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

export function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

/**
 * A minimal stand-in for `Response`: only the members `httpClient` uses.
 * `body` is returned as-is by `text()`.
 */
export function fakeResponse(status: number, body: string): Response {
  const response = {
    ok: status >= 200 && status <= 299,
    status,
    text: () => Promise.resolve(body),
  };
  return response as unknown as Response;
}

/** Asserts that `promise` rejects with an AppError of the given kind. */
export async function expectAppError(
  promise: Promise<unknown>,
  kind: AppErrorKind,
): Promise<AppError> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AppError);
  if (!(caught instanceof AppError)) {
    throw new Error('Expected an AppError');
  }
  expect(caught.kind).toBe(kind);
  return caught;
}
