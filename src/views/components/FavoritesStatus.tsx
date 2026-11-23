import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppError } from '../../models/AppError';
import type { Location } from '../../models/Location';
import { colors } from '../../theme/colors';
import { skyColors } from '../../theme/sky';
import { MIN_TOUCH_TARGET, iconSize, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import type { LoadState } from '../../viewmodels/loadState';

/**
 * What the favorites screen and the home screen say about the saved
 * favorites (W-08, W-09; SPEC D-40). Views own the wording (STYLE.md §8):
 * texts are chosen from `error.kind`, and the developer message is never shown.
 */

/** The message when the saved favorites could not be read. */
export function favoritesLoadErrorMessage(error: AppError): string {
  switch (error.kind) {
    case 'parse':
      return 'Your saved favourites could not be read. They have been kept unchanged on this device.';
    case 'storage':
      return "Your favourites could not be loaded from this device's storage. Please try again.";
    case 'network':
    case 'timeout':
    case 'http':
    case 'validation':
    case 'unknown':
      return 'Something went wrong while loading your favourites. Please try again.';
  }
}

/** The message when a change (add, remove, delete all) could not be saved. */
export function favoritesSaveErrorMessage(error: AppError): string {
  switch (error.kind) {
    case 'storage':
      return 'Your change could not be saved on this device. Your favourites are unchanged. Please try again.';
    case 'network':
    case 'timeout':
    case 'http':
    case 'parse':
    case 'validation':
    case 'unknown':
      return 'Something went wrong while saving your favourites. Your favourites are unchanged. Please try again.';
  }
}

/** The texts of the confirmation shown before damaged favorites are deleted. */
export const RESET_FAVORITES_CONFIRMATION = {
  title: 'Delete saved favourites?',
  message:
    'Your saved favourites could not be read. Deleting them removes them from this device for good, and you can then save new favourites. This cannot be undone.',
  confirm: 'Delete',
  cancel: 'Cancel',
} as const;

export const EMPTY_FAVORITES_TITLE = 'No favourites yet';
export const EMPTY_FAVORITES_TEXT =
  'Search for a place, then tap the star next to its name at the top of the weather screen. It will appear here.';

/** What the favorites screen shows instead of the list. */
export type FavoritesStatusContent =
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty'; readonly title: string; readonly text: string }
  | {
      readonly kind: 'error';
      readonly text: string;
      /**
       * Deleting is offered only for damaged data (`parse`). A storage
       * failure may be temporary, so "Try again" is the only action then.
       */
      readonly canReset: boolean;
    };

/**
 * Decides what replaces the favorites list. Returns `null` when the list has
 * entries to show (also while it is read again).
 */
export function describeFavoritesStatus(
  state: LoadState<ReadonlyArray<Location>>,
): FavoritesStatusContent | null {
  switch (state.status) {
    case 'idle':
    case 'loading':
      return { kind: 'loading' };
    case 'error':
      return {
        kind: 'error',
        text: favoritesLoadErrorMessage(state.error),
        canReset: state.error.kind === 'parse',
      };
    case 'success':
    case 'refreshFailed':
      return state.data.length === 0
        ? { kind: 'empty', title: EMPTY_FAVORITES_TITLE, text: EMPTY_FAVORITES_TEXT }
        : null;
  }
}

export type FavoritesStatusProps = {
  readonly state: LoadState<ReadonlyArray<Location>>;
  readonly onRetry: () => void;
  /** Asks the user to confirm, then deletes the damaged favorites. */
  readonly onReset: () => void;
  /** False while a write runs, so the buttons cannot start a second one. */
  readonly isEnabled: boolean;
};

/** Loading, empty or error view of the favorites screen (W-09, W-20). */
export function FavoritesStatus({ state, onRetry, onReset, isEnabled }: FavoritesStatusProps) {
  const content = describeFavoritesStatus(state);
  if (content === null) {
    return null;
  }

  if (content.kind === 'loading') {
    return (
      <View style={styles.status} accessible accessibilityLabel="Loading favourites" accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Loading favourites…</Text>
      </View>
    );
  }

  if (content.kind === 'empty') {
    return (
      <View style={styles.status}>
        <MaterialCommunityIcons
          name="star-outline"
          size={iconSize.hero}
          color={colors.textMuted}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text style={styles.title} accessibilityRole="header">
          {content.title}
        </Text>
        <Text style={styles.text}>{content.text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.status}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={iconSize.hero}
        color={colors.error}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={styles.text} accessibilityRole="alert" accessibilityLiveRegion="polite">
        {content.text}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        accessibilityState={{ disabled: !isEnabled }}
        disabled={!isEnabled}
        onPress={onRetry}
        style={({ pressed }) => [
          styles.button,
          styles.buttonPrimary,
          pressed && styles.pressed,
          !isEnabled && styles.disabled,
        ]}
      >
        <Text style={styles.buttonPrimaryText}>Try again</Text>
      </Pressable>
      {content.canReset && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete saved favourites"
          accessibilityHint="Asks for confirmation before deleting"
          accessibilityState={{ disabled: !isEnabled }}
          disabled={!isEnabled}
          onPress={onReset}
          style={({ pressed }) => [
            styles.button,
            styles.buttonDestructive,
            pressed && styles.pressed,
            !isEnabled && styles.disabled,
          ]}
        >
          <Text style={styles.buttonDestructiveText}>Delete saved favourites</Text>
        </Pressable>
      )}
    </View>
  );
}

export type FavoritesSaveNoticeProps = {
  readonly error: AppError;
  /** `sky` on the home screen's sky background, `light` on the favorites screen. */
  readonly tone: 'sky' | 'light';
};

/** A short notice that the last change to the favorites could not be saved. */
export function FavoritesSaveNotice({ error, tone }: FavoritesSaveNoticeProps) {
  const isSky = tone === 'sky';
  return (
    <View style={[styles.notice, isSky ? styles.noticeSky : styles.noticeLight]}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={iconSize.s}
        color={isSky ? skyColors.onSky : colors.error}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text
        style={[styles.noticeText, isSky ? styles.noticeTextSky : styles.noticeTextLight]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        {favoritesSaveErrorMessage(error)}
      </Text>
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
  title: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  text: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  button: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.l,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPrimaryText: {
    color: colors.onPrimary,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  buttonDestructive: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.background,
  },
  buttonDestructiveText: {
    color: colors.error,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: radius.s,
    borderWidth: 1,
  },
  noticeSky: {
    backgroundColor: skyColors.card,
    borderColor: skyColors.cardBorder,
  },
  noticeLight: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.body,
  },
  noticeTextSky: {
    color: skyColors.onSky,
  },
  noticeTextLight: {
    color: colors.text,
  },
});
