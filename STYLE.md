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
| `src/models/AppError.ts` | `AppErrorKind` union and `AppError` class (`kind`, developer-only `message`). The only error type that crosses a layer boundary (§8). | **Exists** |
| `src/models/Location.ts` | `Coordinates` (`latitude`, `longitude`) and `Location` (`name`, optional `region`/`country`, `coordinates`). | **Exists** |
| `src/viewmodels/loadState.ts` | `LoadState<T>`, the ViewModel → View state contract (§7). | **Exists** |
| `src/services/api/httpClient.ts` | `getJson(url, { timeoutMs }): Promise<unknown>`. Throws `AppError` (`network`, `timeout`, `http`). | Planned (NIT-167) |
| `src/services/api/geocodingService.ts` | Search SMHI by place name, returning `Promise<unknown>`. | Planned (NIT-165; SPEC OQ-01 – OQ-04 first) |
| `src/services/api/weatherService.ts` | Fetch the Open-Meteo forecast for `Coordinates`, returning `Promise<unknown>`. | Planned (NIT-167) |
| `src/parsers/geocodingParser.ts` | `(json: unknown) => ReadonlyArray<Location>`. Throws `AppError('parse', …)`. | Planned (NIT-165) |
| `src/parsers/weatherParser.ts` | `(json: unknown) => WeatherReport`. Throws `AppError('parse', …)`. | Planned (NIT-168) |
| `src/repositories/locationRepository.ts` | `searchLocations(query): Promise<ReadonlyArray<Location>>`: calls `geocodingService`, then `geocodingParser`. No caching or other behaviour (SPEC D-17). | Planned (NIT-165) |
| `src/repositories/weatherRepository.ts` | Returns a report with its `fetchedAtEpochMs` (SPEC D-18), and tells the caller when it fell back to a cached entry after a failed refresh (§11). | Planned (NIT-167, NIT-182, NIT-183) |
| `src/repositories/favoritesRepository.ts`, `settingsRepository.ts` | Read and write favourites and settings through `keyValueStorage`. | Planned (NIT-177, NIT-179 – NIT-181) |
| `src/storage/keyValueStorage.ts` | Get (`unknown`) and set JSON values; the only importer of AsyncStorage (D-08). | Planned (NIT-182) |
| `src/viewmodels/use…ViewModel.ts` | Expose `LoadState<T>` plus intent functions (`search`, `refresh`, …). Never receive `navigation`. | Planned (NIT-165, NIT-170, …) |
| `src/navigation/routes.ts`, `RootNavigator.tsx` | Typed route params and navigator setup. | Planned (NIT-173; SPEC OQ-05) |
| `src/models/Weather.ts` | `CurrentWeather`, `HourlyForecast`, `DailyForecast` and `WeatherReport` (`timezone`, `utcOffsetSeconds`, `current`, `hourly`, `daily`). Written against a real Open-Meteo response. Times in `…EpochMs`, units in field names, API `null` values as optional fields. | **Exists** (NIT-214) |
| `src/models/AppSettings.ts` | Settings model, written in the settings story. | Planned (NIT-179 – NIT-181) |

### 3.2 Search-to-Forecast Data Flow

Planned flow. Only the types in **bold** exist today.

Search and forecast share one screen, `HomeScreen` (SPEC D-22). It uses two ViewModels: `useSearchViewModel` for search and `useWeatherViewModel` for the forecast.

1. **HomeScreen** (View): the user submits a place name. The screen calls `search(query)` from `useSearchViewModel`. It never calls an API.
2. **useSearchViewModel**: trims the query. Empty input sends no request (W-01). Otherwise it sets `LoadState` to `loading` and calls `locationRepository.searchLocations(query)`.
3. **locationRepository** → `geocodingService` (returns `unknown` JSON through `httpClient`) → `geocodingParser` (returns **`Location`** values or throws **`AppError`**).
4. The ViewModel sets `success` with the locations, or `error` with the **`AppError`**. HomeScreen renders the result list, an empty state or an error.
5. **User selects a location:** HomeScreen passes it to `useWeatherViewModel`. No navigation happens; the forecast appears on the same screen.
   - Coordinate search (W-03) skips steps 2–4. The ViewModel validates the input with `coordinateValidation` and builds a **`Location`** directly; no network request is needed.
6. **useWeatherViewModel** sets `loading` and calls `weatherRepository`.
7. **weatherRepository** reads the cache through `keyValueStorage`:
   - If the entry is fresh (`refreshPolicy`), it returns it. This is a normal result, not an offline state.
   - Otherwise it calls `weatherService`, parses the response with `weatherParser`, stores the report with `fetchedAtEpochMs`, and returns it.
   - If that refresh fails and a cached entry exists, it returns the entry and reports the **`AppError`** that occurred. With no cached entry, it throws the error.
8. **useWeatherViewModel** maps the result to `success`, `refreshFailed` (cached data plus an error) or `error` (**`LoadState<T>`**, §7). HomeScreen renders the current conditions, today's hourly forecast and the seven-day summary and, for `refreshFailed`, a "last updated" notice.
9. **User selects a day:** HomeScreen, not the ViewModel, navigates to `DayDetailScreen` with the location's fields and the day's date (§3.3). Its ViewModel loads that day from `weatherRepository`.

### 3.3 Navigation Ownership

