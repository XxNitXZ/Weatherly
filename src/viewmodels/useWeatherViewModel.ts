import { useEffect, useMemo, useRef, useState } from 'react';
import { toAppError } from '../models/AppError';
import type { Location } from '../models/Location';
import type { FetchedWeatherReport } from '../models/Weather';
import { getReport } from '../repositories/weatherRepository';
import { selectForecast, type ForecastSelection } from '../utils/forecastSelection';
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
 * Caching and refreshing are added in Epic 7. Navigation stays in the screen
 * (STYLE.md §3.3).
 */
export function useWeatherViewModel(): WeatherViewModel {
  const [screenState, setScreenState] = useState<WeatherScreenState>({
    location: null,
    weather: { status: 'idle' },
  });
  const [requestGuard] = useState(createLatestRequestGuard);
  // The location whose weather is loading or shown; null after an error.
  const activeLocation = useRef<Location | null>(null);

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

  const forecast = useMemo(() => forecastForState(screenState.weather), [screenState.weather]);

  return { location: screenState.location, state: screenState.weather, forecast, load };
}
