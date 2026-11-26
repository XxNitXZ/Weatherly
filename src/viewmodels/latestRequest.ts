/**
 * Keeps track of which asynchronous request is the newest (W-23, Q12). A
 * ViewModel starts a request, remembers its number, and applies the result
 * only if `isLatest` is still true, so an older, slower answer can never
 * overwrite a newer one. Plain object, no React, so the rule is unit-tested.
 */
export type LatestRequestGuard = {
  /** Starts a new request and returns its number. Every older request is now outdated. */
  readonly start: () => number;
  /** True when `requestId` belongs to the newest request. */
  readonly isLatest: (requestId: number) => boolean;
  /** Makes every running request outdated, e.g. when the screen goes away. */
  readonly cancelAll: () => void;
};

export function createLatestRequestGuard(): LatestRequestGuard {
  let latestId = 0;
  return {
    start: () => {
      latestId += 1;
      return latestId;
    },
    isLatest: (requestId) => requestId === latestId,
    cancelAll: () => {
      latestId += 1;
    },
  };
}
