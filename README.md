# Weatherly

A cross-platform native weather app for Android and iOS, built with React Native, Expo and TypeScript for **KTH HI1033 / CM2023, Lab B:2 – Building a Native Weather App** (higher level). Two students built it with one shared codebase.

You can search for any place by name or enter coordinates, and see:
- the current weather
- the rest of today hour by hour
- a seven-day forecast, with a details screen per day

You can save favourite places and choose the refresh interval and units. The last forecast stays readable when the network is gone.

This README is the lab's **Appendix B**: it explains how the code is structured, so a reader can understand the architecture before opening the code. Requirements, decisions and test evidence are in the documents listed under [Documentation](#documentation).

---

## Technologies

| | |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 58 · React Native 0.88 · React 19 |
| Language | TypeScript, `strict` mode, no `any` |
| Weather data | [Open-Meteo](https://open-meteo.com) forecast API (REST, JSON, no key) |
| Place search | Open-Meteo Geocoding API (SPEC D-24; the lab's SMHI place search returned HTTP 404) |
| Navigation | React Navigation, one native stack (SPEC D-35) |
| Local storage | `@react-native-async-storage/async-storage` behind one wrapper |
| Icons | `@expo/vector-icons` (MaterialCommunityIcons) |
| Tests | Jest with the `jest-expo` preset, in `tests/` |

## Architecture

Weatherly uses **MVVM** with a thin data layer. Dependencies point one way only: a lower layer never imports a higher one.

```
 View (screens, components)        renders state, forwards user actions, owns navigation
   │  calls intents (load, search, toggleFavorite, …), reads state
   ▼
 ViewModel (custom React hooks)    screen state as LoadState<T>, loading/error, request ordering
   │
   ▼
 Repository                        typed models in and out; the weather cache; storage order
   │                  │
   ▼                  ▼
 API service          Storage      fetch with timeout → unknown JSON  |  AsyncStorage read/write JSON
   │                  │
   ▼                  ▼
 Parser               Parser       unknown JSON → typed model, or AppError('parse') with the field path
   │
   ▼
 Model                             plain readonly TypeScript types (Location, WeatherReport, AppSettings, …)
```

**Why MVVM?**
- Screens stay free of networking, parsing and storage, so the rules can be unit-tested without a device.
- Each layer can change on its own. For example, the API's JSON shape lives in exactly one parser.

### The layers in the code

| Layer | Folder | Main files | Responsibility |
|---|---|---|---|
| Views | `src/views/screens/` | `HomeScreen`, `LocationSearchSheet`, `DayDetailScreen`, `FavoritesScreen`, `SettingsScreen` | Lay out the screen, render state, call ViewModel intents, navigate |
| | `src/views/components/` | `WeatherHero`, `HourlyForecastList`, `DailyForecastList`, `WeatherStatus`, `SearchStatus`, `FavoritesStatus`, `HomeHeader`, … | Presentational pieces; their texts come from pure presenters in `src/utils/` |
| Navigation | `src/navigation/` | `RootNavigator.tsx`, `routes.ts` | One native stack and typed route params (Home → Day detail, Favourites, Settings) |
| ViewModels | `src/viewmodels/` | `useWeatherViewModel`, `useSearchViewModel`, `useCoordinateSearchViewModel`, `useFavoritesViewModel`, `useSettingsViewModel` (+ `SettingsProvider`) | Screen state as `LoadState<T>` (`loadState.ts`), intents, "newest request wins" (`latestRequest.ts`) |
| Repositories | `src/repositories/` | `weatherRepository` (`getReport`, `loadLastReport`, `saveLastReport`), `locationRepository` (`searchLocations`), `favoritesRepository`, `settingsRepository` | Join a service or storage with a parser; keep reads and writes of one key in order |
| API services | `src/services/api/` | `httpClient` (`getJson`), `weatherService` (`buildForecastUrl`, `fetchForecast`), `geocodingService` | Build URLs, send requests with a 10 s timeout, turn failures into a typed `AppError` |
| Storage | `src/storage/` | `keyValueStorage` (`readJson`, `writeJson`) | The only module that imports AsyncStorage |
| Parsers | `src/parsers/` | `weatherParser`, `geocodingParser`, `weatherCacheParser`, `favoritesParser`, `settingsParser`, `jsonReaders` | Validate untrusted JSON (API or storage) and build models |
| Models | `src/models/` | `Weather.ts`, `Location.ts`, `AppSettings.ts`, `AppError.ts` | Plain data types; `AppError` is the only error that crosses a layer |
| Utils | `src/utils/` | `forecastSelection`, `forecastFormatting`, `weatherFormatting`, `weatherIcon`, `units`, `refreshPolicy`, `coordinateValidation`, `screenLayout`, … | Pure rules and display texts, unit-tested |
| Theme | `src/theme/` | `colors`, `sky`, `spacing`, `typography`, `layout`, `interaction` | Design tokens; components contain no raw colours or sizes |

### How the layers connect: the main flows

1. **Search to forecast:**
   - In `LocationSearchSheet`, "Search" calls `useSearchViewModel.search`.
   - That calls `searchLocations` (`geocodingService` → `getJson` → `parseGeocodingResponse`) and the result list appears.
   - Choosing a result, or valid coordinates (`validateCoordinates`), calls `useWeatherViewModel.load(location)`.
   - `load` calls `getReport` (`fetchForecast` → `getJson` → `parseWeatherResponse`) and sets `success`.
   - `HomeScreen` renders the hero, the rest of today and the seven days, all chosen from **one** report (`forecastForState` → `selectForecast`).
2. **Cache and offline:**
   - Every successful load is saved as the one cache entry (`saveLastReport` → `writeJson`).
   - At start-up, `restoreLastReport` shows that entry before any request, and refreshes it if it is stale (`refreshPolicy`).
   - If a refresh fails, the old weather stays on screen as `refreshFailed`, with a notice: "No connection. Showing the weather from 14:00."
3. **Failures:**
   - Every failure becomes an `AppError` with a `kind` (`network`, `timeout`, `http`, `parse`, …).
   - The ViewModel turns it into state, and the view chooses the message from the `kind` and offers "Try again".
   - No failure is thrown to the screen, and no developer message is shown.
4. **Concurrency:**
   - Each ViewModel keeps a `createLatestRequestGuard`, so an older, slower answer can never overwrite a newer one, for example a search for "Lund" answering after "Kiruna".
   - Repositories run reads and writes of the same storage key one at a time.
5. **Favourites and settings:**
   - The star on Home and the favourites screen use `useFavoritesViewModel`, which reads and writes through `favoritesRepository`. Damaged stored data is kept and the user is offered a confirmed reset.
   - Settings are shared by `SettingsProvider` and applied when values are formatted (°C/°F, m/s/km/h).
6. **Portrait and landscape:**
   - Screens follow `screenLayoutFor(useWindowDimensions())`.
   - A narrow phone stacks the header buttons, a short window uses the compact hero, and a wide landscape window shows the hero beside the forecasts.
   - `app.json` allows both orientations.

Detailed layer contracts and rules: [STYLE.md §3–§4](STYLE.md#3-mvvm-architecture). Decisions with their reasons: [SPEC.md §13](SPEC.md#13-decision-log).

## Documentation

| Document | Purpose | Lab submission |
|---|---|---|
| [SPEC.md](SPEC.md) | Requirements W-xx with status and code, AI meta-instructions, decision log, oral exam map, change log | Appendix C |
| [TEST_REPORT.md](TEST_REPORT.md) | Unit tests, mutation tests, device checks and the UX scenarios | Appendix A |
| [LLM_PROCESS.md](LLM_PROCESS.md) | Log of AI-assisted development | Appendix D |
| [README.md](README.md) | This file: the architecture | Appendix B |
| [REFLECTION.md](REFLECTION.md) | The students' own reflection | The reflection report |
| [STYLE.md](STYLE.md) | Architecture and coding conventions | — |
| [CONTEXT.md](CONTEXT.md) | Course, environment, workflow and constraints | — |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Branching, commits and pull requests | — |
| [PRESENTATION_PREP.md](PRESENTATION_PREP.md) | Submission checklist and oral exam preparation | — |
| [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md) | Instructions for the AI assistant (Claude Code) | — |

**AI use:**
- Both developers used Claude Code in VS Code, with ChatGPT for planning.
- The students prompted, reviewed, ran the app on the simulator, modified the code, and did all Git work.
- Details are in [SPEC.md §10.1](SPEC.md#101-ai-usage-summary) and [LLM_PROCESS.md](LLM_PROCESS.md).

## Getting Started

**Prerequisites:**
- [Node.js](https://nodejs.org) LTS with npm, and [Git](https://git-scm.com).
- **Android:** [Android Studio](https://developer.android.com/studio) with an Android Virtual Device.
- **iOS (macOS only):** [Xcode](https://developer.apple.com/xcode/) with an iOS Simulator.

```bash
git clone https://github.com/XxNitXZ/Weatherly.git
cd Weatherly
npm ci                 # exactly the versions in package-lock.json; run again after a pull that changed them
npx expo start --clear # then press a (Android Emulator) or i (iOS Simulator)
```

## Testing

```bash
npm run check        # TypeScript check + all Jest unit tests
npx expo-doctor      # Expo project health check
```

- **What the unit tests cover:** the lab's three areas, which are JSON parsing, error-state logic and data transformation, plus validation, storage recovery, refresh rules and layout rules. They run in Node, so they do not replace checks on a device.
- **Device and simulator checks** and the UX scenarios are recorded in [TEST_REPORT.md](TEST_REPORT.md), per platform, with `NOT RUN` where a check has not been done yet.

## Git Workflow

- `main` holds stable releases and `dev` is for integration.
- Each Epic gets one feature branch, created from `dev` (SPEC D-41).
- Pull requests target `dev`, and commits follow [Conventional Commits](https://www.conventionalcommits.org).

Details: [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

## Status

The lab features of Epics 1–7 are on `dev`. Epic 8 (design system, portrait/landscape, empty and error states) is on `feat/NIT-159-160-ui-testing` and not yet merged. What has been verified, and on which platform, is tracked per requirement in [SPEC.md §11](SPEC.md#11-requirement-tracking) and per scenario in [TEST_REPORT.md §3](TEST_REPORT.md#3-ux-interaction-scenarios). The Android Emulator checks and the landscape checks on both platforms are still open there.
