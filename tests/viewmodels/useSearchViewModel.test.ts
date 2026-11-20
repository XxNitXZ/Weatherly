import { prepareSearchQuery } from '../../src/viewmodels/useSearchViewModel';

/**
 * Tests for the pure part of the search ViewModel (W-01).
 *
 * The hook itself (state changes, ignoring outdated searches) is not unit
 * tested: that would need a React test renderer, which the team decided not
 * to add. It is checked through UX-01 – UX-03 once the search screen exists
 * (US-03.01).
 */

describe('prepareSearchQuery', () => {
  it('returns a normal query unchanged', () => {
    expect(prepareSearchQuery('Lund')).toBe('Lund');
  });

  it('trims surrounding spaces', () => {
    expect(prepareSearchQuery('  Göteborg  ')).toBe('Göteborg');
  });

  it('keeps spaces inside the name', () => {
    expect(prepareSearchQuery(' New York ')).toBe('New York');
  });

  it('trims tabs and newlines', () => {
    expect(prepareSearchQuery('\tKiruna\n')).toBe('Kiruna');
  });

  it.each(['', ' ', '   ', '\t', '\n \t'])('returns null for an empty query (%j)', (raw) => {
    expect(prepareSearchQuery(raw)).toBeNull();
  });
});
