import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Location } from '../models/Location';
import type { DailyForecast } from '../models/Weather';

/**
 * The app's routes and their params, defined once (STYLE.md §3.3; SPEC D-35).
 *
 * Params are small, serialisable plain values. `DayDetail` gets the day the
 * user tapped, so the detail screen sends no request (SPEC D-36).
 */
export type RootStackParamList = {
  /**
   * The weather-first home screen; it owns search and the selected place.
   * `selectedLocation` is set when another screen hands a place back, e.g. a
   * favorite chosen on `Favorites` (SPEC D-40): Home then loads its weather
   * through the same flow as a search result, and clears the param.
   */
  Home: { readonly selectedLocation?: Location } | undefined;
  DayDetail: {
    /** The place the forecast is for; its name is the screen title. */
    readonly location: Location;
    /** The forecast day that was tapped. */
    readonly day: DailyForecast;
    /** The report's fixed UTC offset, to show the day's dates and times in local time (SPEC D-31). */
    readonly utcOffsetSeconds: number;
  };
  /** The saved favorite places (W-09). It reads them itself, so it needs no params. */
  Favorites: undefined;
  /** The user's settings (W-10). It reads them itself, so it needs no params. */
  Settings: undefined;
};

/** Typed `navigation` and `route` props for one screen of the root stack. */
export type RootStackScreenProps<RouteName extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  RouteName
>;
