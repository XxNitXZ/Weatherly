# Weatherly – Style & Architecture Guide

> Defines how code in this repository is structured and written. Created in NIT-203.
> When this guide and the code disagree, fix the code or update this guide in the same pull request.

## 1. Philosophy

- **Simple first.** Use the smallest design that meets the requirement in [SPEC.md](SPEC.md). This is a two-person course project, not a framework.
- **Explainable.** Every file must be explainable by both students at the oral examination.
- **Separated.** Each layer has one responsibility (see §3). Business logic never lives in a view.
- **Typed.** The compiler is the first reviewer.
- **Verified.** Code is done when it type-checks, is tested where required, and has been run on both platforms.

## 2. TypeScript

- `strict: true` is enabled in `tsconfig.json` and must stay enabled.
- No `any`. Use `unknown` for untrusted data (API JSON, storage) and narrow it in parsers.
- Prefer `type` aliases for data models and discriminated unions for state. Use `interface` only when extension is genuinely needed.
- Model types are read-only data. Use `readonly` fields and `ReadonlyArray<T>` where practical.
- Exported functions have explicit parameter and return types.
- No non-null assertions (`!`) unless a comment explains why the value cannot be null.
- `npx tsc --noEmit` must pass before every commit that is pushed.

## 3. MVVM Architecture

| Layer | Folder | Responsibility | Must **not** |
|---|---|---|---|
| **Model** | `src/models/` | Plain TypeScript types for app data (`Location`, `WeatherReport`, `AppSettings`…). | Import React, services or storage. |
| **View** | `src/views/` | Render ViewModel state; forward user events to ViewModel functions; layout and styling. Screens own navigation calls (`navigation.navigate`) and pass route params to their ViewModel. | Call `fetch`, read storage, parse JSON, hold business rules. |
| **ViewModel** | `src/viewmodels/` | Custom hooks (`useXxxViewModel`) that hold screen state, loading/error state, and user intents (`search()`, `refresh()`, `toggleFavorite()`). | Render JSX, call `fetch` directly, know API JSON shapes, import or call React Navigation. |
| **Navigation** | `src/navigation/` | Navigator setup and typed route-parameter lists. | Contain business logic or data fetching. |
| **Repository** | `src/repositories/` | Single source of truth per data type. Combines a service with its parser so callers receive typed models. `weatherRepository` also decides between cache and network and applies refresh policy and offline fallback; `locationRepository` stays thin (service + parser only, no caching; SPEC D-17). | Know about React or UI. |
| **API service** | `src/services/api/` | Build URLs, perform HTTP requests, map HTTP failures to `AppError`. Return raw `unknown` JSON. | Parse into models, cache, touch UI. |
| **Parser** | `src/parsers/` | Pure functions: `unknown` JSON → typed Model, or throw `AppError('parse')`. | Do I/O. |
| **Storage** | `src/storage/` | Thin wrapper around the persistence library (D-08); JSON (de)serialisation of stored values. | Contain business rules. |
| **Utils** | `src/utils/` | Pure helpers (coordinate validation, refresh policy, unit conversion, formatting). | Do I/O. |

The dependency direction is **View → ViewModel → Repository → Service/Parser/Storage → Model**. A lower layer never imports from a higher layer.

### 3.1 Layer Contracts

**Exists** means the file is in the repository. **Planned** contracts describe intent only: no code exists, and each signature is finalised in the user story that implements it. Do not create stubs for planned modules ahead of their story.

