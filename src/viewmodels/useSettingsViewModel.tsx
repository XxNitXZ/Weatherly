import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppError, toAppError } from '../models/AppError';
import { DEFAULT_SETTINGS, type AppSettings } from '../models/AppSettings';
import { loadSettings, saveSettings } from '../repositories/settingsRepository';

/**
 * The settings, shared by every screen (W-10 – W-12; SPEC D-44).
 *
 * Unlike favorites (one ViewModel per screen, read again on focus, SPEC
 * D-40), settings live in one `SettingsProvider` around the navigator:
 * Home, the day detail screen and the settings screen all need them, the
 * day detail screen has no ViewModel of its own, and a change must apply on
 * every screen at once. React context is built in, so no library is needed.
 *
 * - The stored settings are read once, when the app starts. Until then, and
 *   when reading fails, the defaults are used.
 * - A change takes effect immediately and is saved in the background. If the
 *   save fails, the new value stays in use for this session and `saveError`
 *   is set, so the screen can say that it will reset on the next start.
 * - The settings screen keeps its options disabled until `isLoaded`, so a
 *   choice can never be overwritten by the read finishing after it.
 */

export type SettingsViewModel = {
  /** The settings in use: the defaults until the stored ones have been read. */
  readonly settings: AppSettings;
  /** True once reading the stored settings has finished, successfully or not. */
  readonly isLoaded: boolean;
  /** Set when the last save failed; cleared by the next successful save. */
  readonly saveError: AppError | null;
  readonly updateSettings: (change: Partial<AppSettings>) => void;
};

/** `current` with the fields of `change` replaced. Never modifies `current`. */
export function applySettingsChange(current: AppSettings, change: Partial<AppSettings>): AppSettings {
  return { ...current, ...change };
}

/** The notice shown on the settings screen after a failed save. */
export const SETTINGS_SAVE_ERROR_MESSAGE = "Couldn't save. This setting will reset when the app restarts.";

const SettingsContext = createContext<SettingsViewModel | null>(null);

export function SettingsProvider({ children }: { readonly children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<AppError | null>(null);

  useEffect(() => {
    let isActive = true;
    loadSettings()
      .then((stored) => {
        if (isActive) {
          setSettings(stored);
        }
      })
      .catch(() => {
        // Reading failed: keep the defaults (SPEC D-44).
      })
      .finally(() => {
        if (isActive) {
          setLoaded(true);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  const updateSettings = useCallback(
    (change: Partial<AppSettings>) => {
      const next = applySettingsChange(settings, change);
      setSettings(next);
      saveSettings(next)
        .then(() => setSaveError(null))
        .catch((error: unknown) => setSaveError(toAppError(error)));
    },
    [settings],
  );

  const value = useMemo<SettingsViewModel>(
    () => ({ settings, isLoaded, saveError, updateSettings }),
    [settings, isLoaded, saveError, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** The shared settings. Must be used inside `SettingsProvider` (set up in `App.tsx`). */
export function useSettingsViewModel(): SettingsViewModel {
  const viewModel = useContext(SettingsContext);
  if (viewModel === null) {
    throw new Error('useSettingsViewModel must be used inside SettingsProvider');
  }
  return viewModel;
}
