import type { RefreshIntervalMinutes } from '../models/AppSettings';

const MS_PER_MINUTE = 60 * 1000;

/**
 * Whether data fetched at `fetchedAtEpochMs` should be fetched again at
 * `nowEpochMs`, given the refresh interval the user chose (W-11; SPEC D-45).
 *
 * Stale when the data is **at least** `intervalMinutes` old: with 15 minutes,
 * data fetched exactly 15 minutes ago is stale. Also stale when its time lies
 * in the future (the device clock was set back), because its age is then
 * unknown and fetching again is the safe choice.
 *
 * Pure: the caller passes the current time, so the rule is unit-tested
 * without a clock. Epic 7 uses the same rule for the cache.
 */
export function isStale(
  fetchedAtEpochMs: number,
  nowEpochMs: number,
  intervalMinutes: RefreshIntervalMinutes,
): boolean {
  const ageMs = nowEpochMs - fetchedAtEpochMs;
  return ageMs < 0 || ageMs >= intervalMinutes * MS_PER_MINUTE;
}
