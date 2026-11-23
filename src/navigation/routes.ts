import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Location } from '../models/Location';
import type { DailyForecast } from '../models/Weather';

/**
 * The app's routes and their params, defined once (STYLE.md §3.3; SPEC D-35).
 *
 * Params are small, serialisable plain values. `DayDetail` gets the day the
 * user tapped, so the detail screen sends no request (SPEC D-36).
 *
 * `Favorites` and `Settings` are added in Epic 5 and Epic 6, together with
 * their screens.
 */
export type RootStackParamList = {
  /** The weather-first home screen; it owns search and the selected place. */
  Home: undefined;
  DayDetail: {
    /** The place the forecast is for; its name is the screen title. */
    readonly location: Location;
    /** The forecast day that was tapped. */
    readonly day: DailyForecast;
    /** The report's fixed UTC offset, to show the day's dates and times in local time (SPEC D-31). */
    readonly utcOffsetSeconds: number;
  };
};

/** Typed `navigation` and `route` props for one screen of the root stack. */
export type RootStackScreenProps<RouteName extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  RouteName
>;
