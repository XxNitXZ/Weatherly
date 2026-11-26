import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toAppError, type AppError } from '../models/AppError';
import type { RefreshIntervalMinutes } from '../models/AppSettings';
import type { Location } from '../models/Location';
import type { CachedWeatherReport, FetchedWeatherReport } from '../models/Weather';
import { getReport, loadLastReport, saveLastReport } from '../repositories/weatherRepository';
import { selectForecast, type ForecastSelection } from '../utils/forecastSelection';
import { isStale } from '../utils/refreshPolicy';
import { isSameLocation } from '../utils/locationFormatting';
import { createLatestRequestGuard } from './latestRequest';
import type { LoadState } from './loadState';

export type WeatherViewModel = {
  /**
   * The selected location, exactly as it was passed to `load`: its
   * coordinates are the ones the weather was requested for. `null` until
   * the user selects a place.
   */
  readonly location: Location | null;
  /** The weather for `location`: idle, loading, the report, or an error. */
  readonly state: LoadState<FetchedWeatherReport>;
  /**
   * The forecast entries to show, chosen from the same report as the current
   * weather; `null` while there is no report.
   */
  readonly forecast: ForecastSelection | null;
  /**
   * False until the start-up check of the cache has finished, whether it
   * found an entry or not, or until a place is chosen (NIT-274; SPEC D-51).
   * Until then the screen cannot know if this is a first launch, so it shows
   * a neutral loading view instead of the welcome panel.
   */
  readonly isCacheChecked: boolean;
  /** Selects a location and loads its weather (W-04). */
  readonly load: (location: Location) => void;
  /**
   * Fetches the weather of the current place again, keeping the shown
   * weather until the new one arrives (W-11; SPEC D-45). Does nothing
   * without weather on screen or while a load or refresh runs.
   */
  readonly refresh: () => void;
  /** `refresh()`, but only when the shown weather is at least `intervalMinutes` old (`isStale`). */
  readonly refreshIfStale: (intervalMinutes: RefreshIntervalMinutes) => void;
  /**
   * For the app's start: shows the cached place and its weather (W-16; SPEC
   * D-47), then fetches it again if it is at least `intervalMinutes` old
   * (`shouldRefresh`; SPEC D-48), keeping the cached weather on screen while
   * that runs. Does nothing once a place has been chosen, or when there is no
   * usable cache entry.
   */
  readonly restoreLastReport: (intervalMinutes: RefreshIntervalMinutes) => void;
};

/**
 * True when `next` is the location whose weather is already loading or
 * shown, so loading it again would only repeat the same request.
 */
export function isRepeatedWeatherLoad(next: Location, active: Location | null): boolean {
  return active !== null && isSameLocation(next, active);
}

/**
 * The forecast to show for a weather state (W-05, W-06), or `null` when there
 * is no report. "Now" is the time the report was fetched, so the choice of
 * days and hours matches the data and is the same on every render.
 */
export function forecastForState(state: LoadState<FetchedWeatherReport>): ForecastSelection | null {
  if (state.status !== 'success' && state.status !== 'refreshFailed') {
    return null;
  }
  return selectForecast(state.data.report, state.data.fetchedAtEpochMs);
}

type WeatherState = LoadState<FetchedWeatherReport>;

/** True when `state` shows weather and no refresh is running, so a refresh may start. */
function canRefresh(state: WeatherState): state is Extract<WeatherState, { status: 'success' | 'refreshFailed' }> {
  return (state.status === 'success' || state.status === 'refreshFailed') && !state.isRefreshing;
}

/**
 * Whether to refresh now (W-11; SPEC D-45): only with weather on screen, no
 * refresh running, and data that `isStale` at `nowEpochMs`. Before a place is
 * chosen, while loading and after a failed first load, the answer is no;
 * there the user loads with search or "Try again".
 */
export function shouldRefresh(
  state: WeatherState,
  nowEpochMs: number,
  intervalMinutes: RefreshIntervalMinutes,
): boolean {
  return canRefresh(state) && isStale(state.data.fetchedAtEpochMs, nowEpochMs, intervalMinutes);
}

/** The state while a refresh runs: the shown weather (and an earlier refresh error) stays. */
export function startRefresh(state: WeatherState): WeatherState {
  return canRefresh(state) ? { ...state, isRefreshing: true } : state;
}

