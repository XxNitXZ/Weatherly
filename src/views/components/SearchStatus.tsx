import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { AppError } from '../../models/AppError';
import type { Location } from '../../models/Location';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import type { LoadState } from '../../viewmodels/loadState';

/**
 * The user-facing message for a failed place search (W-18, W-19). Views own
 * the wording; the ViewModel only provides the `AppError` (STYLE.md §8).
 * The developer `message` of the error is never shown.
 */
export function searchErrorMessage(error: AppError): string {
  switch (error.kind) {
    case 'validation':
      return 'Enter a place name to search.';
    case 'network':
      return 'No internet connection. Check your connection and search again.';
    case 'timeout':
      return 'The search took too long. Please search again.';
    case 'http':
      return 'The place search is not available right now. Please try again later.';
    case 'parse':
      return 'The place search sent an unexpected answer. Please try again later.';
    case 'storage':
    case 'unknown':
      return 'Something went wrong. Please search again.';
  }
}

/** What the area below the search field shows when there is no result list. */
export type SearchStatusContent =
  | { readonly kind: 'loading' }
  | { readonly kind: 'message'; readonly text: string; readonly tone: 'neutral' | 'error' };

/**
 * Decides what to show for a search state. Returns `null` when there are
 * results, because the list itself is then shown.
 *
 * An empty query is a hint (`neutral`), not an error: nothing went wrong.
 */
export function describeSearchStatus(
  state: LoadState<ReadonlyArray<Location>>,
): SearchStatusContent | null {
  switch (state.status) {
    case 'idle':
      return {
        kind: 'message',
        text: 'Search for a place by name, for example Göteborg or Lund.',
        tone: 'neutral',
      };
    case 'loading':
      return { kind: 'loading' };
    case 'success':
    case 'refreshFailed':
      return state.data.length === 0
        ? {
            kind: 'message',
            text: 'No places found. Check the spelling or try another name.',
            tone: 'neutral',
          }
        : null;
    case 'error':
      return {
        kind: 'message',
        text: searchErrorMessage(state.error),
        tone: state.error.kind === 'validation' ? 'neutral' : 'error',
      };
  }
}

export type SearchStatusProps = {
  readonly state: LoadState<ReadonlyArray<Location>>;
};

/** Loading indicator, hint, empty-results or error message for place search (W-01, W-20). */
export function SearchStatus({ state }: SearchStatusProps) {
  const content = describeSearchStatus(state);
  if (content === null) {
    return null;
  }

  if (content.kind === 'loading') {
    return (
      <View
        style={styles.loading}
        accessible
        accessibilityLabel="Searching"
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.text}>Searching…</Text>
      </View>
    );
  }

  const isError = content.tone === 'error';
  return (
    <Text
      style={[styles.text, isError && styles.errorText]}
      accessibilityRole={isError ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      {content.text}
    </Text>
  );
}

const styles = StyleSheet.create({
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
  },
  text: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    paddingVertical: spacing.m,
  },
  errorText: {
    color: colors.error,
  },
});
