import { REFRESH_INTERVAL_OPTIONS } from '../../src/models/AppSettings';
import { isStale } from '../../src/utils/refreshPolicy';

/**
 * Tests for the refresh rule (W-11; SPEC D-45): data is stale when it is at
 * least the chosen interval old, or when its time lies in the future.
 */

const MINUTE = 60 * 1000;
const FETCHED = Date.UTC(2026, 10, 24, 9, 0);

describe('isStale', () => {
  it('keeps data that is younger than the interval (fetched 5 min ago, interval 15 min)', () => {
    expect(isStale(FETCHED, FETCHED + 5 * MINUTE, 15)).toBe(false);
  });

  it('refreshes data that is older than the interval (fetched 20 min ago, interval 15 min)', () => {
    expect(isStale(FETCHED, FETCHED + 20 * MINUTE, 15)).toBe(true);
  });

  it('refreshes data that is exactly the interval old (the boundary counts as stale)', () => {
    expect(isStale(FETCHED, FETCHED + 15 * MINUTE, 15)).toBe(true);
  });

  it('keeps data 1 ms before the interval ends', () => {
    expect(isStale(FETCHED, FETCHED + 15 * MINUTE - 1, 15)).toBe(false);
  });

  it('keeps data fetched this very moment', () => {
    expect(isStale(FETCHED, FETCHED, 15)).toBe(false);
  });

  it('refreshes data whose time lies in the future (the clock was set back)', () => {
    expect(isStale(FETCHED, FETCHED - 1, 30)).toBe(true);
  });

  it.each(REFRESH_INTERVAL_OPTIONS)('uses the chosen interval of %i minutes', (minutes) => {
    expect(isStale(FETCHED, FETCHED + (minutes - 1) * MINUTE, minutes)).toBe(false);
    expect(isStale(FETCHED, FETCHED + minutes * MINUTE, minutes)).toBe(true);
  });

  it('gives a different answer for the same age with a longer interval', () => {
    const age = 20 * MINUTE;
    expect(isStale(FETCHED, FETCHED + age, 15)).toBe(true);
    expect(isStale(FETCHED, FETCHED + age, 30)).toBe(false);
  });
});
