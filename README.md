# Weatherly

A native weather app for Android and iOS, built with React Native, Expo SDK 58 and TypeScript for **Lab B:2 – Building a Native Weather App** (KTH HI1033 / CM2023, higher level). Two students built it.

Search any place by name or by coordinates. Weatherly then shows the current weather, the rest of today hour by hour and the next seven days. You can open a day for details, keep favourite places, choose units and a refresh interval, and still read the last weather when the network is gone.

This README is **Appendix B** of the submission: it explains how the code is structured, so the architecture is clear before you open the project. What has been verified on which platform is recorded in [TEST_REPORT.md](TEST_REPORT.md), not here.

---

## Features

Requirement IDs refer to [SPEC.md](SPEC.md).

| Feature | Requirements | Where to see it |
|---|---|---|
| Search by place name (Open-Meteo Geocoding), results with region and country | W-01, W-02 | Search button on Home → `LocationSearchSheet` |
| Search by latitude/longitude, validated before any request | W-03 | Same sheet, "Coordinates" mode |
| Current weather: icon, temperature, condition, high/low, feels-like, humidity, wind, observation time | W-04 | `WeatherHero` on Home |
| Rest of today, hour by hour, and a seven-day forecast | W-05, W-06, W-21 | `HourlyForecastList`, `DailyForecastList` |
| Details for one day: precipitation, wind, sunrise/sunset, daylight, UV | W-07 | Tap a day → `DayDetailScreen` |
| Favourites, saved on the device | W-08, W-09 | Star in the header; `FavoritesScreen` |
| Settings: refresh interval (15/30/60 min), °C/°F, m/s or km/h | W-10 – W-12 | Gear in the header → `SettingsScreen` |
| The last weather cached on the device and shown at start, also offline | W-16, W-17 | Start the app again |
| Clear loading, offline and error states with "Try again" | W-18 – W-20 | No network, slow network, bad answers |
| Portrait and landscape | W-22 | Rotate the device |

## Technologies

