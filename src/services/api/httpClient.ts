import { AppError } from '../../models/AppError';

export type GetJsonOptions = {
  /** The request is cancelled if the full response has not arrived within this time. */
  readonly timeoutMs: number;
};

/**
 * Sends a GET request and returns the response body as untrusted JSON.
 * The only module that calls `fetch` (STYLE.md §9).
 *
 * `fetch` is asynchronous, so the UI thread is never blocked while waiting
 * for the network (W-23).
 *
 * Every failure becomes an AppError, so callers never see a raw exception (W-18, W-19):
 * - `'network'`: no connection, or the connection broke while reading
 * - `'timeout'`: no complete response within `timeoutMs`
 * - `'http'`: the server answered with a status outside 200–299
 * - `'parse'`: the body is not valid JSON
 */
export async function getJson(url: string, options: GetJsonOptions): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      throw requestFailedError(controller, url, options.timeoutMs, error);
    }

    if (!response.ok) {
      throw new AppError('http', `HTTP ${response.status} from ${url}`);
    }

    // Read the body as text first, so a broken connection ('network') and
    // invalid JSON ('parse') are reported as different errors.
    let body: string;
    try {
      body = await response.text();
    } catch (error) {
      throw requestFailedError(controller, url, options.timeoutMs, error);
    }

    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new AppError('parse', `Response from ${url} is not valid JSON`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/** `fetch` or reading the body failed: either our timeout aborted it, or the network did. */
function requestFailedError(
  controller: AbortController,
  url: string,
  timeoutMs: number,
  cause: unknown,
): AppError {
  if (controller.signal.aborted) {
    return new AppError('timeout', `No response from ${url} within ${timeoutMs} ms`);
  }
  const reason = cause instanceof Error ? cause.message : String(cause);
  return new AppError('network', `Request to ${url} failed: ${reason}`);
}