- Screens own navigation. They call `navigation.navigate` in response to a user event or a ViewModel result.
- ViewModels never import React Navigation and never receive the `navigation` object. They expose state and intents only, so they stay testable without a navigator.
- Route params carry only small serialisable values, such as the fields of a `Location`, never functions or whole reports (§6). The receiving screen's ViewModel loads the data itself.
- Route param types are defined once in `src/navigation/routes.ts` (planned, NIT-173). React Navigation is not installed yet; until then `App.tsx` stays the Expo template screen.

## 4. Folder Structure

All `src/` folders below exist (NIT-163). Files marked `[exists]` are in the repository; all other file names are **planned**.

**Setup exception (SPEC D-19):** Git does not track empty folders, so every folder that has no file yet contains an empty `.gitkeep`. This applies to the initial structure only. Delete a folder's `.gitkeep` in the same change that adds its first real file. New folders are still created only when their first file needs them, and no empty modules or placeholder functions are created.

```
Weatherly/
├── App.tsx                 # [exists] App root: providers + navigation container only (still the Expo template)
├── index.ts                # [exists] Expo entry point (do not add logic)
├── src/
│   ├── models/             # AppError.ts [exists], Location.ts [exists], Weather.ts [exists]; AppSettings.ts
│   ├── services/api/       # .gitkeep; httpClient.ts, weatherService.ts, geocodingService.ts
│   ├── parsers/            # .gitkeep; weatherParser.ts, geocodingParser.ts
│   ├── repositories/       # .gitkeep; locationRepository.ts, weatherRepository.ts, favoritesRepository.ts, settingsRepository.ts
│   ├── storage/            # .gitkeep; keyValueStorage.ts
│   ├── navigation/         # .gitkeep; RootNavigator.tsx, routes.ts (typed route params)
│   ├── viewmodels/         # loadState.ts [exists]; useWeatherViewModel.ts, useSearchViewModel.ts, ...
│   ├── views/
│   │   ├── screens/        # .gitkeep; HomeScreen.tsx, DayDetailScreen.tsx, FavoritesScreen.tsx, SettingsScreen.tsx
│   │   └── components/     # .gitkeep; ForecastRow.tsx, LoadingView.tsx, ErrorView.tsx, ...
│   ├── theme/              # .gitkeep; colors.ts, spacing.ts, typography.ts
│   └── utils/              # .gitkeep; coordinateValidation.ts, refreshPolicy.ts, units.ts
├── CLAUDE.md, AGENTS.md    # Agent instructions (AGENTS.md points to CLAUDE.md)
└── *.md                    # All other project documentation, at the root (SPEC D-14)
```

Tests live next to the file they test: `weatherParser.ts` → `weatherParser.test.ts`.

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
  - Pass only small serialisable params (e.g. a location ID or coordinates), never whole data objects or functions.
  - ViewModels never receive the `navigation` object. A screen reacts to a ViewModel result (e.g. "location selected") by calling `navigation.navigate` itself.
- Use `FlatList` for any list that can grow (forecast rows, search results, favourites).

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
- All errors that cross a layer boundary are an `AppError` ([`src/models/AppError.ts`](src/models/AppError.ts), exists) with a `kind`: `'network' | 'timeout' | 'http' | 'parse' | 'validation' | 'storage'`. Create one with `new AppError(kind, developerMessage)`, and narrow caught values with `error instanceof AppError`.
- **Services** convert `fetch` failures and non-2xx responses into `AppError`.
- **Parsers** throw `AppError('parse')` for missing or invalid fields.
- **Repositories** catch errors to apply the offline fallback, and rethrow when no fallback exists.
- **ViewModels** catch everything and expose it as `{ status: 'error' }`. A user-facing message is derived from `kind`. Never show raw error text or stack traces.
- Apply a request timeout with `AbortController`.
- Ignore results of requests that are no longer relevant: the component unmounted, or a newer search started.
- Never swallow errors silently. Either handle them visibly or rethrow them.

## 9. API Service Pattern

- One module per external API (`weatherService.ts`, `geocodingService.ts`), sharing one small `httpClient.ts` (`getJson(url, { timeoutMs })`).
- Base URLs and query-parameter construction live in the service. No URL strings in ViewModels or views.
- Services return `Promise<unknown>`. Parsing is the caller's job (repository → parser).
- Weather data comes from Open-Meteo (`weatherService`, D-05) and place search from SMHI (`geocodingService`, D-06).
- No API keys in source code. Open-Meteo needs no key. Whether SMHI needs one is unverified (SPEC OQ-04). If a key is ever needed, it goes in an ignored `.env` file and is documented in CONTEXT.md.
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
- Use `StyleSheet.create` at the bottom of each component file.
- One consistent visual language across screens: same header style, card style, loading view and error view (shared components).
- Respect safe areas on iOS notch devices and Android status bars.
- Show weather values with units and a sensible rounding policy, consistently everywhere.

## 13. Unit Testing Conventions

- Framework: Jest with the `jest-expo` preset (D-09). It is not installed yet; it is added in the testing user story.
- Test **pure logic first**. W-24 requires at least two of the lab's areas: JSON parsing (parsers), error-state logic, and data transformation (e.g. grouping hourly/daily data, unit conversion). Coordinate validation and refresh policy may also be tested, but they do not count toward the two.
- File naming: `<module>.test.ts`, next to the module.
- Structure: `describe('<module>')` → `it('<behaviour in plain English>')`, with an Arrange / Act / Assert body.
- Use small hand-written JSON fixtures in the test file or in a `__fixtures__/` folder next to it. No live network calls in unit tests.
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