| Module | Contract | Status |
|---|---|---|
| `src/models/AppError.ts` | `AppErrorKind` union (`network`, `timeout`, `http`, `parse`, `validation`, `storage`, `unknown`) and `AppError` class (`kind`, developer-only `message`). The only error type that crosses a layer boundary (§8). `toAppError(error: unknown): AppError` turns anything caught into an `AppError`. | **Exists** (`toAppError`, `unknown`: NIT-207) |
| `src/models/Location.ts` | `Coordinates` (`latitude`, `longitude`) and `Location` (`name`, optional `region`/`country`, `coordinates`). | **Exists** |
| `src/viewmodels/loadState.ts` | `LoadState<T>`, the ViewModel → View state contract (§7). | **Exists** |
| `src/services/api/httpClient.ts` | `getJson(url, { timeoutMs }): Promise<unknown>`, the only caller of `fetch`. Throws `AppError`: `network` (no connection), `timeout` (`AbortController`), `http` (status outside 200–299), `parse` (body is not JSON). | **Exists** (NIT-212) |
| `src/services/api/geocodingService.ts` | `buildSearchUrl(query): string` (`name`, `count=10`, `language=sv`, `format=json`, encoded) and `fetchLocations(query): Promise<unknown>` (10 s timeout) for Open-Meteo Geocoding (SPEC D-24). | **Exists** (NIT-206) |
| `src/services/api/weatherService.ts` | `buildForecastUrl(coordinates): string` builds the Open-Meteo URL from named field lists (`CURRENT_FIELDS`, `HOURLY_FIELDS`, `DAILY_FIELDS`) that match the parser. `fetchForecast(coordinates): Promise<unknown>` calls `getJson` with a 10 s timeout. | **Exists** (NIT-211, NIT-212) |
| `src/parsers/geocodingParser.ts` | `parseGeocodingResponse(json: unknown): ReadonlyArray<Location>`. No `results` key → `[]`. `name`, `latitude`, `longitude` required; `admin1` → `region` and `country` optional. Throws `AppError('parse', …)` with the path. | **Exists** (NIT-206) |
| `src/parsers/jsonReaders.ts` | Shared readers for parsers (`readObject`, `readString`, `readOptionalString`, `readNumber`, `readOptionalNumber`, `readArray`) that throw `AppError('parse')` with the field path. | **Exists** (NIT-206) |
| `src/parsers/weatherParser.ts` | `parseWeatherResponse(json: unknown): WeatherReport`. Throws `AppError('parse', …)` with the field path. Optional `null`/missing values become `undefined`. | **Exists** (NIT-215) |
| `src/repositories/locationRepository.ts` | `searchLocations(query): Promise<ReadonlyArray<Location>>`: `fetchLocations` → `parseGeocodingResponse`. No caching or other behaviour (SPEC D-17). Errors pass through unchanged. | **Exists** (NIT-206) |
| `src/repositories/weatherRepository.ts` | `getReport(coordinates): Promise<FetchedWeatherReport>`: `fetchForecast` → `parseWeatherResponse` → `{ report, fetchedAtEpochMs }` (SPEC D-18). Errors pass through unchanged. Planned: cache, refresh policy, and reporting a fallback to a cached entry after a failed refresh (§11). | **Exists** without cache (NIT-212); cache planned (NIT-182, NIT-183) |
| `src/repositories/favoritesRepository.ts`, `settingsRepository.ts` | Read and write favourites and settings through `keyValueStorage`. | Planned (NIT-177, NIT-179 – NIT-181) |
| `src/storage/keyValueStorage.ts` | Get (`unknown`) and set JSON values; the only importer of AsyncStorage (D-08). | Planned (NIT-182) |
| `src/viewmodels/useSearchViewModel.ts` | `{ state: LoadState<ReadonlyArray<Location>>, search(query) }`. Empty query → `error` with `AppError('validation')`, no request. Only the latest search may update the state (search counter; also ignores results after unmount). Repeating the query that is loading or shown sends no request; after an error it can be searched again (SPEC D-28). `prepareSearchQuery(raw): string \| null` and `isRepeatedSearch(query, activeQuery): boolean` are the pure, tested rules. | **Exists** (NIT-207; repeat guard NIT-218) |
| `src/viewmodels/useCoordinateSearchViewModel.ts` | `{ latitudeError?, longitudeError?, submit(latitudeText, longitudeText): Location \| null }`. Invalid input → field errors and `null`, no request. Valid → a `Location` named by its coordinates (e.g. `59.33, 18.07`). | **Exists** (NIT-209) |
| `src/utils/coordinateValidation.ts` | `validateCoordinates(latitudeText, longitudeText)` → `{ isValid: true, coordinates }` or `{ isValid: false, latitudeError?, longitudeError? }` with `'empty' \| 'notANumber' \| 'outOfRange'`. Strict decimal format, `.` or `,` (SPEC D-25); bounds [-90, 90] and [-180, 180], inclusive. | **Exists** (NIT-209) |
| `src/views/components/CoordinateSearchForm.tsx` | Presentational form: latitude/longitude fields with inline error messages and a "Show weather" button. Props: `latitudeError?`, `longitudeError?`, `onSubmit(latitudeText, longitudeText)`. `coordinateErrorMessage(field, error)` owns the wording. iOS uses the `numbers-and-punctuation` keyboard (minus sign). Used by `LocationSearchSheet`. | **Exists** (NIT-208) |
| `src/views/screens/HomeScreen.tsx` | Weather-first home screen (SPEC D-22, D-33): `HomeHeader`, then `WelcomePanel`, `WeatherStatus` or `WeatherHero` + forecast cards, on the day/night sky. Owns the three ViewModels and passes the search ones to `LocationSearchSheet`; choosing a place closes the sheet and calls `load(location)` (D-30). Holds only whether the sheet is open. Body is a vertical `ScrollView` (§6). | **Exists** (NIT-217 – NIT-219, NIT-170 – NIT-172, redesign) |
| `src/navigation/routes.ts` | `RootStackParamList`: `Home: undefined`; `DayDetail: { location: Location, day: DailyForecast, utcOffsetSeconds: number }` (SPEC D-36). `RootStackScreenProps<RouteName>` types a screen's `navigation` and `route`. Types only. | **Exists** (NIT-229) |
| `src/navigation/RootNavigator.tsx` | One native stack (SPEC D-35): `Home` (native header hidden) and `DayDetail` (native header, title = place name, back button and swipe-back). | **Exists** (NIT-229) |
| `src/views/screens/DayDetailScreen.tsx` | Detail screen for one day (W-07), built only from its route params; sends no request (D-36). Minimal in NIT-229: weekday, date and place details. US-04.02 and US-04.03 add the weather. | **Exists**, minimal (NIT-229) |
| `src/viewmodels/useWeatherViewModel.ts` | `{ location: Location \| null, state: LoadState<FetchedWeatherReport>, forecast: ForecastSelection \| null, load(location) }`. Location and weather in one state value; same location as loading/shown → no request; after an error, `load` again retries. Only the newest load may update the state. `forecast` comes from the same report via `forecastForState(state)`, as of `fetchedAtEpochMs` (SPEC D-32). `isRepeatedWeatherLoad` and `forecastForState` are pure and tested. No cache yet (Epic 7). | **Exists** (NIT-170; `forecast` NIT-171, NIT-172) |
| `src/utils/forecastSelection.ts` | `selectForecast(report, nowEpochMs): ForecastSelection` (`days`, `todayDateEpochMs?`, `todayHours`), built from `selectForecastDays`, `selectRemainingHoursToday`, `findTodayIndex` and `findTodayBounds`. "Today" uses the API's day boundaries (SPEC D-31). Filters only; never creates or reorders entries. | **Exists** (NIT-171, NIT-172) |
| `src/utils/forecastFormatting.ts` | `formatDayLabel(dateEpochMs, utcOffsetSeconds)` (read at local noon), `presentDailyForecast(day, utcOffsetSeconds, isToday)`, `presentHourlyForecast(hour, utcOffsetSeconds)`; for the redesigned rows, `presentForecastDayRow` (adds icon, `highShort`, `lowShort`) and `presentForecastHourItem(hour, offset, daily, nowEpochMs)` (adds "Now", icon, `temperatureShort`). English names, no `Intl`. | **Exists** (NIT-171, NIT-172, redesign) |
| `src/views/components/DailyForecastList.tsx`, `DailyForecastRow.tsx` | Seven-day `WeatherCard`: plain mapped rows (not a `FlatList`, §6) with dividers, empty message; a compact row shows "Today"/weekday and date, icon, low, high; today highlighted. | **Exists** (NIT-171, redesign) |
| `src/views/components/HourlyForecastList.tsx`, `HourlyForecastItem.tsx` | "Rest of today" `WeatherCard`: horizontal `FlatList` of hours ("Now"/time, icon, temperature), or a message when no hour is left. | **Exists** (NIT-172, redesign) |
| `src/viewmodels/latestRequest.ts` | `createLatestRequestGuard(): { start(): number, isLatest(id): boolean, cancelAll() }`, the request-ordering rule as a plain, tested object. Used by `useWeatherViewModel`. | **Exists** (NIT-170) |
| `src/utils/weatherCode.ts` | `describeWeatherCode(code): string` from the Open-Meteo WMO table; `UNKNOWN_WEATHER_DESCRIPTION` for unlisted codes (SPEC D-29). | **Exists** (NIT-170) |
| `src/utils/weatherFormatting.ts` | `formatTemperature`, `formatTemperatureShort` ("2°"), `formatPercent`, `formatWindSpeed`, `formatLocalTime(epochMs, utcOffsetSeconds)`, `presentCurrentWeather(current, utcOffsetSeconds): CurrentWeatherPresentation` (optional values stay `undefined`) and `presentWeatherHero(current, offset, today?)`. The rounding policy of §12. | **Exists** (NIT-170, redesign) |
| `src/views/components/WeatherHero.tsx` | The current weather as the screen's hero (SPEC D-33): icon, large temperature, condition, today's high/low, feels-like/humidity/wind, observation time. Props: `current`, `utcOffsetSeconds`, `today?`. Texts from `presentWeatherHero`. Replaced `CurrentWeatherCard`. | **Exists** (redesign) |
| `src/views/components/HomeHeader.tsx`, `WelcomePanel.tsx`, `WeatherCard.tsx`, `WeatherIcon.tsx` | Header with the selected place and a search button; first-launch panel; the shared glass card; the icon wrapper (hidden from screen readers). | **Exists** (redesign) |
| `src/views/screens/LocationSearchSheet.tsx` | Modal search sheet with both modes (place name, coordinates), results and status; receives `searchViewModel` and `coordinateViewModel` from `HomeScreen`, so results survive closing it. Choosing a place calls `onSelectLocation`. | **Exists** (redesign) |
| `src/utils/weatherIcon.ts` | `weatherIconName(code, isDay): WeatherIconName` (MaterialCommunityIcons glyph names) and `isDaytimeAt(timeEpochMs, daily)` from the real sunrise/sunset (SPEC D-34). | **Exists** (redesign) |
| `src/theme/sky.ts` | Sky gradients (day/night), base colours, text and glass-card colours with computed WCAG contrast, card shadow, `skyVariantFor(isDay)`. | **Exists** (redesign) |
| `src/views/components/WeatherStatus.tsx` | Loading indicator, or error message with a "Try again" button (`onRetry`), on the sky. `describeWeatherStatus(state)` (pure) and `weatherErrorMessage(error)` own the decision and the wording. | **Exists** (NIT-170, redesign) |
| `src/views/components/CitySearchForm.tsx` | Presentational place-name field and "Search" button. Props: `onSubmit(query)` with the raw text. | **Exists** (NIT-217) |
| `src/views/components/SearchModeSwitch.tsx` | `SearchMode` (`'city' \| 'coordinates'`) and two tabs. Props: `mode`, `onChangeMode(mode)`. | **Exists** (NIT-217) |
| `src/views/components/SearchStatus.tsx` | What the result area shows when there is no list: loading, hint, "no places found" or error. `describeSearchStatus(state): SearchStatusContent \| null` (pure) and `searchErrorMessage(error): string` own the decision and the wording (§8). | **Exists** (NIT-218) |
| `src/views/components/LocationResultItem.tsx` | One selectable result: name plus region and country, `Selected` mark. Props: `location`, `isSelected`, `onSelect(location)`. | **Exists** (NIT-219) |
| `src/utils/locationFormatting.ts` | Pure display helpers: `formatLocationDetails(location): string \| undefined`, `formatCoordinates(coordinates): string`, `isSameLocation(a, b): boolean`. | **Exists** (NIT-219) |
| `src/theme/colors.ts`, `spacing.ts`, `typography.ts` | Design tokens (§12). **Minimal starting set**: only the tokens the existing components use (US-02.04, extended in US-03.01, e.g. `surface`, `primarySubtle`, `CONTENT_MAX_WIDTH`). The visual design system is defined in US-08.01. | **Exists**, minimal (NIT-208, NIT-217) |
| `src/viewmodels/use…ViewModel.ts` (others) | Expose `LoadState<T>` plus intent functions (`refresh`, …). Never receive `navigation`. | Planned (NIT-174, …) |
| `src/navigation/routes.ts`, `RootNavigator.tsx` | Typed route params and navigator setup. | Planned (NIT-173; SPEC OQ-05) |
| `src/models/Weather.ts` | `CurrentWeather`, `HourlyForecast`, `DailyForecast` and `WeatherReport` (`timezone`, `utcOffsetSeconds`, `current`, `hourly`, `daily`). Written against a real Open-Meteo response. Times in `…EpochMs`, units in field names, API `null` values as optional fields. | **Exists** (NIT-214) |
| `src/models/AppSettings.ts` | Settings model, written in the settings story. | Planned (NIT-179 – NIT-181) |

