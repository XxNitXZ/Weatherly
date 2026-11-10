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
| **Repository** | `src/repositories/` | Single source of truth per data type; decides between cache and network; applies refresh policy and offline fallback. | Know about React or UI. |
| **API service** | `src/services/api/` | Build URLs, perform HTTP requests, map HTTP failures to `AppError`. Return raw `unknown` JSON. | Parse into models, cache, touch UI. |
| **Parser** | `src/parsers/` | Pure functions: `unknown` JSON → typed Model, or throw `AppError('parse')`. | Do I/O. |
| **Storage** | `src/storage/` | Thin wrapper around the persistence library (D-08); JSON (de)serialisation of stored values. | Contain business rules. |
| **Utils** | `src/utils/` | Pure helpers (coordinate validation, refresh policy, unit conversion, formatting). | Do I/O. |

The dependency direction is **View → ViewModel → Repository → Service/Parser/Storage → Model**. A lower layer never imports from a higher layer.

## 4. Folder Structure

Planned structure. Folders are created only when the first file needs them.

```
Weatherly/
├── App.tsx                 # App root: providers + navigation container only
├── index.ts                # Expo entry point (do not add logic)
├── src/
│   ├── models/             # Location.ts, Weather.ts, AppSettings.ts, AppError.ts
│   ├── services/api/       # httpClient.ts, weatherService.ts, geocodingService.ts
│   ├── parsers/            # weatherParser.ts, geocodingParser.ts
│   ├── repositories/       # weatherRepository.ts, favoritesRepository.ts, settingsRepository.ts
│   ├── storage/            # keyValueStorage.ts
│   ├── navigation/         # RootNavigator.tsx, routes.ts (typed route params)
│   ├── viewmodels/         # useWeatherViewModel.ts, useSearchViewModel.ts, ...
│   ├── views/
│   │   ├── screens/        # WeatherScreen.tsx, SearchScreen.tsx, FavoritesScreen.tsx, ...
│   │   └── components/     # ForecastRow.tsx, LoadingView.tsx, ErrorView.tsx, ...
│   ├── theme/              # colors.ts, spacing.ts, typography.ts
│   └── utils/              # coordinateValidation.ts, refreshPolicy.ts, units.ts
└── docs/                   # Project documentation
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
- Model async UI state as a discriminated union, not several booleans:
  ```ts
  type LoadState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T; isFromCache: boolean; fetchedAt: Date }
    | { status: 'error'; error: AppError };
  ```
- Shared app-wide state (e.g. settings) uses a single React Context provided in `App.tsx`. No Redux or other global state library unless a decision in SPEC §13 approves it.
- Follow the Rules of Hooks. Keep `useEffect` for synchronisation with external systems, not for deriving values (use plain expressions or `useMemo`).
- Wrap callbacks passed to child components in `useCallback` only when a measurable re-render problem exists.

## 8. Async & Error Handling

- Use `async/await`. No `.then()` chains in new code.
- All errors that cross a layer boundary are an `AppError` with a `kind`: `'network' | 'timeout' | 'http' | 'parse' | 'validation' | 'storage'`.
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
  1. Read the cached entry and its `fetchedAt`.
  2. If it is fresh according to `refreshPolicy.isStale(fetchedAt, now, intervalMinutes)`, return it.
  3. Otherwise fetch, parse, store and return.
  4. If the fetch fails and a cached entry exists, return the cache marked `isFromCache: true`.
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
- Test **pure logic first**: parsers, coordinate validation, refresh policy, unit conversion. At least two areas are required (W-24).
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

- Every change reaches `dev` through a pull request reviewed by the **other** student (see [GIT_WORKFLOW.md](GIT_WORKFLOW.md)).
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
- Documentation changes go in `docs/`, in the same PR as the code they describe.

## 18. AI Collaboration Guidelines

- Two coding assistants are used:
  - **Claude Code** (Developer 1, Windows) is told to read `agents/claude.md` at the start of each session.
  - **OpenAI Codex** (Developer 2, macOS) is told to read `agents/codex.md` at the start of each session.
  - These files are not loaded automatically.
- Both files contain the same rules and point to this guide, SPEC.md and CONTEXT.md. There are no assistant-specific coding rules: this guide applies identically to code from either assistant.
- Every AI session starts by reading SPEC.md, STYLE.md and CONTEXT.md (see [SPEC.md §0](SPEC.md#0-ai-meta-instructions)).
- If the two assistants suggest different patterns for the same problem, follow this guide. If the guide does not cover the case, decide as a team and add the rule here, not in only one agent file.
- **Core logic** (parsers, cache and refresh policy, validation, ViewModel state transitions): ask the AI for an explanation, pseudocode or a review **before** asking for complete code. A student must understand the logic before it is generated.
- AI-generated code is treated like code from an unknown contributor. It must be reviewed line by line, type-checked, tested and run on a device or simulator before merging.
- Prompts reference the requirement ID (`W-xx`) and the Linear issue they serve.
- Reject AI suggestions that add libraries, layers or files not justified by this guide.
- Record each session in [LLM_PROCESS.md](LLM_PROCESS.md), including mistakes the AI made.
- AI does not write the students' reflection.