| | |
|---|---|
| Framework | Expo SDK 58 · React Native 0.88 · React 19 |
| Language | TypeScript, `strict` mode, no `any` |
| Weather data | [Open-Meteo Forecast API](https://open-meteo.com) (`api.open-meteo.com/v1/forecast`), no API key |
| Place search | Open-Meteo Geocoding API (`geocoding-api.open-meteo.com/v1/search`) |
| Libraries | React Navigation (native stack) · AsyncStorage · `@expo/vector-icons` · `react-native-safe-area-context` · Jest with `jest-expo` |
| Platforms | Android Emulator (Windows) · iOS Simulator (macOS) |

Every library has a decision entry in [SPEC.md §13](SPEC.md#13-decision-log). No state-management, HTTP or styling library is used: React state and context, `fetch` and `StyleSheet` are enough here.

## Architecture

Weatherly follows **MVVM** with a small data layer. Each layer only calls the layer below it:

```
View ──▶ ViewModel (hook) ──▶ Repository ──┬──▶ API service   fetch, timeout → raw JSON
 (screens, components)                     ├──▶ Parser        raw JSON → typed model, or AppError('parse')
                                           └──▶ Storage       AsyncStorage (cache, favourites, settings)
All layers use the typed Models.  Utils: pure helpers that any layer may use.
```

| Layer | Folder | Responsibility | Never does |
|---|---|---|---|
| **Views** | `src/views/` | Render the state they are given and forward taps. Screens own navigation. | Fetch, parse or store data |
| **ViewModels** | `src/viewmodels/` | Hooks that hold screen state as `LoadState<T>` (`idle`, `loading`, `success`, `refreshFailed`, `error`) and offer intents such as `search`, `load`, `refresh`, `toggleFavorite` | Render JSX, call `fetch`, know JSON shapes, navigate |
| **Repositories** | `src/repositories/` | The single source of truth for one kind of data: they combine service and parser, or storage and parser | Hold UI state |
| **Services** | `src/services/api/` | HTTP only: build the URL, call `fetch`, turn failures into `AppError` | Parse into models |
| **Parsers** | `src/parsers/` | Turn `unknown` JSON (from the API or from storage) into typed models; invalid data → `AppError('parse')` | I/O |
| **Storage** | `src/storage/` | The only module that imports AsyncStorage: read and write JSON under a key | Know what is stored |
| **Models** | `src/models/` | Plain TypeScript types: `Location`, `WeatherReport`, `AppSettings`, `AppError` | Contain logic |
| **Utils** | `src/utils/` | Pure functions: validation, selection, formatting, units, refresh rule, layout | I/O |

The full layer rules and every module's contract are in [STYLE.md §3](STYLE.md#3-mvvm-architecture).

### Main files

**App and navigation**
- `App.tsx`: providers only: `SafeAreaProvider` → `SettingsProvider` → `NavigationContainer` → `RootNavigator`.
- `src/navigation/RootNavigator.tsx`: one native stack (no tabs): `Home`, `DayDetail`, `Favorites`, `Settings`. `routes.ts` types the route params; `DayDetail` gets the place, the day and the UTC offset, so it needs no request.

**Screens** (`src/views/screens/`)
- `HomeScreen`: the weather-first home screen on a day/night sky. It contains the header (place, favourite star, buttons), the current weather, "Rest of today" and seven days. It owns the search, weather and favourites ViewModels and decides when to restore the cache and refresh (on focus, on return from the background, pull to refresh).
- `LocationSearchSheet`: a modal with both search modes and the result list.
- `DayDetailScreen`: one day, built only from its route params.
- `FavoritesScreen`: the saved places; choosing one returns it to Home.
- `SettingsScreen`: refresh interval and units.

**ViewModels** (`src/viewmodels/`)
- `useSearchViewModel`, `useCoordinateSearchViewModel`: place-name search and coordinate validation.
- `useWeatherViewModel`: the selected place and its weather. It loads, refreshes when stale, saves the last report and restores it at start (`restoreLastReport`, `isCacheChecked`).
- `useFavoritesViewModel`: reads and changes favourites. It writes only after the storage confirms, and offers a protected reset for damaged data.
- `useSettingsViewModel`: the settings shared by every screen through `SettingsProvider` (React context).
- `latestRequest.ts`: `createLatestRequestGuard`, which makes sure only the newest request may update the screen. It is used by search and weather.

**Data layer**
- Services: `httpClient.getJson` (10-second timeout; `network`, `timeout`, `http` and `parse` errors), `weatherService`, `geocodingService`.
- Parsers: `weatherParser`, `geocodingParser`, plus the stored formats `favoritesParser`, `settingsParser`, `weatherCacheParser` (each stored format has a `version`), with the shared `jsonReaders` and `storedLocation`.
- Repositories:
  - `locationRepository.searchLocations`
  - `weatherRepository.getReport`, and the one cache entry `loadLastReport` / `saveLastReport`
  - `favoritesRepository`
  - `settingsRepository`
- Storage: `keyValueStorage` (`readJson`, `writeJson`). Keys: `weatherly:lastWeather`, `weatherly:favorites`, `weatherly:settings`.

**Theme** (`src/theme/`)
- Tokens for colours, spacing, typography and touch feedback (`interaction.ts`).
- `sky.ts` holds the day/night gradients, with colours checked for WCAG contrast.
- `layoutBreakpoints` are the window sizes where layouts change.

### One search, end to end

1. `LocationSearchSheet` → `useSearchViewModel.search("Lund")` → `locationRepository.searchLocations` → `geocodingService` (fetch) → `geocodingParser` → `Location[]` → result rows.
2. Choosing a row: `HomeScreen.handleSelectLocation` → `useWeatherViewModel.load(location)` → state `loading`.
3. `weatherRepository.getReport` → `weatherService.fetchForecast` → `weatherParser.parseWeatherResponse` → `WeatherReport`, stamped with the fetch time.
4. The ViewModel sets `success` and saves the report as the cache entry. `forecastSelection` picks today's remaining hours and seven days from the same report. The presenters in `utils/` turn values into texts in the user's units.
5. `WeatherHero`, `HourlyForecastList` and `DailyForecastList` render those texts.

Errors take the same path back. A failed request becomes an `AppError` with a kind, the ViewModel stores it in `LoadState`, and the View chooses the message (e.g. "No internet connection…" with "Try again").

### Key design decisions

Each decision is explained in [SPEC.md §13](SPEC.md#13-decision-log):

- **One request for everything:** the current weather, hours and days come from one forecast response, so they always belong together (D-32).
- **Times in the place's local time:** the API's fixed UTC offset per response is used, not the phone's time zone (D-31).
- **"Newest request wins":** search and weather ignore outdated answers through one shared request guard (`createLatestRequestGuard`), so quick searches or changes of place never show the wrong result (SPEC Q12).
- **One cache entry:** the last weather shown, restored at start before any request, refreshed if stale. Offline, it stays on screen with "No connection. Showing the weather from HH:MM." (D-47, D-48). Until the cache has been read, Home shows a neutral spinner, never the first-launch panel (D-51).
- **Units at formatting time:** the API stays in °C and m/s. Conversion happens once, when a value is formatted, and the unit is a required argument (D-46).
- **Responsive, one column:** `app.json` allows both orientations. `screenLayoutFor(useWindowDimensions())` stacks the header buttons on narrow windows or with large text, and makes the heroes compact in short windows. Everything else scrolls (D-50).

## Project structure

```
App.tsx, index.ts      app root and Expo entry point
app.json               Expo configuration ("orientation": "default")
src/
  models/              Location, Weather, AppSettings, AppError
  services/api/        httpClient, weatherService, geocodingService
  parsers/             weatherParser, geocodingParser, favoritesParser, settingsParser, weatherCacheParser, …
  repositories/        weatherRepository, locationRepository, favoritesRepository, settingsRepository
  storage/             keyValueStorage
  viewmodels/          use…ViewModel hooks, loadState, latestRequest
  views/screens/       HomeScreen, LocationSearchSheet, DayDetailScreen, FavoritesScreen, SettingsScreen
  views/components/    header, hero, forecast lists, cards, status views, form and list rows
  navigation/          RootNavigator, routes
  theme/               colors, spacing, typography, sky, interaction
  utils/               pure helpers (validation, selection, formatting, units, refresh rule, layout)
tests/                 Jest tests mirroring src/, saved real API responses in tests/fixtures/
*.md                   project documentation (below)
```

## Getting started

**Prerequisites**
- [Node.js](https://nodejs.org) LTS with npm, and Git.
- **Android:** Android Studio with an Android Virtual Device, and `ANDROID_HOME` set.
- **iOS (macOS only):** Xcode with an iOS Simulator runtime.

**Install**

```bash
git clone https://github.com/XxNitXZ/Weatherly.git
cd Weatherly
npm ci
```

**Run**

```bash
npm run android    # Android Emulator (start an AVD first)
npm run ios        # iOS Simulator (macOS only)
npm start          # dev server only; then press a or i
```

The app runs in Expo Go. How to rotate the emulator or simulator, go offline, enlarge the text, use a screen reader or clear stored data is explained in [TEST_REPORT.md §3.0](TEST_REPORT.md#30-how-to-run-the-scenarios).

## Testing

```bash
npm run check      # tsc --noEmit + all Jest tests
npm test           # Jest only
npx expo-doctor    # Expo project health check
```

- **Unit tests** (`tests/`, Jest with `jest-expo`) cover the lab's three areas: JSON parsing, error-state logic and data transformation. Validation, the refresh rule, request ordering and layout decisions are covered too.
  - Each tested area has a recorded mutation check.
  - Fixtures are saved real Open-Meteo responses; no test calls the network.
- **UX scenarios** (35, with prerequisites, action and expected result) are run on the Android Emulator and the iOS Simulator and recorded in [TEST_REPORT.md §3](TEST_REPORT.md#3-ux-interaction-scenarios). Only observed results are recorded.

## Documentation

| Document | Purpose | Submission |
|---|---|---|
| [SPEC.md](SPEC.md) | Requirements (W-xx), AI meta-instructions, tracking, oral-exam map, decision log, change log | Appendix C |
| [TEST_REPORT.md](TEST_REPORT.md) | Unit tests, mutation checks, UX scenarios and their results | Appendix A |
| [README.md](README.md) | This file: architecture and how to run | Appendix B |
| [LLM_PROCESS.md](LLM_PROCESS.md) | Log of AI-assisted work | Appendix D |
| [REFLECTION.md](REFLECTION.md) | The students' own reflection | Main text |
| [STYLE.md](STYLE.md) | Architecture rules and coding conventions | — |
| [CONTEXT.md](CONTEXT.md) | Course, environment, workflow, submission checklist (§14) | — |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Branches, commits and pull requests | — |
| [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md) | Rules for the AI assistant (Claude Code in VS Code) | — |

## Git workflow

- `main`: stable releases.
- `dev`: integration.
- Feature branches: one per Epic or story, created from `dev`.

Pull requests go into `dev` and are reviewed by the other student. Commits follow Conventional Commits. Details: [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

## AI-assisted development

Both students used Claude Code in VS Code, following one rule set in [CLAUDE.md](CLAUDE.md). ChatGPT was used for planning and review. The students review and test what the AI writes and must be able to explain every line (SPEC §0, rule 11). How the AI was used, session by session, is in [LLM_PROCESS.md](LLM_PROCESS.md) and [SPEC.md §10.1](SPEC.md#101-ai-usage-summary).
