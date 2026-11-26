import { AppError, type AppErrorKind } from '../../src/models/AppError';
import type { Location } from '../../src/models/Location';
import {
  EMPTY_FAVORITES_TEXT,
  EMPTY_FAVORITES_TITLE,
  RESET_FAVORITES_CONFIRMATION,
  describeFavoritesStatus,
  favoritesLoadErrorMessage,
  favoritesSaveErrorMessage,
} from '../../src/views/components/FavoritesStatus';

/**
 * Tests for what the favorites screen shows instead of its list, and for the
 * favorites error texts on both screens (NIT-244, NIT-246; SPEC D-40).
 */

const LUND: Location = {
  name: 'Lund',
  region: 'Skåne län',
  country: 'Sverige',
  coordinates: { latitude: 55.70584, longitude: 13.19321 },
};

const ALL_KINDS: ReadonlyArray<AppErrorKind> = [
  'network',
  'timeout',
  'http',
  'parse',
  'validation',
  'storage',
  'unknown',
];

describe('describeFavoritesStatus', () => {
  it('shows the loading indicator while the favorites are read for the first time', () => {
    expect(describeFavoritesStatus({ status: 'loading' })).toEqual({ kind: 'loading' });
    expect(describeFavoritesStatus({ status: 'idle' })).toEqual({ kind: 'loading' });
  });

  it('shows the empty state for an empty saved list', () => {
    expect(describeFavoritesStatus({ status: 'success', data: [], isRefreshing: false })).toEqual({
      kind: 'empty',
      title: EMPTY_FAVORITES_TITLE,
      text: EMPTY_FAVORITES_TEXT,
    });
  });

  it('explains in the empty state how to add the first favourite', () => {
    expect(EMPTY_FAVORITES_TEXT).toContain('Search for a place');
    expect(EMPTY_FAVORITES_TEXT).toContain('star');
  });

  it('shows nothing instead of a list with entries, also while it is read again', () => {
    expect(describeFavoritesStatus({ status: 'success', data: [LUND], isRefreshing: false })).toBeNull();
    expect(describeFavoritesStatus({ status: 'success', data: [LUND], isRefreshing: true })).toBeNull();
  });

  it('offers deleting the saved favourites only for damaged data', () => {
    const damaged = describeFavoritesStatus({ status: 'error', error: new AppError('parse', 'version: 7') });
    const unreadable = describeFavoritesStatus({ status: 'error', error: new AppError('storage', 'locked') });

    expect(damaged).toEqual({ kind: 'error', text: expect.stringContaining('could not be read'), canReset: true });
    expect(unreadable).toEqual({ kind: 'error', text: expect.stringContaining('try again'), canReset: false });
  });
});

describe('favoritesLoadErrorMessage', () => {
  it('says damaged data is kept unchanged', () => {
    expect(favoritesLoadErrorMessage(new AppError('parse', 'x'))).toBe(
      'Your saved favourites could not be read. They have been kept unchanged on this device.',
    );
  });

  it.each(ALL_KINDS)('gives a readable text for %s and never the developer message', (kind) => {
    const text = favoritesLoadErrorMessage(new AppError(kind, 'DEVELOPER DETAIL'));

    expect(text.length).toBeGreaterThan(20);
    expect(text).not.toContain('DEVELOPER DETAIL');
  });
});

describe('favoritesSaveErrorMessage', () => {
  it('says the favourites are unchanged after a failed write', () => {
    expect(favoritesSaveErrorMessage(new AppError('storage', 'disk full'))).toContain(
      'Your favourites are unchanged',
    );
  });

  it.each(ALL_KINDS)('gives a readable text for %s and never the developer message', (kind) => {
    const text = favoritesSaveErrorMessage(new AppError(kind, 'DEVELOPER DETAIL'));

    expect(text).toContain('unchanged');
    expect(text).not.toContain('DEVELOPER DETAIL');
  });
});

describe('RESET_FAVORITES_CONFIRMATION', () => {
  it('says clearly that the saved favourites will be deleted for good', () => {
    expect(RESET_FAVORITES_CONFIRMATION.title).toBe('Delete saved favourites?');
    expect(RESET_FAVORITES_CONFIRMATION.message).toContain('removes them from this device for good');
    expect(RESET_FAVORITES_CONFIRMATION.message).toContain('cannot be undone');
    expect(RESET_FAVORITES_CONFIRMATION.cancel).toBe('Cancel');
  });
});
