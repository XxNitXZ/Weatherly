import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toAppError, type AppError } from '../models/AppError';
import type { RefreshIntervalMinutes } from '../models/AppSettings';
import type { Location } from '../models/Location';
import type { FetchedWeatherReport } from '../models/Weather';
import { getReport } from '../repositories/weatherRepository';
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

type WeatherScreenState = {
  readonly location: Location | null;
  readonly weather: LoadState<FetchedWeatherReport>;
};

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
 * Caching is added in Epic 7. Navigation and the moments that trigger a
 * refresh stay in the screen (STYLE.md §3.3).
 */
export function useWeatherViewModel(): WeatherViewModel {
  const [screenState, setScreenState] = useState<WeatherScreenState>({
    location: null,
    weather: { status: 'idle' },
  });
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

  const forecast = useMemo(() => forecastForState(screenState.weather), [screenState.weather]);

  return { location: screenState.location, state: screenState.weather, forecast, load, refresh, refreshIfStale };
}