/** The state after a successful refresh: the new report, and no earlier refresh error. */
export function finishRefresh(data: FetchedWeatherReport): WeatherState {
  return { status: 'success', data, isRefreshing: false };
}

/**
 * The state after a failed refresh: the old report stays on screen with the
 * error attached, so the View can say that it could not be updated.
 */
export function failRefresh(state: WeatherState, error: AppError): WeatherState {
  if (state.status !== 'success' && state.status !== 'refreshFailed') {
    return state;
  }
  return { status: 'refreshFailed', data: state.data, error, isRefreshing: false };
}

export type WeatherScreenState = {
  readonly location: Location | null;
  readonly weather: LoadState<FetchedWeatherReport>;
};

/**
 * Whether the cached place may be restored (SPEC D-47): only before any
 * place has been chosen (`idle`). Once the user has loaded a place, even one
 * that failed, the cache must not replace it.
 */
export function shouldRestore(state: WeatherState): boolean {
  return state.status === 'idle';
}

/**
 * The screen state for a cache entry: exactly what a successful load of
 * that place gives, so the screen needs no special case for restored data.
 */
export function stateFromCache(cached: CachedWeatherReport): WeatherScreenState {
  return {
    location: cached.location,
    weather: {
      status: 'success',
      data: { report: cached.report, fetchedAtEpochMs: cached.fetchedAtEpochMs },
      isRefreshing: false,
    },
  };
}

/**
 * Reads the cache entry for the app's start and turns it into a screen
 * state: `stateFromCache` of the entry, or `null` when there is nothing
 * usable (first launch, a damaged or outdated entry, a storage that cannot be
 * read). Never rejects: `loadLastReport` already turns every failure into
 * `null`, and anything unexpected counts as "no cache" too, so the start can
 * never get stuck on the loading view.
 */
export function readRestoredState(): Promise<WeatherScreenState | null> {
  return loadLastReport().then(
    (cached) => (cached === null ? null : stateFromCache(cached)),
    () => null,
  );
}

/**
 * Saves the weather the user now sees as the cache entry (SPEC D-47). Called
 * only for the newest request, so a slower answer for a place the user has
 * already left is never saved. Not awaited, and a failed save is ignored:
 * the weather was fetched, only the copy on the device is missing.
 */
function rememberReport(location: Location, data: FetchedWeatherReport): void {
  saveLastReport({ location, ...data }).catch(() => undefined);
}

/**
 * ViewModel for the selected location and its weather (W-04; STYLE.md §3.2,
 * steps 5–8). Both search modes end here: the screen passes the chosen
 * `Location` to `load`.
 *
 * State flow for `load(location)`:
 * - same location as the one loading or shown → nothing happens (no request)
 * - otherwise → `location` is updated and `state` becomes `loading` at once,
 *   so the weather of the previous place disappears; then
 *   - `success` with the report from `weatherRepository.getReport`
 *   - `error` with the AppError (network, timeout, http, parse, unknown);
 *     selecting the same place again then retries
 *
 * Location and weather are set together in one state value, so the screen
 * never shows the weather of one place under the name of another. Only the
 * newest load may update the state (`createLatestRequestGuard`), which also
 * ignores answers that arrive after the screen is gone.
 *
 * Refreshing (W-11; SPEC D-45): `refresh` fetches the same place again while
 * the shown weather stays (`isRefreshing`); a failure keeps it as
 * `refreshFailed`. `refreshIfStale` does this only when the data is at least
 * the chosen interval old. A refresh uses the same request guard, so its
 * answer is ignored once another place has been chosen.
 *
 * Cache (W-16; SPEC D-47): after every successful load or refresh that is
 * still the newest, the report and its place are saved as the one cache
 * entry. `restoreLastReport` shows that entry at the app's start, before any
 * request; it uses the same request guard, so a place chosen meanwhile wins.
 * If the entry is stale, it then refreshes like any shown weather, so a
 * failure offline keeps the cached weather as `refreshFailed` (SPEC D-48).
 * `isCacheChecked` turns true in the same render as the restored weather, so
 * the screen never shows the first-launch welcome panel in between (SPEC
 * D-51).
 *
 * Navigation and the moments that trigger a refresh or a restore stay in the
 * screen (STYLE.md §3.3).
 */
