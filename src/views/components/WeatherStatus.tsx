import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppError } from '../../models/AppError';
import type { FetchedWeatherReport } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { MIN_TOUCH_TARGET, iconSize, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import type { LoadState } from '../../viewmodels/loadState';

/**
 * The user-facing message for a failed weather load (W-18, W-19). Views own
 * the wording (STYLE.md §8); the developer `message` is never shown. Both
 * ways of retrying work: the "Try again" button, or selecting the place
 * again (the ViewModel allows a new load after an error).
 */
export function weatherErrorMessage(error: AppError): string {
  switch (error.kind) {
    case 'network':
      return 'No internet connection. Check your connection and select the place again.';
    case 'timeout':
      return 'The weather service took too long to answer. Select the place again to retry.';
    case 'http':
      return 'The weather service is not available right now. Please try again later.';
    case 'parse':
      return 'The weather service sent an unexpected answer. Please try again later.';
    case 'validation':
    case 'storage':
    case 'unknown':
      return 'Something went wrong while loading the weather. Select the place again to retry.';
  }
}

/** What the weather area shows instead of the weather. */
export type WeatherStatusContent =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly text: string };

/**
 * Decides what to show for a weather state. Returns `null` when nothing
 * replaces the weather: before a place is selected (`idle`) and when the
 * report is there to be shown.
 */
export function describeWeatherStatus(
  state: LoadState<FetchedWeatherReport>,
): WeatherStatusContent | null {
  switch (state.status) {
    case 'idle':
    case 'success':
    case 'refreshFailed':
      return null;
    case 'loading':
      return { kind: 'loading' };
    case 'error':
      return { kind: 'error', text: weatherErrorMessage(state.error) };
  }
}

export type WeatherStatusProps = {
  readonly state: LoadState<FetchedWeatherReport>;
  /** Loads the same place again; shown as "Try again" with an error. */
  readonly onRetry: () => void;
};

/**
 * Loading indicator or error message for the weather of the selected place,
 * on the sky background where the weather hero would be (W-18, W-20).
 */
export function WeatherStatus({ state, onRetry }: WeatherStatusProps) {
  const content = describeWeatherStatus(state);
  if (content === null) {
    return null;
  }

  if (content.kind === 'loading') {
    return (
      <View
        style={styles.status}
        accessible
        accessibilityLabel="Loading weather"
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator size="large" color={skyColors.onSky} />
        <Text style={styles.text}>Loading weather…</Text>
      </View>
    );
  }

  return (
    <View style={styles.status}>
      <MaterialCommunityIcons
        name="weather-cloudy-alert"
        size={iconSize.hero}
        color={skyColors.onSky}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={styles.text} accessibilityRole="alert" accessibilityLiveRegion="polite">
        {content.text}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.m,
  },
  text: {
    color: skyColors.onSky,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  retry: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.l,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: skyColors.card,
    borderWidth: 1,
    borderColor: skyColors.cardBorder,
  },
  retryPressed: {
    opacity: 0.7,
  },
  retryText: {
    color: skyColors.onSky,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
