import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppError } from '../../models/AppError';
import type { FetchedWeatherReport } from '../../models/Weather';
import { skyColors } from '../../theme/sky';
import { MIN_TOUCH_TARGET, iconSize, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatLocalDateTime, isSameLocalDay } from '../../utils/forecastFormatting';
import { formatLocalTime } from '../../utils/weatherFormatting';
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

/** What the notice above the weather says after a failed refresh. */
export type RefreshNoticeContent = {
  readonly text: string;
  /** The same message with the weekday and month in full, for screen readers. */
  readonly accessibilityLabel: string;
};

/**
 * The notice for a failed refresh (W-11, W-18; SPEC D-45), or `null` when
 * there is none. Only `refreshFailed` has one: the old weather is still on
 * screen, and the notice says that it could not be updated and how old it
 * is. The time is the observation time the hero shows ("Observed 10:42"),
 * in the place's local time, so the two always match. When that time is not
 * from today at the place (`nowEpochMs`), e.g. cached weather from yesterday,
 * the date is added: "Showing the weather from Mon 23 Nov, 14:00" (SPEC
 * D-48). Offline errors (`network`, `timeout`) say so; every other error gets
 * the general text.
 */
export function describeRefreshNotice(
  state: LoadState<FetchedWeatherReport>,
  nowEpochMs: number,
): RefreshNoticeContent | null {
  if (state.status !== 'refreshFailed') {
    return null;
  }
  const { report } = state.data;
  const observedEpochMs = report.current.timeEpochMs;
  const isOffline = state.error.kind === 'network' || state.error.kind === 'timeout';
  const reason = isOffline ? 'No connection.' : "Couldn't update the weather.";

  if (isSameLocalDay(observedEpochMs, nowEpochMs, report.utcOffsetSeconds)) {
    const text = `${reason} Showing the weather from ${formatLocalTime(observedEpochMs, report.utcOffsetSeconds)}.`;
    return { text, accessibilityLabel: text };
  }
  const shown = formatLocalDateTime(observedEpochMs, report.utcOffsetSeconds);
  return {
    text: `${reason} Showing the weather from ${shown.text}.`,
    accessibilityLabel: `${reason} Showing the weather from ${shown.spoken}.`,
  };
}

export type RefreshNoticeProps = {
  readonly state: LoadState<FetchedWeatherReport>;
  /** Fetches the weather again; shown as "Try again". */
  readonly onRetry: () => void;
};

/**
 * A short notice on the sky after a failed refresh, with a "Try again"
 * button. The button is the accessible way to retry: pull-to-refresh is hard
 * to do with VoiceOver. Disabled while the retry runs.
 */
export function RefreshNotice({ state, onRetry }: RefreshNoticeProps) {
  const content = describeRefreshNotice(state, Date.now());
  if (content === null) {
    return null;
  }
  const isRetrying = state.status === 'refreshFailed' && state.isRefreshing;

  return (
    <View style={styles.notice}>
      <View style={styles.noticeMessage}>
        <MaterialCommunityIcons
          name="cloud-off-outline"
          size={iconSize.s}
          color={skyColors.onSky}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text
          style={styles.noticeText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={content.accessibilityLabel}
        >
          {content.text}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        accessibilityHint="Fetches the weather again"
        accessibilityState={{ disabled: isRetrying }}
        disabled={isRetrying}
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, styles.noticeRetry, (pressed || isRetrying) && styles.retryPressed]}
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: radius.s,
    borderWidth: 1,
    backgroundColor: skyColors.card,
    borderColor: skyColors.cardBorder,
  },
  noticeMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
  },
  noticeText: {
    flex: 1,
    color: skyColors.onSky,
    fontSize: fontSize.body,
  },
  noticeRetry: {
    paddingHorizontal: spacing.m,
  },
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
