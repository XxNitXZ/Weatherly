import { AppError, type AppErrorKind } from '../../src/models/AppError';
import type { Location } from '../../src/models/Location';
import type { LoadState } from '../../src/viewmodels/loadState';
import { describeSearchStatus, searchErrorMessage } from '../../src/views/components/SearchStatus';

/**
 * Tests for what the home screen shows below the search field (W-01, W-18 –
 * W-20). This is the error-state logic of place search: which `LoadState`
 * gives a loading indicator, a hint, an empty-results message or an error.
 * The rendered component is checked on the simulator.
 */

type SearchState = LoadState<ReadonlyArray<Location>>;

const LUND: Location = {
  name: 'Lund',
  region: 'Skåne län',
  country: 'Sverige',
  coordinates: { latitude: 55.70584, longitude: 13.19321 },
};

function errorState(kind: AppErrorKind): SearchState {
  return { status: 'error', error: new AppError(kind, 'developer detail that must not be shown') };
}

describe('describeSearchStatus', () => {
  it('shows a neutral hint before the first search', () => {
    expect(describeSearchStatus({ status: 'idle' })).toEqual({
      kind: 'message',
      text: 'Search for a place by name, for example Göteborg or Lund.',
      tone: 'neutral',
    });
  });

  it('shows the loading indicator while searching', () => {
    expect(describeSearchStatus({ status: 'loading' })).toEqual({ kind: 'loading' });
  });

  it('shows nothing when there are results, because the list is shown', () => {
    expect(describeSearchStatus({ status: 'success', data: [LUND], isRefreshing: false })).toBeNull();
  });

  it('shows a neutral "no places found" message for an empty result list', () => {
    expect(describeSearchStatus({ status: 'success', data: [], isRefreshing: false })).toEqual({
      kind: 'message',
      text: 'No places found. Check the spelling or try another name.',
      tone: 'neutral',
    });
  });

  it('treats an empty query as a hint, not an error', () => {
    expect(describeSearchStatus(errorState('validation'))).toEqual({
      kind: 'message',
      text: 'Enter a place name to search.',
      tone: 'neutral',
    });
  });

  it.each(['network', 'timeout', 'http', 'parse', 'storage', 'unknown'] as const)(
    'shows a %s failure as an error with the user-facing message',
    (kind) => {
      const state = errorState(kind);
      expect(describeSearchStatus(state)).toEqual({
        kind: 'message',
        text: searchErrorMessage(new AppError(kind, '')),
        tone: 'error',
      });
    },
  );
});

describe('searchErrorMessage', () => {
  it.each([
    ['validation', 'Enter a place name to search.'],
    ['network', 'No internet connection. Check your connection and search again.'],
    ['timeout', 'The search took too long. Please search again.'],
    ['http', 'The place search is not available right now. Please try again later.'],
    ['parse', 'The place search sent an unexpected answer. Please try again later.'],
    ['storage', 'Something went wrong. Please search again.'],
    ['unknown', 'Something went wrong. Please search again.'],
  ] as const)('%s → %j', (kind, expected) => {
    expect(searchErrorMessage(new AppError(kind, 'developer detail'))).toBe(expected);
  });

  it('never shows the developer message', () => {
    const error = new AppError('http', 'HTTP 500 from https://geocoding-api.open-meteo.com/v1/search');
    expect(searchErrorMessage(error)).not.toContain('HTTP 500');
  });
});