### 3.2 Search-to-Forecast Data Flow

Steps 1–6 and 8 exist (US-03.01 – US-03.04), without the cache:
- `useWeatherViewModel` holds the chosen `Location`, calls `weatherRepository.getReport` and maps the result to `success` or `error`.
- From the same report, `forecastForState` chooses today's remaining hours and the seven days.
- `HomeScreen` shows the current conditions, the rest of today and the seven-day forecast.

Planned: the cache and `refreshFailed` in step 7 (Epic 7), and step 9 (Epic 4). In the planned parts, only the types in **bold** exist today.

Search and forecast share one screen, `HomeScreen` (SPEC D-22). It uses two ViewModels: `useSearchViewModel` for search and `useWeatherViewModel` for the forecast.

1. **LocationSearchSheet** (View, opened from `HomeScreen`'s search button; SPEC D-33): the user submits a place name. The sheet calls `search(query)` from `useSearchViewModel`, which `HomeScreen` owns and passes in. It never calls an API.
2. **useSearchViewModel**: trims the query. Empty input sends no request (W-01). Otherwise it sets `LoadState` to `loading` and calls `locationRepository.searchLocations(query)`.
3. **locationRepository** → `geocodingService` (returns `unknown` JSON through `httpClient`) → `geocodingParser` (returns **`Location`** values or throws **`AppError`**).
4. The ViewModel sets `success` with the locations, or `error` with the **`AppError`**. HomeScreen renders the result list, an empty state or an error.
5. **User selects a location:** HomeScreen passes it to `useWeatherViewModel`. No navigation happens; the forecast appears on the same screen.
   - Coordinate search (W-03) skips steps 2–4. `useCoordinateSearchViewModel` validates the input with `validateCoordinates` (`src/utils/coordinateValidation.ts`) and builds a **`Location`** directly; no network request is needed.
6. **useWeatherViewModel** sets `loading` and calls `weatherRepository`.
7. **weatherRepository** reads the cache through `keyValueStorage`:
   - If the entry is fresh (`refreshPolicy`), it returns it. This is a normal result, not an offline state.
   - Otherwise it calls `weatherService`, parses the response with `weatherParser`, stores the report with `fetchedAtEpochMs`, and returns it.
   - If that refresh fails and a cached entry exists, it returns the entry and reports the **`AppError`** that occurred. With no cached entry, it throws the error.
8. **useWeatherViewModel** maps the result to `success`, `refreshFailed` (cached data plus an error) or `error` (**`LoadState<T>`**, §7). HomeScreen renders the current conditions, today's hourly forecast and the seven-day summary and, for `refreshFailed`, a "last updated" notice.
9. **User selects a day:** HomeScreen, not the ViewModel, navigates to `DayDetailScreen` with the location's fields, that day's `DailyForecast` and the report's `utcOffsetSeconds` (§3.3, SPEC D-36). The detail screen shows the day from its params and sends no request, so it opens instantly, also offline, and always shows the day that was tapped.

### 3.3 Navigation Ownership

- Screens own navigation. They call `navigation.navigate` in response to a user event or a ViewModel result.
- ViewModels never import React Navigation and never receive the `navigation` object. They expose state and intents only, so they stay testable without a navigator.
- Route params carry only small serialisable values: IDs or plain model values, such as the fields of a `Location` or one `DailyForecast`. Never functions, class instances (e.g. `AppError`) or whole reports (§6).
- When the sending screen already holds the data the next screen needs, it passes that data instead of having the next screen load it again (SPEC D-36). `DayDetailScreen` gets the selected day from its params and sends no request.
- Route param types are defined once in `src/navigation/routes.ts` (`RootStackParamList`). Screens type their props with `RootStackScreenProps<'RouteName'>`, so `navigation` and `route.params` are checked by the compiler.
- `App.tsx` renders `SafeAreaProvider` → `NavigationContainer` → `RootNavigator` (one native stack, SPEC D-35).

## 4. Folder Structure

All `src/` folders below exist (NIT-163). Files marked `[exists]` are in the repository; all other file names are **planned**.

**Setup exception (SPEC D-19):** Git does not track empty folders, so every folder that has no file yet contains an empty `.gitkeep`. This applies to the initial structure only. Delete a folder's `.gitkeep` in the same change that adds its first real file. New folders are still created only when their first file needs them, and no empty modules or placeholder functions are created.

```
Weatherly/
├── App.tsx                 # [exists] App root: providers + navigation container only (SafeAreaProvider + NavigationContainer + RootNavigator)
├── index.ts                # [exists] Expo entry point (do not add logic)
├── src/
│   ├── models/             # AppError.ts [exists], Location.ts [exists], Weather.ts [exists]; AppSettings.ts
│   ├── services/api/       # httpClient.ts, weatherService.ts, geocodingService.ts [all exist]
│   ├── parsers/            # weatherParser.ts, geocodingParser.ts, jsonReaders.ts [all exist]
│   ├── repositories/       # weatherRepository.ts, locationRepository.ts [exist]; favoritesRepository.ts, settingsRepository.ts
│   ├── storage/            # .gitkeep; keyValueStorage.ts
│   ├── navigation/         # RootNavigator.tsx, routes.ts (typed route params) [exist]
│   ├── viewmodels/         # loadState.ts, latestRequest.ts, useSearchViewModel.ts, useCoordinateSearchViewModel.ts,
│   │                       #   useWeatherViewModel.ts [exist]; ...
│   ├── views/
│   │   ├── screens/        # HomeScreen.tsx, LocationSearchSheet.tsx, DayDetailScreen.tsx [exist]; FavoritesScreen.tsx, ...
│   │   └── components/     # Search: CitySearchForm, CoordinateSearchForm, SearchModeSwitch, SearchStatus, LocationResultItem
│   │                       # Weather: HomeHeader, WelcomePanel, WeatherHero, WeatherStatus, WeatherCard, WeatherIcon,
│   │                       #   HourlyForecastList, HourlyForecastItem, DailyForecastList, DailyForecastRow [all .tsx, exist]
│   ├── theme/              # colors.ts, spacing.ts, typography.ts, sky.ts [exist; US-08.01 extends them]
│   └── utils/              # coordinateValidation.ts, locationFormatting.ts, weatherCode.ts, weatherIcon.ts, weatherFormatting.ts,
│                           #   forecastSelection.ts, forecastFormatting.ts [exist]; refreshPolicy.ts, units.ts
├── tests/                  # All unit tests, mirroring src/ (SPEC D-23)
│   ├── fixtures/           # Saved real API responses, e.g. openMeteoForecast.json, openMeteoForecastDstStockholm.json
│   ├── helpers/            # fakeFetch.ts (fake fetch), jsonFixtures.ts (copy-with-one-change, parse-error assertion)
│   ├── models/             # AppError.test.ts
│   ├── parsers/            # weatherParser.test.ts, geocodingParser.test.ts
│   ├── repositories/       # weatherRepository.test.ts, locationRepository.test.ts
│   ├── services/           # weatherService.test.ts, httpClient.test.ts, geocodingService.test.ts
│   ├── utils/              # coordinateValidation, locationFormatting, weatherCode, weatherIcon, weatherFormatting,
│   │                       #   forecastSelection, forecastFormatting, homePresentation tests
│   ├── viewmodels/         # useSearchViewModel, useWeatherViewModel (pure helpers only), latestRequest tests
│   └── views/              # coordinateErrorMessage.test.ts, searchStatus.test.ts, weatherStatus.test.ts
├── CLAUDE.md, AGENTS.md    # Agent instructions (AGENTS.md points to CLAUDE.md)
└── *.md                    # All other project documentation, at the root (SPEC D-14)
```

Tests live in the root `tests/` folder, separate from the app code, in the same subfolder as the file they test: `src/parsers/weatherParser.ts` → `tests/parsers/weatherParser.test.ts` (SPEC D-23).

## 5. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| React component file / component | PascalCase | `ForecastRow.tsx`, `ForecastRow` |
| Screen | PascalCase + `Screen` | `FavoritesScreen` |
| ViewModel hook | `use` + Name + `ViewModel` | `useSearchViewModel` |
| Other hooks | `use` + camelCase | `useOrientation` |
| Non-component module | camelCase | `weatherParser.ts`, `refreshPolicy.ts` |
| Types | PascalCase, no `I` prefix | `DailyForecast`, `AppSettings` |
| Functions | camelCase, verb first | `parseWeatherResponse`, `isStale`, `validateCoordinates` |
| Booleans | `is`/`has`/`can`/`should` prefix | `isLoading`, `hasCachedData` |
| Constants | `UPPER_SNAKE_CASE` for true constants | `DEFAULT_REFRESH_INTERVAL_MINUTES` |
| Event-handler props | `on` + Event | `onSelectLocation` |
| Handler implementations | `handle` + Event | `handleSelectLocation` |
| Storage keys | `weatherly:` namespace | `weatherly:favorites` |

- Spell "favorite" the American way in code (`favoritesRepository`). User-facing text may use either spelling, but it must be consistent.
- Units in names when ambiguous: `temperatureCelsius`, `windSpeedMs`, `intervalMinutes`.

## 6. React Native & Expo Conventions

- Function components only. No class components.
- Use React Native core components (`View`, `Text`, `FlatList`, `Pressable`) and Expo SDK modules before adding a third-party library.
- Install Expo-related packages with `npx expo install <pkg>` so the versions match SDK 58.
- Never create or edit `android/` or `ios/` by hand. They are generated and git-ignored. Configure native behaviour in `app.json`.
- `index.ts` only registers the root component. `App.tsx` only composes providers and navigation.
- **Navigation (D-07): React Navigation.**
  - Add only `@react-navigation/native`, the navigator package actually used (e.g. `@react-navigation/native-stack`) and their required peer dependencies.
  - Install with `npx expo install` in the navigation user story.
  - Route parameter types are defined once in `src/navigation/routes.ts`.
  - Pass only small serialisable params (e.g. a location's fields or one `DailyForecast`), never whole reports, class instances or functions (§3.3, SPEC D-36).
  - ViewModels never receive the `navigation` object. A screen reacts to a ViewModel result (e.g. "location selected") by calling `navigation.navigate` itself.
- Use `FlatList` for any list that can grow (forecast rows, search results, favourites).
- **A screen scrolls as one.** Never nest a vertical `FlatList` inside a vertical `ScrollView`. Put the content above a list in `ListHeaderComponent` (as `LocationSearchSheet` does), or map short, fixed-length lists inside the `ScrollView` (as `HomeScreen` does with the seven days). Horizontal lists inside a vertical scroll are fine.
- A modal (`Modal`) is a separate native window: wrap its content in its own `SafeAreaProvider` and set its own status-bar style.
- Screens with text input set `keyboardShouldPersistTaps="handled"` on their scroll container, so a tap on a result works while the keyboard is open, and wrap content in `KeyboardAvoidingView` (`behavior="padding"` on iOS).

## 7. Hooks & State Management

- **Screen state lives in its ViewModel hook.** Views receive values and callbacks from it.
- Model async UI state as a discriminated union, not several booleans. The shared type is `LoadState<T>` in [`src/viewmodels/loadState.ts`](src/viewmodels/loadState.ts) (exists; SPEC D-20):
  ```ts
  type LoadState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T; isRefreshing: boolean }
    | { status: 'refreshFailed'; data: T; error: AppError; isRefreshing: boolean }
    | { status: 'error'; error: AppError };
  ```
  (The real type marks every field `readonly`.)

  | Situation | State |
  |---|---|
  | First load, nothing to show yet | `loading` |
  | Up-to-date data shown, from the network **or** a fresh cache entry | `success`, `isRefreshing: false` |
  | Refreshing while existing data stays visible | `success` (or `refreshFailed`), `isRefreshing: true` |
  | Cached or earlier data shown after a refresh failed | `refreshFailed`, with the `AppError` |
  | Failed, nothing usable to show | `error` |

- **Cache is not offline.** A fresh cache hit is normal and is shown as `success`, with no warning. The UI shows an outdated or offline notice only for `refreshFailed`. `error.kind` `network` or `timeout` means "offline"; other kinds mean "could not update".
- Timestamps belong to the data `T` (e.g. a cached report with `fetchedAtEpochMs`), not to `LoadState`, because not every load (e.g. search results) is timestamped.
- Shared app-wide state (e.g. settings) uses a single React Context provided in `App.tsx`. No Redux or other global state library unless a decision in SPEC §13 approves it.
- Follow the Rules of Hooks. Keep `useEffect` for synchronisation with external systems, not for deriving values (use plain expressions or `useMemo`).
- Wrap callbacks passed to child components in `useCallback` only when a measurable re-render problem exists.

## 8. Async & Error Handling

- Use `async/await`. No `.then()` chains in new code.
- All errors that cross a layer boundary are an `AppError` ([`src/models/AppError.ts`](src/models/AppError.ts), exists) with a `kind`: `'network' | 'timeout' | 'http' | 'parse' | 'validation' | 'storage' | 'unknown'`. Create one with `new AppError(kind, developerMessage)`, and narrow caught values with `error instanceof AppError`. `unknown` is only for things that are not an `AppError`, such as a programming bug.
- **Services** convert `fetch` failures and non-2xx responses into `AppError`.
- **Parsers** throw `AppError('parse')` for missing or invalid fields.
- **Repositories** catch errors to apply the offline fallback, and rethrow when no fallback exists.
- **ViewModels** catch everything, convert it with `toAppError(error)`, and expose it as `{ status: 'error' }`. A user-facing message is derived from `kind`. Never show raw error text or stack traces.
- Apply a request timeout with `AbortController`.
- Ignore results of requests that are no longer relevant: the component unmounted, or a newer search started.
- Never swallow errors silently. Either handle them visibly or rethrow them.

## 9. API Service Pattern

- One module per external API (`weatherService.ts`, `geocodingService.ts`), sharing one small `httpClient.ts` (`getJson(url, { timeoutMs })`).
- Base URLs and query-parameter construction live in the service. No URL strings in ViewModels or views.
- Services return `Promise<unknown>`. Parsing is the caller's job (repository → parser).
- Weather data comes from Open-Meteo (`weatherService`, D-05) and place search from Open-Meteo Geocoding (`geocodingService`, D-24).
- No API keys in source code. Neither Open-Meteo API needs a key. If a key is ever needed, it goes in an ignored `.env` file and is documented in CONTEXT.md.
- Before implementing a service, save one real response as a test fixture and write the parser against it. Never write a parser against an assumed format.

## 10. JSON Parser Isolation

- Parsers are **pure**: `(json: unknown) => Model`. They do no I/O and no React, and they produce the same output for the same input.
- Check every required field's presence and type. Map API naming (e.g. `temperature_2m`) to model naming (`temperatureCelsius`).
- Optional API fields become optional model fields. Never invent default weather values.
- The parser is the only place that knows the API's JSON shape. A change in the API means a change in one parser file.
- Every parser has unit tests for a valid response, a missing required field and a wrong type.

## 11. Repositories & Persistence

- Repositories are plain modules or objects of async functions, e.g. `weatherRepository.getReport(location, { forceRefresh })`.
- **Cache policy** (W-11, W-16, W-17):
  1. Read the cached entry and its `fetchedAtEpochMs`.
  2. If it is fresh according to `refreshPolicy.isStale(fetchedAtEpochMs, nowEpochMs, intervalMinutes)`, return it as a normal result. A fresh cache hit is not an offline state.
  3. Otherwise fetch, parse, store with `fetchedAtEpochMs = Date.now()`, and return.
  4. If the fetch fails and a cached entry exists, return the entry together with the `AppError` that occurred, so the ViewModel can show `refreshFailed` (§7). If no entry exists, rethrow.
- **Timestamps (SPEC D-18):** stored and passed as epoch milliseconds (`number`) in fields named `…EpochMs`, e.g. `fetchedAtEpochMs`. A `Date` does not survive JSON serialisation, and a number is easy to compare and to test. Convert to a `Date` only for display formatting.
- Persist models as JSON through `keyValueStorage`, the only module that imports `@react-native-async-storage/async-storage` (D-08). Read values are `unknown` and are validated before use, because storage can contain outdated shapes.
- Storage keys are defined once, as constants in the repository that owns them.

## 12. UI Styling Principles

- All colours, spacing and font sizes come from `src/theme/`. No magic numbers or hex values in components.
- **Weather-first home screen (SPEC D-33):**
  - Content sits on the sky gradient from `src/theme/sky.ts` (day or night, from `current.isDay`), using `skyColors` for text and glass cards and `WeatherCard` for every section.
  - The sky colours were chosen by computed WCAG contrast. A new colour on the sky must keep small text at 4.5:1 or more.
  - Gradients and shadows use React Native's `backgroundImage` and `boxShadow` styles, with a solid `backgroundColor` underneath.
- **Icons (SPEC D-34):** draw weather icons only through `WeatherIcon` with a name from `weatherIconName`. Icons are decorative, so the condition must always be in the element's text or accessibility label.
- Use `StyleSheet.create` at the bottom of each component file.
- One consistent visual language across screens: same header style, card style, loading view and error view (shared components).
- Respect safe areas on iOS notch devices and Android status bars with `react-native-safe-area-context` (SPEC D-26): one `SafeAreaProvider` in `App.tsx`, and `SafeAreaView` **from that package** at the root of each screen. React Native's own `SafeAreaView` is deprecated and iOS-only; do not use it.
- Show weather values with units and a sensible rounding policy, consistently everywhere. The policy (SPEC D-29) lives in `src/utils/weatherFormatting.ts`:
  - temperatures and percentages are rounded to whole numbers, and wind to one decimal
  - a non-breaking space goes before the unit; the compact "2°" (`formatTemperatureShort`) is used only in the hero and the forecast lists, with the full unit in their accessibility labels (D-33)
  - times are shown in the location's local time, using the report's fixed offset like the API itself (SPEC D-31); `Intl` time zones are not used
  - views never format weather values themselves.

## 13. Unit Testing Conventions

- Framework: Jest with the `jest-expo` preset (D-09). Run all tests with `npm test`. Before every commit, run `npm run check` (`tsc --noEmit` + all tests). Before merging a story, also run `npx expo export --platform ios` and `npx expo-doctor`. `tsconfig.json` lists `"types": ["jest"]` so that `tsc` knows `describe`/`it`/`expect`.
- Test **pure logic first**. W-24 requires at least two of the lab's areas: JSON parsing (parsers), error-state logic, and data transformation (e.g. grouping hourly/daily data, unit conversion). Coordinate validation and refresh policy may also be tested, but they do not count toward the two.
- File naming: `<module>.test.ts` in `tests/`, in the subfolder that mirrors the module's `src/` folder (D-23).
- Structure: `describe('<module>')` → `it('<behaviour in plain English>')`, with an Arrange / Act / Assert body.
- API fixtures are saved real responses in `tests/fixtures/`. Failure cases copy a fixture and change one thing. Small hand-written JSON may stay inside the test file. No live network calls in unit tests.
- Cover the normal case, boundaries (e.g. latitude exactly 90 / 90.0001) and invalid input.
- **Mutation check:** for each tested area, deliberately break the logic once, confirm at least one test fails, revert, and record this in [TEST_REPORT.md](TEST_REPORT.md).

## 14. Responsive Layout (Portrait & Landscape)

- `app.json` `orientation` is changed from `"portrait"` to `"default"` when W-22 is implemented. Until then the app is portrait-only.
- Use `useWindowDimensions()` to adapt layouts, e.g. stack sections vertically in portrait and place them side by side in landscape.
- Use flexbox and percentage or `flex` sizing. Avoid fixed widths derived from one device.
- All content must stay reachable by scrolling in landscape on small phones.
- Rotation must not lose screen state or restart requests. State lives in ViewModels, not in layout-dependent components.

## 15. Accessibility

- Every interactive element (`Pressable`, icon buttons) has an `accessibilityRole` and `accessibilityLabel`.
- Weather icons have a text equivalent (e.g. "Light rain"). Information is never conveyed by colour alone.
- Touch targets are at least 44×44 points.
- Text respects system font scaling. Do not disable `allowFontScaling`.
- Keep sufficient contrast between text and background in the theme.

## 16. Avoiding Unnecessary Abstractions

- No dependency-injection containers, abstract base classes or generic "manager" layers.
- Create an abstraction only when there are two real uses, or when it is required by the MVVM layer rules above.
- No barrel files (`index.ts` re-exporting a folder) unless a folder has more than about five public modules.
- Do not add a library to save a few lines of code.
- Delete unused code instead of commenting it out.

## 17. Code Review & Documentation Rules

- Every change reaches `dev` through a pull request reviewed by the **other** student (see [GIT_WORKFLOW.md](GIT_WORKFLOW.md)). The only exception is the one-off step in [GIT_WORKFLOW.md §16](GIT_WORKFLOW.md#16-documented-exception-direct-work-on-dev-nit-163).
- Reviewer checklist:
  - [ ] Layer rules (§3) respected; no logic in views.
  - [ ] Naming follows §5.
  - [ ] `npx tsc --noEmit` passes; tests pass (once configured).
  - [ ] Tested on Android Emulator and/or iOS Simulator, as stated in the PR.
  - [ ] Error and loading states handled.
  - [ ] SPEC.md status / decisions and LLM_PROCESS.md updated if relevant.
  - [ ] The reviewer can explain the change.
- Comments explain **why**, not what. Add a short header comment only to non-obvious modules (parsers, repositories).
- Public functions in `utils/`, `parsers/` and `repositories/` get a one-line doc comment stating their contract.
- Documentation changes go in the root Markdown files, in the same PR as the code they describe.

## 18. AI Collaboration Guidelines

- Both developers use **Claude Code in VS Code** (SPEC D-15). It loads the root [CLAUDE.md](CLAUDE.md) automatically; [AGENTS.md](AGENTS.md) only points to it.
  - History: until 2026-11-18, Developer 2 used OpenAI Codex with `agents/codex.md`, and Developer 1 used Claude Code with `agents/claude.md` (SPEC D-13, superseded).
- `CLAUDE.md` points to this guide, SPEC.md and CONTEXT.md. There are no assistant-specific coding rules: this guide applies to all AI-assisted code.
- Every AI session starts by reading SPEC.md, STYLE.md and CONTEXT.md (see [SPEC.md §0](SPEC.md#0-ai-meta-instructions)).
- If the AI suggests a pattern that differs from this guide, follow this guide. If the guide does not cover the case, decide as a team and add the rule here, not only in `CLAUDE.md`.
- **Code generation:** the AI writes code from the students' prompts. The students review, test and modify it, and commit only code they can explain line by line.
- **Core logic** (parsers, cache and refresh policy, validation, ViewModel state transitions): the AI explains the key decisions and trade-offs along with the code, so the students can defend them at the oral examination.
- AI-generated code is treated like code from an unknown contributor. It must be reviewed line by line, type-checked, tested and run on a device or simulator before merging.
- Prompts reference the requirement ID (`W-xx`) and the Linear issue they serve.
- Reject AI suggestions that add libraries, layers or files not justified by this guide.
- Record each session in [LLM_PROCESS.md](LLM_PROCESS.md), including mistakes the AI made.
- AI does not write the students' reflection.
