import { createLatestRequestGuard } from '../../src/viewmodels/latestRequest';

/**
 * Tests for the request-ordering rule used by `useWeatherViewModel` (W-23,
 * Q12): only the newest request may update the state.
 */

describe('createLatestRequestGuard', () => {
  it('treats the only running request as the latest', () => {
    const guard = createLatestRequestGuard();
    const first = guard.start();
    expect(guard.isLatest(first)).toBe(true);
  });

  it('makes an older request outdated when a new one starts', () => {
    const guard = createLatestRequestGuard();
    const lund = guard.start();
    const kiruna = guard.start();

    expect(guard.isLatest(lund)).toBe(false);
    expect(guard.isLatest(kiruna)).toBe(true);
  });

  it('makes every request outdated after cancelAll (screen gone)', () => {
    const guard = createLatestRequestGuard();
    const running = guard.start();
    guard.cancelAll();
    expect(guard.isLatest(running)).toBe(false);
  });

  it('keeps separate guards independent', () => {
    const weatherGuard = createLatestRequestGuard();
    const otherGuard = createLatestRequestGuard();
    const weatherRequest = weatherGuard.start();
    otherGuard.start();
    otherGuard.start();
    expect(weatherGuard.isLatest(weatherRequest)).toBe(true);
  });

  it('applies only the newer answer when the older one arrives last', async () => {
    // Simulates the race in Q12: Lund is selected first but answers last.
    const guard = createLatestRequestGuard();
    const applied: string[] = [];

    async function load(place: string, delayMs: number): Promise<void> {
      const requestId = guard.start();
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (guard.isLatest(requestId)) {
        applied.push(place);
      }
    }

    await Promise.all([load('Lund', 30), load('Kiruna', 5)]);

    expect(applied).toEqual(['Kiruna']);
  });
});