export function useWeatherViewModel(): WeatherViewModel {
  const [screenState, setScreenState] = useState<WeatherScreenState>({
    location: null,
    weather: { status: 'idle' },
  });
  const [isCacheChecked, setCacheChecked] = useState(false);
  const [requestGuard] = useState(createLatestRequestGuard);
  // The location whose weather is loading or shown; null after an error.
  const activeLocation = useRef<Location | null>(null);
  // The latest screen state, for callers that keep an old copy of these
  // functions (e.g. the app-state listener, which is set up once).
  const latestState = useRef(screenState);
  latestState.current = screenState;

  useEffect(() => {
    // The screen is gone: make every running load outdated.
    return () => requestGuard.cancelAll();
  }, [requestGuard]);

  async function runLoad(location: Location, requestId: number): Promise<void> {
    try {
      const weather = await getReport(location.coordinates);
      if (requestGuard.isLatest(requestId)) {
        setScreenState({ location, weather: { status: 'success', data: weather, isRefreshing: false } });
        rememberReport(location, weather);
      }
    } catch (error) {
      if (requestGuard.isLatest(requestId)) {
        activeLocation.current = null;
        setScreenState({ location, weather: { status: 'error', error: toAppError(error) } });
      }
    }
  }

  function load(location: Location): void {
    if (isRepeatedWeatherLoad(location, activeLocation.current)) {
      return;
    }
    const requestId = requestGuard.start();
    activeLocation.current = location;
    // A chosen place replaces whatever the cache check would have found.
    setCacheChecked(true);
    setScreenState({ location, weather: { status: 'loading' } });
    void runLoad(location, requestId);
  }

  // `refresh` and `refreshIfStale` keep the same identity across renders, so
  // the screen's focus and app-state effects do not run again on every render.
  const refresh = useCallback((): void => {
    const { location, weather } = latestState.current;
    if (location === null || !canRefresh(weather)) {
      return;
    }
    const requestId = requestGuard.start();
    const refreshing: WeatherScreenState = { location, weather: startRefresh(weather) };
    // Updated at once, so a second trigger in the same moment sees the
    // running refresh and does not start another one.
    latestState.current = refreshing;
    setScreenState(refreshing);

    getReport(location.coordinates).then(
      (data) => {
        if (requestGuard.isLatest(requestId)) {
          setScreenState({ location, weather: finishRefresh(data) });
          rememberReport(location, data);
        }
      },
      (error: unknown) => {
        if (requestGuard.isLatest(requestId)) {
          setScreenState((current) => ({ location, weather: failRefresh(current.weather, toAppError(error)) }));
        }
      },
    );
  }, [requestGuard]);

  const refreshIfStale = useCallback(
    (intervalMinutes: RefreshIntervalMinutes): void => {
      if (shouldRefresh(latestState.current.weather, Date.now(), intervalMinutes)) {
        refresh();
      }
    },
    [refresh],
  );

  const restoreLastReport = useCallback(
    (intervalMinutes: RefreshIntervalMinutes): void => {
      if (!shouldRestore(latestState.current.weather)) {
        // A place is already shown or loading: there is nothing to check.
        setCacheChecked(true);
        return;
      }
      const requestId = requestGuard.start();
      void readRestoredState().then((restored) => {
        // Outdated: a place chosen meanwhile, or a newer restore, owns the
        // screen and marks the check as finished itself.
        if (!requestGuard.isLatest(requestId)) {
          return;
        }
        // Set together with the restored state below: React renders both at
        // once, so the welcome panel never flashes before the cached weather.
        setCacheChecked(true);
        if (restored === null) {
          return;
        }
        activeLocation.current = restored.location;
        // Updated at once, so `refresh` below sees the restored weather
        // before React has rendered it.
        latestState.current = restored;
        setScreenState(restored);
        if (shouldRefresh(restored.weather, Date.now(), intervalMinutes)) {
          refresh();
        }
      });
    },
    [requestGuard, refresh],
  );

  const forecast = useMemo(() => forecastForState(screenState.weather), [screenState.weather]);

  return {
    location: screenState.location,
    state: screenState.weather,
    forecast,
    isCacheChecked,
    load,
    refresh,
    refreshIfStale,
    restoreLastReport,
  };
}
