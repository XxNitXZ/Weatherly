# Weatherly – Requirements Specification

> Living document. Last structural update: 2026-11-10 (NIT-202).
> Status values in this file are changed **only by the students** after independent verification.

---

## 0. AI Meta-Instructions

These instructions apply to every AI assistant working on this repository: **Claude Code in VS Code** (used by both developers, D-15), and ChatGPT for planning and review. They take precedence over general assistant defaults. The agent rule set is [CLAUDE.md](CLAUDE.md), which Claude Code loads automatically from the repository root; [AGENTS.md](AGENTS.md) only points to it. The rule set must not diverge from this file ([CONTEXT.md §15](CONTEXT.md#15-ai-collaboration-workflow)). Until 2026-11-18, Developer 2 used OpenAI Codex with a separate copy of the rules (D-13, superseded).

1. **Read first.** Before every implementation session, read [SPEC.md](SPEC.md), [STYLE.md](STYLE.md) and [CONTEXT.md](CONTEXT.md).
2. **Stay in scope.** Implement only the user story or task named in the session request. Do not implement unrelated user stories, even partially.
3. **Respect course constraints.** Follow the Lab B:2 requirements in this file and the decisions in [CONTEXT.md](CONTEXT.md). If a request conflicts with them, stop and say so.
4. **No unnecessary libraries.** Do not add a dependency unless the session request or an accepted decision in §13 allows it. Prefer Expo SDK modules and React Native built-ins. Install Expo-compatible versions with `npx expo install`.
5. **Explain architecture.** When creating or changing structure (new layer, new file type, new dependency), explain the reasoning so the students can defend it at the oral examination.
6. **Never mark requirements complete.** Do not change any status in §11 to `VERIFIED`. An assistant may propose `IMPLEMENTED` only for code it actually wrote in the current session, and must say so explicitly.
7. **Never invent results.** Do not invent test results, test counts, screenshots, coverage numbers or API behaviour.
8. **Be honest about platforms.** Do not claim the app was run on the Android Emulator or iOS Simulator unless that run actually happened in the session and its output was observed.
9. **Do not write the reflection.** Do not write or edit the students' personal reflection ([REFLECTION.md](REFLECTION.md)).
10. **English only.** All code, comments, identifiers, commit messages and documentation are in English.
11. **Code from the students' prompts.** The AI writes code according to the students' prompts. The students review, test and modify it, and must be able to explain every line before they commit it. For core logic (parsing, caching, validation and ViewModel logic), the AI explains the key decisions and trade-offs along with the code (see [STYLE.md §18](STYLE.md#18-ai-collaboration-guidelines)).
12. **End-of-session reminder.** At the end of every session, remind the students to complete the end-of-session checklist in [CONTEXT.md §16](CONTEXT.md#16-end-of-session-checklist) and the update procedure in §15 of this file.

---

## 1. Project Goal

Weatherly is a native cross-platform weather app for Android and iOS. A user can:
- search for a location by place name or by coordinates
- see the current weather, an hourly forecast for today and a seven-day forecast
- save favourite locations
- configure refresh and display preferences
- keep using recently loaded data while offline

The project also aims to show professional software engineering practice: clear MVVM architecture, typed data models, isolated JSON parsing, tested core logic and a documented, reviewed AI-assisted workflow.

## 2. Course Information

| Item | Value |
|---|---|
| Course | KTH HI1033 / CM2023 |
| Assignment | Lab B:2 – Building a Native Weather App |
| Grading target | Higher level – 2 points |
| Team | Two students, shared repository |
| Examination | Code submission and oral examination (see [CONTEXT.md §14](CONTEXT.md#14-submission-requirements)) |

## 3. Higher-Level Grading Target

To reach the higher level, the app must meet all mandatory requirements (§6) **and** the quality objectives (§8):

- Clear separation of responsibilities between layers.
- Consistent and deliberate naming.
- Maintainable, readable code.
- A designed, consistent user interface.
- Robust edge-case handling.
- The students' ability to explain every architectural decision.

## 4. Technology Stack

| Area | Choice | Status |
|---|---|---|
| Framework | React Native 0.88 via Expo SDK 58 | Decided (D-01) |
| Language | TypeScript 6.0, `strict: true` | Decided (D-01) |
| Weather API | Open-Meteo (REST, JSON) | Decided (D-05) |
| Geocoding API | Open-Meteo Geocoding API (`geocoding-api.open-meteo.com/v1/search`, no key, `language=sv`) | Decided (D-24, supersedes D-06) |
| Navigation | React Navigation: `@react-navigation/native`, `@react-navigation/native-stack`, peer `react-native-screens`; one native stack | Decided (D-07, D-35); installed (US-04.01) |
| Local persistence | `@react-native-async-storage/async-storage` | Decided (D-08) |
| Unit testing | Jest with the `jest-expo` preset; tests in the root `tests/` folder | Decided (D-09, D-23); installed |
| State management | React hooks as ViewModels, no global state library | Proposed (D-10) |
| Cross-platform testing | Android Emulator (Windows) and iOS Simulator (macOS) | Decided (D-12) |
| Safe areas | `react-native-safe-area-context` | Decided (D-26); installed (US-03.01) |
| Weather icons | `@expo/vector-icons` (MaterialCommunityIcons), with its required peers `expo-font` and `expo-asset` | Decided (D-34); installed (home-screen redesign) |
| Gradients and shadows | React Native's own `backgroundImage` and `boxShadow` styles, no library | Decided (D-33) |

The runtime dependencies installed today are:
- `expo`, `expo-status-bar`, `react` and `react-native`
- `react-native-safe-area-context` (US-03.01)
- `@expo/vector-icons`, `expo-font` and `expo-asset` (redesign, D-34)
- `@react-navigation/native` ^7.5.2, `@react-navigation/native-stack` ^7.21.1 and `react-native-screens` ~4.30.1 (US-04.01, D-35)

Jest, `jest-expo` and `@types/jest` are installed as dev dependencies (US-02.01). The other libraries decided above are **not installed yet**. Each is added with `npx expo install` in the user story that first needs it.

## 5. Architecture

Weatherly uses **MVVM** with a thin data layer. Dependencies point inwards only: View → ViewModel → Repository → (API service + Parser, Storage) → Model.

```
View (screens, components)       renders state, forwards user events
  │
ViewModel (custom hooks)         UI state, loading/error state, user intents
  │
Repository                       single source of truth, caching, offline fallback
  │                  │
API service          Storage     HTTP requests, persistence (no UI knowledge)
  │
Parser                           raw JSON → typed Model, validation
  │
Model                            plain TypeScript types, no logic dependencies
```

Detailed layer rules, layer contracts, the search-to-forecast data flow, navigation ownership and the folder structure are in [STYLE.md §3–4](STYLE.md#3-mvvm-architecture). The `src/` folder structure exists. Which modules exist and which are still planned is tracked in the status column of STYLE §3.1.

---

## 6. Functional Requirements (mandatory)

| ID | Requirement | Category |
|---|---|---|
| W-01 | The user can search for locations by place name. | Search |
| W-02 | Place-name search uses a geocoding REST API and lists the matching locations. | Search / API |
| W-03 | The user can search by latitude/longitude. The input is validated before any request is sent. | Search |
| W-04 | The app shows the current weather conditions for the selected location. | Weather |
| W-05 | The app shows a seven-day weather forecast. | Weather |
| W-06 | The app shows hourly details for today. | Weather |
| W-07 | The user can open details for a single forecast day. | Weather |
| W-08 | The user can add locations to and remove them from favourites. Favourites persist between app launches. | Favourites |
| W-09 | A favourites screen gives quick access to saved locations. | Favourites |
| W-10 | A settings screen exists. | Settings |
| W-11 | The user can configure the weather refresh interval. | Settings |
| W-12 | The user can configure UI preferences (at least the temperature unit; the final set is decided in the settings story). | Settings |
| W-13 | Weather data is fetched from a REST weather API (Open-Meteo, D-05). | Data |
| W-14 | JSON parsing is done in separate parser modules, never in views or ViewModels. | Data |
| W-15 | All data inside the app uses typed internal models, not raw API JSON. | Data |
| W-16 | Weather data is cached locally on the device. | Persistence |
| W-17 | When offline, the app falls back to the cached data and clearly shows that it may be outdated. | Persistence |
| W-18 | Network errors (no connection, timeout) are handled with clear messages and a retry option. | Robustness |
| W-19 | API response errors (HTTP errors, malformed or incomplete JSON) are handled without crashing. | Robustness |
| W-20 | Every asynchronous operation shows a visible loading state. | UX |
| W-21 | Forecast lists are scrollable. | UX |
| W-22 | All screens work in portrait and landscape orientation. | UX |
| W-23 | Network requests are asynchronous and never block the UI thread. | Data |
| W-24 | Unit tests cover at least two of the lab's logic areas: JSON parsing, error-state logic, data transformation. | Testing |
| W-25 | At least 20 distinct UX interaction scenarios are defined, executed and documented. | Testing |

## 7. Detailed Requirements

Planned components follow the folder structure in [STYLE.md §4](STYLE.md#4-folder-structure). File names are **planned**, not existing.

**W-01 – Place-name search**
- Searching is triggered by a submit action: the "Search" button or the keyboard's search key (US-03.01). There is no search-as-you-type, which keeps requests to one per submitted query.
- Repeating the query that is loading or already shown sends no second request (D-28).
- Leading and trailing whitespace is trimmed, and empty input sends no request.
- Results show the name plus context (region/country) so that places with the same name can be told apart.
- An empty result list shows a "no locations found" message.
- Planned: `HomeScreen`, `useSearchViewModel`, `locationRepository` (D-17), `geocodingService`.

**W-02 – Geocoding API integration**
- Uses the Open-Meteo Geocoding API (D-24). The SMHI place search named in the lab instructions no longer exists (HTTP 404, checked 2026-11-20).
- Requests use `language=sv`, so Swedish spellings such as "Göteborg" are found. Results come with `admin1` (region) and `country`, which are shown to tell same-named places apart.
- No results: the response has no `results` key, which means an empty list, not an error.
- `locationRepository` calls `geocodingService`, and the response is parsed by `geocodingParser` into `Location` models (D-17).
- Selecting a result loads the weather for that location.

**W-03 – Coordinate search and validation**
- Latitude must be in [-90, 90] and longitude in [-180, 180].
- Accepts decimal numbers with `.` or `,` as the decimal separator (D-25): an optional sign, digits, and an optional decimal part with digits on both sides (`59.33`, `-33,87`). Scientific notation, hex, `Infinity`, `59.` and `.5` are rejected.
- Each field reports its own error: `empty`, `notANumber` or `outOfRange`.
- Invalid input shows an inline validation message, and no request is sent.
- The validation logic is a pure function (`coordinateValidation`) and is a unit-test candidate (W-24).

**W-04 – Current weather**
- Shows at least the temperature, a weather-condition description/icon and the observation time.
- Additional fields (wind, humidity, etc.) are selected from what Open-Meteo provides (D-05).
- Values are shown in the user's selected units (W-12).
- Implemented in US-03.02 (D-29, D-30):
  - **Shown always:** temperature, condition text from the WMO code (`describeWeatherCode`, "Unknown conditions" for unknown codes) and the observation time in the location's local time.
  - **Shown when the API provides them:** feels-like temperature, relative humidity and wind speed.
  - **Units:** °C, % and m/s, as requested from the API (W-12 is not yet implemented).
  - Since D-33 / D-34 the current weather is the home screen's hero: a large icon (day or night variant), the temperature, the condition, and today's high and low.

**W-05 – Seven-day forecast**
- Shows exactly seven days starting today, each with the date/weekday, min/max temperature and a condition indicator.
- The list is scrollable (W-21).
- Implemented in US-03.03:
  - `selectForecastDays` starts at the day that contains "now" and shows at most seven days; it never invents missing days.
  - Today's row says "Today" and is highlighted. The other rows show the short weekday and date ("Sat", "21 Nov"), the condition text, and the high and low temperatures as the API sent them.
  - Dates are those of the location (D-31).

**W-06 – Hourly details for today**
- Shows hourly entries for the rest of the current day, in the selected location's time zone.
- If the API gives a different resolution, the actual behaviour is documented in §13.
- Implemented in US-03.04 as a horizontal list:
  - `selectRemainingHoursToday` keeps the hour in progress and the later hours of today. "Today" means the API's own day boundaries (D-31).
  - Each hour shows local time, temperature and condition text.
  - When no hour is left, the section says so and points to the 7-day forecast.
  - The API's resolution is one entry per hour, 24 per day, also across a daylight-saving change (D-31).

**W-07 – Daily forecast details**
- Selecting a day in the seven-day forecast opens a detail view for that day.
- The fields shown are selected from the Open-Meteo daily data (D-05).

**W-08 – Favourite locations**
- Add/remove is available from the weather view.
- Duplicates are prevented by comparing coordinates (with a defined tolerance) or the provider ID.
- Favourites are stored through `favoritesRepository` and survive app restarts.

**W-09 – Favourites quick-access screen**
- Lists saved favourites, and selecting one opens its weather.
- An empty list shows guidance on how to add favourites.

**W-10 – Settings screen**
- A dedicated screen that hosts W-11 and W-12.
- Settings persist through `settingsRepository`.

**W-11 – Configurable refresh interval**
- The user can choose from a fixed set of intervals (exact values decided in the settings story).
- Data older than the interval is refetched when it is displayed, and fresh data is served from the cache.
- The staleness check is a pure function (`refreshPolicy`) and is a unit-test candidate (W-24).

**W-12 – UI preferences**
- At least the temperature unit (°C/°F).
- More preferences (e.g. wind-speed unit) are optional and recorded in §13 when chosen.

**W-13 – REST weather API**
- Weather data comes from Open-Meteo (D-05).
- All HTTP calls live in `src/services/api/` (`weatherService`).
- Endpoint URLs and query parameters are built in one place.

**W-14 – Separate JSON parser**
- `weatherParser` and `geocodingParser` turn `unknown` JSON into typed models.
- Parsers do no network or storage work and are pure functions.
- Parsers are unit-test candidates (W-24).

**W-15 – Typed internal models**
- Models live in `src/models/`, for example `Location`, `CurrentWeather`, `HourlyForecast`, `DailyForecast`, `WeatherReport`, `AppSettings`.
- Views and ViewModels never see raw API types.

**W-16 – Local caching**
- `weatherRepository` stores the last successful `WeatherReport` per location, together with the time it was fetched as `fetchedAtEpochMs` (D-18).
- The cache is read through `keyValueStorage`, a thin wrapper around `@react-native-async-storage/async-storage` (D-08).

**W-17 – Offline fallback**
- If a fetch fails and cached data exists, the cached data is shown with an "offline / last updated <time>" indicator.
- A fresh cache hit (no fetch needed) is normal and shows no offline indicator (D-20).
- If no cached data exists, an error state with retry is shown (W-18).

**W-18 – Network error handling**
- Covers no connection and timeouts.
- Shows a user-readable message, never a stack trace.
- Offers a retry action.

**W-19 – API response error handling**
- Covers non-2xx statuses, malformed JSON and missing required fields.
- The service or parser raises a typed `AppError`. The repository or ViewModel handles it, so it never reaches the user as an uncaught exception.

**W-20 – Loading states**
- Every screen that fetches data shows a loading indicator.
- Pull-to-refresh or refresh actions show progress.

**W-21 – Scrollable lists**
- Forecast lists use `FlatList` or `ScrollView`, so all content is reachable on small screens and in landscape.

**W-22 – Portrait and landscape**
- The `app.json` orientation setting is changed from `portrait` to support both orientations when the relevant story is implemented.
- Layouts adapt using `useWindowDimensions`.

**W-23 – Async network requests**
- Uses `fetch` with `async/await`.
- Requests that are no longer needed (e.g. when navigating away or making a new search) are ignored or aborted.

**W-24 – Unit tests**
- Automated unit tests, written in Jest with `jest-expo` (D-09), cover at least two of the three areas named in the Lab B:2 instructions:
  - **JSON parsing:** `weatherParser` (US-02.01) and `geocodingParser`. Planned first.
  - **Error-state logic:** e.g. how a ViewModel maps a result or `AppError` to `LoadState` (D-20).
  - **Data transformation:** e.g. grouping hourly data for today and daily data for the other days, or unit conversion.
- The two areas are JSON parsing plus error-state logic or data transformation (decided 2026-11-20).
- Coordinate validation and the refresh policy may also be tested, but they do not count toward the two areas.
- Results are recorded in [TEST_REPORT.md](TEST_REPORT.md).

**W-25 – UX scenarios**
- At least 20 distinct scenarios are defined in [TEST_REPORT.md §3](TEST_REPORT.md#3-ux-interaction-scenarios).
- Each is executed on the Android Emulator (Windows) and the iOS Simulator (macOS).

## 8. Quality Requirements (higher level)

| ID | Requirement | Verification |
|---|---|---|
| W-26 | Clear separation of responsibilities following the MVVM layer rules in STYLE.md. | Code review against [STYLE.md §3](STYLE.md#3-mvvm-architecture) |
| W-27 | Consistent, deliberate naming as defined in STYLE.md. | Code review against [STYLE.md §5](STYLE.md#5-naming-conventions) |
| W-28 | Maintainable code: strict TypeScript, no `any`, no dead code, small focused modules. | `npx tsc --noEmit`, code review |
| W-29 | A designed and consistent UI: a shared theme (colours, spacing, typography) used on every screen. | Visual review on both platforms |
| W-30 | Robust edge-case handling (empty input, no results, invalid coordinates, offline, malformed data, rotation during load). | UX scenarios in TEST_REPORT.md |
| W-31 | Every architectural decision is recorded in §13 and can be explained by both students. | Decision log, oral exam preparation |

## 9. Testing Requirements

| ID | Requirement |
|---|---|
| W-32 | Every UX scenario and every feature is verified on **both** the Android Emulator (Windows) and the iOS Simulator (macOS) before its requirement is set to `VERIFIED`. |

- Unit tests: see W-24, [STYLE.md §13](STYLE.md#13-unit-testing-conventions) and [TEST_REPORT.md §2](TEST_REPORT.md#2-automated-unit-tests).
- Mutation evidence: for each unit-tested logic area, deliberately introduce a fault, confirm a test fails, revert, and record this in TEST_REPORT.md.
- Static checks: `npx tsc --noEmit` and `npx expo-doctor` must pass before every pull request.

## 10. Development Workflow & AI Usage Rules

| ID | Requirement |
|---|---|
| W-33 | AI usage is recorded per session in [LLM_PROCESS.md](LLM_PROCESS.md): which assistant was used (Claude Code; earlier sessions may also name OpenAI Codex), which developer operated it, and what was accepted, modified and verified. |
| W-34 | All work follows the Git workflow in [GIT_WORKFLOW.md](GIT_WORKFLOW.md): feature branches from `dev`, pull requests into `dev`, a stable `main`, and Conventional Commits. The single documented exception is the direct-on-`dev` step in GIT_WORKFLOW.md §16 (D-16). |

AI usage rules:
- AI may propose code, but students review, test and must be able to explain every line that is merged.
- AI output that a student cannot explain is not merged.
- The meta-instructions in §0 apply to every session.
- The students write [REFLECTION.md](REFLECTION.md) themselves.

### 10.1 AI Usage Summary

The Lab B:2 instructions ask for a short statement of which parts were AI-assisted and which tools were used.

- **Claude Code in VS Code** (both developers, D-15) generated the code from the students' prompts and drafted the project documentation.
- The students manually checked all AI output, ran it on the Android Emulator and iOS Simulator, modified it where needed, and did all Git work themselves (commits, pushes and pull requests).
- **ChatGPT** was used for planning and review ([LLM_PROCESS.md §1](LLM_PROCESS.md#1-ai-assistants-in-this-project)).
- Per-session details, including the prompts used, are in [LLM_PROCESS.md](LLM_PROCESS.md).

---

## 11. Requirement Tracking

**Status values:**
- `NOT STARTED`: no implementation exists.
- `IN PROGRESS`: work has started (code on a branch, or setup/documentation), but not every acceptance criterion is verified. See §11.1.
- `IMPLEMENTED`: code is merged to `dev` but not yet verified on both platforms.
- `VERIFIED`: a student has verified it on the Android Emulator **and** the iOS Simulator, and the tests are recorded.

**Linear identifiers:** only identifiers from the Linear project are used (full list in §11.2).
- The **first** user story listed is the primary owner of the requirement. Further stories contribute to it.
- Quality requirements (W-26 – W-28) also apply to every other story.

| ID | Epic | User Story | Planned components | Tests | Status |
|---|---|---|---|---|---|
| W-01 | NIT-153 | NIT-165 (US-02.03); NIT-169 (US-03.01) | `LocationSearchSheet`, `useSearchViewModel`, `locationRepository`, `geocodingService` | UX-01, UX-02, UX-03 | IN PROGRESS |
| W-02 | NIT-153 | NIT-165 (US-02.03) | `locationRepository`, `geocodingService`, `geocodingParser`, `Location` | Unit: geocodingParser; UX-01 | IN PROGRESS |
| W-03 | NIT-153 | NIT-166 (US-02.04) | `coordinateValidation`, `useCoordinateSearchViewModel`, `CoordinateSearchForm`, `LocationSearchSheet` | Unit: coordinateValidation; UX-04, UX-05 | IN PROGRESS |
| W-04 | NIT-154 | NIT-170 (US-03.02) | `HomeScreen`, `useWeatherViewModel`, `WeatherHero`, `weatherCode`, `weatherIcon`, `weatherFormatting` | Unit: weatherCode, weatherIcon, weatherFormatting, homePresentation, weatherStatus; UX-06 | IN PROGRESS |
| W-05 | NIT-154 | NIT-171 (US-03.03) | `HomeScreen`, `DailyForecastList`, `DailyForecastRow`, `selectForecastDays`, `presentDailyForecast` | Unit: forecastSelection, forecastFormatting; UX-07 | IN PROGRESS |
| W-06 | NIT-154 | NIT-172 (US-03.04) | `HomeScreen`, `HourlyForecastList`, `HourlyForecastItem`, `selectRemainingHoursToday`, `presentHourlyForecast` | Unit: forecastSelection, forecastFormatting; UX-08 | IN PROGRESS |
| W-07 | NIT-155 | NIT-174 (US-04.02); NIT-175 (US-04.03); NIT-173 (US-04.01) | `DayDetailScreen`, `src/navigation/` | UX-09 | NOT STARTED |
| W-08 | NIT-156 | NIT-176 (US-05.01); NIT-177 (US-05.02) | `favoritesRepository`, `useFavoritesViewModel` | UX-10, UX-11, UX-12, UX-24 | NOT STARTED |
| W-09 | NIT-156 | NIT-178 (US-05.03); NIT-173 (US-04.01) | `FavoritesScreen` | UX-12, UX-13, UX-25 | NOT STARTED |
| W-10 | NIT-157 | NIT-179 (US-06.01); NIT-173 (US-04.01) | `SettingsScreen`, `useSettingsViewModel`, `settingsRepository` | UX-14 | NOT STARTED |
| W-11 | NIT-157 | NIT-180 (US-06.02) | `refreshPolicy`, `settingsRepository` | Unit: refreshPolicy; UX-15 | NOT STARTED |
| W-12 | NIT-157 | NIT-181 (US-06.03) | `AppSettings`, `units`, `settingsRepository` | Unit: unit conversion (optional); UX-16 | NOT STARTED |
| W-13 | NIT-153 | NIT-167 (US-02.02) | `weatherService`, `httpClient`, `weatherRepository` | Unit: weatherService, httpClient, weatherRepository; UX-06 | IN PROGRESS |
| W-14 | NIT-153 | NIT-168 (US-02.01); NIT-165 (US-02.03) | `weatherParser`, `geocodingParser` | Unit: weatherParser, geocodingParser | IN PROGRESS |
| W-15 | NIT-153 | NIT-168 (US-02.01) | `src/models/*` | `tsc --noEmit`; review | IN PROGRESS |
| W-16 | NIT-158 | NIT-182 (US-07.01) | `weatherRepository`, `keyValueStorage` | UX-17 | NOT STARTED |
| W-17 | NIT-158 | NIT-183 (US-07.02) | `weatherRepository`, offline indicator | UX-17, UX-18 | NOT STARTED |
| W-18 | NIT-158 | NIT-184 (US-07.03); NIT-188 (US-08.03) | `httpClient`, `ErrorView` | Unit: httpClient; UX-18, UX-19 | IN PROGRESS |
| W-19 | NIT-158 | NIT-184 (US-07.03) | parsers, `httpClient`, `AppError` | Unit: parser and httpClient error cases | IN PROGRESS |
| W-20 | NIT-158 | NIT-185 (US-07.04); NIT-188 (US-08.03) | all ViewModels, `SearchStatus`, `LoadingView` | Unit: describeSearchStatus; UX-20 | IN PROGRESS |
| W-21 | NIT-154 | NIT-171 (US-03.03); NIT-172 (US-03.04) | screen `FlatList` (days as plain rows), horizontal `FlatList` for hours | UX-07, UX-08 | IN PROGRESS |
| W-22 | NIT-159 | NIT-187 (US-08.02) | `app.json`, responsive layouts | UX-21, UX-22 | NOT STARTED |
| W-23 | NIT-158 | NIT-185 (US-07.04); NIT-167 (US-02.02) | `httpClient`, ViewModels | Unit: httpClient; UX-20, UX-23 | IN PROGRESS |
| W-24 | NIT-160 | NIT-189 (US-09.01); NIT-216 (US-02.01) | `tests/**/*.test.ts` | TEST_REPORT §2 | IN PROGRESS |
| W-25 | NIT-160 | NIT-190 (US-09.02) | — | TEST_REPORT §3 | NOT STARTED |
| W-26 | NIT-152 | NIT-163 (US-01.03) | whole codebase, folder structure | Code review | NOT STARTED |
| W-27 | NIT-152 | NIT-163 (US-01.03); NIT-164 (US-01.04) | whole codebase | Code review | NOT STARTED |
| W-28 | NIT-152 | NIT-161 (US-01.01); NIT-163 (US-01.03) | whole codebase | `tsc`, review | NOT STARTED |
| W-29 | NIT-159 | NIT-186 (US-08.01) | `src/theme/` (incl. `sky.ts`), `WeatherCard`, shared components | Unit: skyVariantFor; visual review | IN PROGRESS |
| W-30 | NIT-158, NIT-159 | NIT-184 (US-07.03); NIT-188 (US-08.03) | whole codebase | UX-03, UX-05, UX-18, UX-19, UX-24 | NOT STARTED |
| W-31 | NIT-160, NIT-152 | NIT-192 (US-09.04); NIT-164 (US-01.04) | SPEC §13 | Oral exam prep | IN PROGRESS |
| W-32 | NIT-160 | NIT-190 (US-09.02); NIT-162 (US-01.02) | — | TEST_REPORT §3 | NOT STARTED |
| W-33 | NIT-160, NIT-152 | NIT-191 (US-09.03); NIT-164 (US-01.04) | LLM_PROCESS.md, CLAUDE.md, AGENTS.md | Review | IN PROGRESS |
| W-34 | NIT-152 | NIT-162 (US-01.02) | GIT_WORKFLOW.md, repository | Review | IN PROGRESS |

### 11.1 Verified Progress on Partially Complete Requirements

Only items that were actually checked are listed as verified.

| ID | Verified (date, evidence) | Not yet verified / remaining |
|---|---|---|
| W-24 | Jest + `jest-expo` installed; `tests/parsers/weatherParser.test.ts` has 17 tests for the lab area "JSON parsing", all passing, with 3 mutation checks recorded (TEST_REPORT §2.3) (2026-11-20, NIT-216) | A second lab area (error-state logic or data transformation). Candidates since 2026-11-22, all with tests and mutation checks (TEST_REPORT §2.1, §2.3):
- error-state logic: `describeSearchStatus`, `describeWeatherStatus`
- data transformation: `selectForecastDays` and `selectRemainingHoursToday`, which group hourly data for today and daily data for the other days, the example SPEC W-24 names

The team decides which count |
| W-13 | `weatherService` (URL + `fetchForecast`), `httpClient` and `weatherRepository.getReport` written on the US-02.02 branch (NIT-211, NIT-212). Unit tests pass with a fake `fetch`. Real-API checks through `getReport` passed for 4 locations from Node and for Stockholm in the iOS Simulator (2026-11-20, NIT-213, TEST_REPORT §1.2) | Android Emulator check; merge to `dev`. Display of polar days is open (OQ-07) |
| W-18 | The data layer reports no connection as `AppError('network')` and no answer within 10 s as `AppError('timeout')` (unit tests, 2026-11-20, NIT-212). For place search, `searchErrorMessage` gives a user-readable message per kind and never shows the developer message; after an error the same query can be searched again (unit tests, 2026-11-22, NIT-218). The same holds for the weather load with `weatherErrorMessage`; selecting the place again retries (unit tests, 2026-11-22, NIT-170) | Not yet seen on a device. Since D-33 a failed weather load shows a "Try again" button (`WeatherStatus`, calls `load` for the same place); the error texts still also mention selecting the place again. Place search is retried by searching again (US-07.03, US-08.03) |
| W-29 | Weather-first redesign (D-33): one sky theme (`src/theme/sky.ts`) with computed WCAG contrast (white ≥ 6.3:1, muted ≥ 4.8:1), shared `WeatherCard`, consistent tokens on every element of the home screen; Android and iOS bundles build (2026-11-22) | Visual review on both platforms; the search sheet still uses the earlier light styling; the full design system is US-08.01 |
| W-20 | Place search shows a loading indicator while a search runs (`describeSearchStatus` → `loading`; unit tests, 2026-11-22, NIT-218). The current-weather load does the same (`describeWeatherStatus` → `loading`; unit tests, 2026-11-22, NIT-170) | Not yet seen on a device (UX-20). Hourly and seven-day forecasts (NIT-171, NIT-172) |
| W-05 | `selectForecastDays` and `presentDailyForecast` (unit tests with the real forecast and a real daylight-saving response, mutation checks); `DailyForecastList` on `HomeScreen` from the same report as the current weather. Live check 2026-11-22: 7 days for Stockholm, New York and Sydney, today correctly marked (TEST_REPORT §1.7). Bundles build | Not yet run on a device or simulator (UX-07) |
| W-06 | `selectRemainingHoursToday` and `presentHourlyForecast` (unit tests: current hour, local midnight, other time zones, real daylight-saving weekend, empty data, non-finite times; mutation checks); horizontal `HourlyForecastList` on `HomeScreen`. Live check 2026-11-22 at 11:37 UTC: Stockholm 12:00 – 23:00, New York 06:00 – 23:00, Sydney 22:00 – 23:00 (TEST_REPORT §1.7) | Not yet run on a device or simulator (UX-08); times after a daylight-saving change within the forecast window (OQ-08) |
| W-21 | The screen is one vertical `FlatList`; the seven days are plain rows inside it and the hours a horizontal `FlatList`, so no vertical list is nested (US-03.03, US-03.04) | Scrolling not yet tried on a device (UX-07, UX-08) |
| W-04 | `useWeatherViewModel` loads the selected location's report through `weatherRepository.getReport`; `WeatherHero` (D-33; replaced `CurrentWeatherCard`) shows the icon, temperature, condition, today's high and low, feels-like, humidity, wind and observation time. Code descriptions, formatting, error states and request ordering unit-tested with mutation checks. Live check 2026-11-22: today's Open-Meteo responses for 59.3293/18.0686, Lund and Sydney parsed and formatted without errors (TEST_REPORT §1.6). Android and iOS bundles build | Not yet run on a device or simulator (UX-06), so the hook and the card are unverified on screen |
| W-19 | `httpClient` reports non-2xx as `AppError('http')` and invalid JSON as `AppError('parse')`; the parser reports missing or invalid fields as `AppError('parse')` (unit tests, 2026-11-20) | Handling in the ViewModel and UI without crashing (US-07.03) |
| W-23 | `httpClient` uses `async/await` with `fetch`, which does not block the UI thread, and cancels slow requests with `AbortController` (2026-11-20, NIT-212) | Outdated results are ignored in `useSearchViewModel` (NIT-207) and `useWeatherViewModel` (`createLatestRequestGuard`, unit-tested, 2026-11-22, NIT-170); still to check on a device: UX-20, UX-23 (US-07.04) |
| W-03 | `validateCoordinates`, `useCoordinateSearchViewModel` and `CoordinateSearchForm` written on the US-02.04 branch. 37 validation tests and 6 message tests pass; 4 mutation checks detected (NIT-209, NIT-210). On the iOS Simulator, 6 scripted steps passed: valid pair, comma decimals, out-of-range and empty/malformed fields with inline messages, errors cleared on valid input, return-key flow (TEST_REPORT §1.4, 2026-11-20, NIT-208) | On-screen iOS keyboard minus key not yet verified; Android Emulator. Since 2026-11-22 the form is on `HomeScreen` (US-03.01, "Coordinates" tab), where a valid pair becomes the selected location; not yet run on a device |
| W-01 | `locationRepository.searchLocations` returns typed locations from the real API (Göteborg, Gothenburg, Kiruna, New York found; xqzvbn → empty list), checked from Node on 2026-11-20 (NIT-206). `useSearchViewModel` trims the query and sends no request for empty input; the trimming rule is unit-tested (NIT-207, 2026-11-20). `HomeScreen` with search field, result list, empty and error states and selection written; repeat guard and status logic unit-tested; Android and iOS bundles build (US-03.01, 2026-11-22, TEST_REPORT §1.5) | The search UI and the hook's state changes have not been run on a device: UX-01 – UX-03 on both platforms |
| W-02 | Open-Meteo Geocoding chosen (D-24); service, parser and repository written with unit tests (NIT-206, 2026-11-20); same-named places carry region and country | Results are listed by `HomeScreen` with region and country (US-03.01, 2026-11-22), not yet seen on a device |
| W-14 | `weatherParser` (US-02.01, merged) and `geocodingParser` (US-02.03 branch, NIT-206) are separate pure modules sharing `jsonReaders`; neither views nor ViewModels parse JSON. Unit tests pass with mutation evidence (TEST_REPORT §2) (2026-11-20) | Merge US-02.03 to `dev` |
| W-15 | `src/models/Weather.ts` written on the US-02.01 branch (NIT-214); `npx tsc --noEmit` passes (2026-11-20) | Settings model; merge to `dev` |
| W-28 | `tsconfig.json` has `strict: true`; `npx tsc --noEmit` passes on the scaffold (2026-11-10, NIT-193) | All application code. Status stays `NOT STARTED` because no app code exists yet. |
| W-31 | Decision log (§13) exists with D-01 – D-13 (2026-11-10) | Both students reviewing and being able to explain each decision |
| W-33 | `LLM_PROCESS.md` template with assistant and operator fields exists (NIT-204); `agents/claude.md` and `agents/codex.md` shared one rule set (2026-11-10); since 2026-11-18 the single rule set is the root `CLAUDE.md`, with `AGENTS.md` as a pointer (D-15) | First session entry LLM-001 (2026-11-18). Since D-21 the AI assistant writes an entry at the end of every session; entries must still be added for every remaining session. As of 2026-11-10, `agents/codex.md` had not yet been used with Codex on macOS. |
| W-34 | Git repository initialised (NIT-196); public GitHub repository with `main` and `dev` on `origin`, confirmed via `git ls-remote` and the GitHub API (2026-11-10, NIT-197); local `dev` tracks `origin/dev`; `GIT_WORKFLOW.md` written (NIT-198) | First pull request reviewed and merged into `dev` following the workflow; branch protection not configured |

### 11.2 Linear Identifiers (Weather App project)

**Epic 1 – Project Setup & Architecture (NIT-152):**

| Linear ID | Key | Title |
|---|---|---|
| NIT-161 | US-01.01 | Initialize Expo & TypeScript Project |
| NIT-193 | Task (US-01.01) | Scaffold Expo React Native TypeScript app |
| NIT-162 | US-01.02 | Configure Git, GitHub & Development Environment |
| NIT-196 | Task (US-01.02) | Initialize Git repository and .gitignore |
| NIT-197 | Task (US-01.02) | Create main/dev branching workflow and GitHub remote |
| NIT-198 | Task (US-01.02) | Document Setup and Commit/PR Conventions |
| NIT-163 | US-01.03 | Define MVVM Architecture & Project Structure |
| NIT-164 | US-01.04 | Create SPEC.md, STYLE.md, CONTEXT.md & Documentation Structure |
| NIT-202 | Task (US-01.04) | Create SPEC.md with requirements and AI rules |
| NIT-203 | Task (US-01.04) | Create STYLE.md with architecture and conventions |
| NIT-204 | Task (US-01.04) | Create CONTEXT.md, report/log templates and end-of-session checklist |

**Epics 2–9.** Epic titles are not recorded here; see Linear.

| Epic | Key | Linear ID | User story title | Requirements |
|---|---|---|---|---|
| NIT-153 | US-02.01 | NIT-168 | Create Weather Models & JSON Parser | W-14, W-15 |
| NIT-153 | US-02.02 | NIT-167 | Integrate Weather REST API | W-13, W-23 |
| NIT-153 | US-02.03 | NIT-165 | Implement City Search with Geocoding | W-01, W-02, W-14 |
| NIT-153 | US-02.04 | NIT-166 | Implement Coordinate Search & Validation | W-03 |
| NIT-154 | US-03.01 | NIT-169 | Implement Home Screen & Search Interface | W-01 |
| NIT-154 | US-03.02 | NIT-170 | Display Current Weather Conditions | W-04 |
| NIT-154 | US-03.03 | NIT-171 | Display Seven-Day Forecast | W-05, W-21 |
| NIT-154 | US-03.04 | NIT-172 | Display Today's Hourly Forecast | W-06, W-21 |
| NIT-155 | US-04.01 | NIT-173 | Implement Screen Navigation | W-07, W-09, W-10 |
| NIT-155 | US-04.02 | NIT-174 | Implement Daily Details Screen | W-07 |
| NIT-155 | US-04.03 | NIT-175 | Display Temperature, Wind & Precipitation | W-07 |
| NIT-156 | US-05.01 | NIT-176 | Add and Remove Favorite Locations | W-08 |
| NIT-156 | US-05.02 | NIT-177 | Persist Favorite Locations Locally | W-08 |
| NIT-156 | US-05.03 | NIT-178 | Implement Favorites Screen & Quick Access | W-09 |
| NIT-157 | US-06.01 | NIT-179 | Implement Settings Screen | W-10 |
| NIT-157 | US-06.02 | NIT-180 | Configure Forecast Refresh Interval | W-11 |
| NIT-157 | US-06.03 | NIT-181 | Configure and Persist UI Preferences | W-12 |
| NIT-158 | US-07.01 | NIT-182 | Cache Last Successful Weather Forecast | W-16 |
| NIT-158 | US-07.02 | NIT-183 | Implement Offline Forecast Display | W-17 |
| NIT-158 | US-07.03 | NIT-184 | Handle Network, API & Parsing Errors | W-18, W-19, W-30 |
| NIT-158 | US-07.04 | NIT-185 | Manage Loading States & Concurrent Requests | W-20, W-23 |
| NIT-159 | US-08.01 | NIT-186 | Define Consistent Visual Design System | W-29 |
| NIT-159 | US-08.02 | NIT-187 | Implement Responsive Portrait & Landscape Layouts | W-22 |
| NIT-159 | US-08.03 | NIT-188 | Improve Empty, Loading & Error Screens | W-18, W-20, W-30 |
| NIT-160 | US-09.01 | NIT-189 | Implement Automated Unit Tests | W-24 |
| NIT-160 | US-09.02 | NIT-190 | Document 20 UX Test Scenarios | W-25, W-32 |
| NIT-160 | US-09.03 | NIT-191 | Maintain AI Process Log & Requirements Traceability | W-33 |
| NIT-160 | US-09.04 | NIT-192 | Prepare Reflection Report & Oral Examination | W-31 |

Epic 1 stories map to: NIT-161 → W-28; NIT-162 → W-32, W-34; NIT-163 → W-26, W-27, W-28; NIT-164 → W-27, W-31, W-33.

Totals: 9 epics (NIT-152 – NIT-160) and 32 user stories (NIT-161 – NIT-192).

## 12. Oral Examination Mapping

The 30 official questions from the Lab B:2 instructions. The opening question is always **Q26**. *Code location* and *Answer* are filled in with short, concrete answers as the code that answers each question is built. A dash means that code does not exist yet.

### Data & networking

| # | Question | Req. | Code location | Answer |
|---|---|---|---|---|
| Q1 | Walk through the function that makes the API request. Where is it, and what does it return? | W-13, W-23 | `src/services/api/httpClient.ts` → `getJson`; called by `weatherService.fetchForecast` | `getJson(url, { timeoutMs })` calls `fetch` with an `AbortController` timeout and returns the body as `unknown` JSON. It never returns a model: `weatherRepository.getReport` passes the JSON to `parseWeatherResponse`. Every failure comes back as a typed `AppError`. |
| Q2 | How is the JSON response parsed into your data model? Show the parsing code. | W-14, W-15 | `src/parsers/weatherParser.ts` → `parseWeatherResponse`; `src/parsers/geocodingParser.ts` → `parseGeocodingResponse`; shared readers in `src/parsers/jsonReaders.ts` | Pure functions take `unknown` JSON. Shared `read…` helpers check each field's type and throw `AppError('parse')` with the field path. Weather: the parallel `hourly`/`daily` arrays are zipped into one object per entry, Unix seconds become epoch ms, and API names map to model names (`temperature_2m` → `temperatureCelsius`). Geocoding: each result becomes a `Location` (`admin1` → `region`). |
| Q3 | What fields from the API response does your app use, and what does it ignore? Why those? | W-04 – W-07, W-15 | `src/parsers/weatherParser.ts`, `src/models/Weather.ts`; `src/parsers/geocodingParser.ts` | **Used:** `timezone` and `utc_offset_seconds` (to find "today" in local time); current temperature, feels-like temperature, humidity, weather code, wind and day/night; hourly temperature, weather code, rain probability and wind; daily min/max temperature, weather code, rain sum and probability, max wind, sunrise and sunset. These are what the home and detail screens show (W-04 – W-07). **Ignored:** `latitude`/`longitude` (we already have the location), `elevation`, `generationtime_ms` and the `*_units` objects (units are fixed by the request and encoded in field names). **Geocoding:** uses `name`, `latitude`, `longitude`, `admin1` (region) and `country`, the minimum to show a result and tell same-named places apart; ignores id, population, timezone, elevation and postcodes. |
| Q4 | What happens if the API returns a successful HTTP 200 but the JSON is missing a field your model expects? | W-14, W-19 | `src/parsers/weatherParser.ts` → `readNumber`, `readArray` | **Required field** (time, temperature, weather code): the parser throws `AppError('parse')` with the field's path, e.g. `current.temperature_2m: expected a finite number, got undefined`. A wrong type or an array of the wrong length is handled the same way. **Optional field:** `null` or missing becomes `undefined`, never an invented value. The ViewModel's handling of the error is planned in later stories. |
| Q5 | Trace a complete data flow from the user pressing "search" to the forecast appearing on screen. | W-01, W-02, W-04, W-26 | `src/views/screens/LocationSearchSheet.tsx` → `useSearchViewModel.search` → `locationRepository.searchLocations`; then `HomeScreen.handleSelectLocation` → `useWeatherViewModel.load` → `weatherRepository.getReport` → `WeatherHero`, `HourlyForecastList`, `DailyForecastList` | 1) In the search sheet, "Search" calls `search(query)`; the ViewModel sets `loading` and calls `searchLocations` (geocoding service → `getJson` → `parseGeocodingResponse`). 2) `success` with `Location[]` renders the result rows. 3) Tapping a row (or valid coordinates) calls `HomeScreen.handleSelectLocation`: the sheet closes and `load(location)` sets the location and `loading` together, then `getReport(location.coordinates)` (weather service → `getJson` → `parseWeatherResponse`). 4) `success` with the report renders the hero (`presentWeatherHero`), and `forecastForState` chooses the hours and days for the two forecast cards from the same report. |
| Q6 | How does your app handle caching — what is stored locally, and when is it refreshed? | W-11, W-16 | — | — |

### State management

| # | Question | Req. | Code location | Answer |
|---|---|---|---|---|
| Q7 | Where does the fetched weather data live while the app is running? Show the declaration. | W-26 | `src/viewmodels/useWeatherViewModel.ts` → `const [screenState, setScreenState] = useState<WeatherScreenState>(…)` | In React state inside the weather ViewModel hook: one value `{ location, weather: LoadState<FetchedWeatherReport> }`, kept for as long as `HomeScreen` is mounted. It is not stored on the device yet; that is the cache in Epic 7. |
| Q8 | What happens to the displayed data when the user searches for a new city? | W-01, W-20 | `src/viewmodels/useSearchViewModel.ts` → `search` | For search results: a new search immediately sets the state to `loading`, so the old list disappears and a loading indicator shows. The new results (or an error) replace it. The weather of the selected place stays until the user selects a new place; `load` then sets the new location and `loading` in one update, so the old weather is never shown under the new name (`useWeatherViewModel`). |
| Q9 | How does the UI know when new data has arrived? Trace the update from data layer to screen. | W-26 | `src/viewmodels/useWeatherViewModel.ts` → `runLoad`; `src/views/screens/HomeScreen.tsx` | `getReport` resolves its promise with the report. `runLoad` checks that the request is still the newest and calls `setScreenState({ location, weather: { status: 'success', … } })`. React re-renders `HomeScreen`, which reads `weatherViewModel.state` and, because `status` is now `success`, renders `WeatherHero` and the forecast cards instead of the loading indicator. There is no polling or event bus. |
| Q10 | What state is preserved if the user leaves the app and returns? | W-08, W-10, W-16 | — | — |
| Q11 | Where in the code is the loading state managed? How do you prevent the UI from showing stale data while a new request is in flight? | W-20, W-23 | `src/viewmodels/useSearchViewModel.ts`; `LoadState` in `src/viewmodels/loadState.ts` | In the ViewModel: `search` sets `{ status: 'loading' }` before the request starts, and `LoadState` is a union, so the screen cannot show old results and a spinner at the same time. Outdated responses are ignored (see Q12). |
| Q12 | If the user rapidly searches for two cities, what happens? Can a race condition occur, and how do you guard against it? | W-23, W-30 | `src/viewmodels/useSearchViewModel.ts` → `latestSearchId`, `activeQuery`, `isRepeatedSearch` | Yes, without a guard: if "Lund" answers after "Kiruna", Lund's results would overwrite Kiruna's. Each search increases `latestSearchId` (a `useRef`) and remembers its own number; a result is applied only if its number is still the latest. Unmounting the screen also bumps the number, so late results after leaving are ignored. Pressing "Search" twice for the **same** city sends only one request: `isRepeatedSearch` compares the new query with the one that is loading or shown, ignoring case (D-28). |

### Error handling

| # | Question | Req. | Code location | Answer |
|---|---|---|---|---|
| Q13 | What does the app display if the network request times out? | W-18 | `src/services/api/httpClient.ts`; `FORECAST_TIMEOUT_MS` in `weatherService.ts` | After 10 s the `AbortController` cancels the request, and `getJson` throws `AppError('timeout')`. The on-screen message and retry button are planned (US-07.03); the ViewModel will derive the text from `kind`. |
| Q14 | Where do you distinguish between a network error and an API error response (e.g., HTTP 404 or 500)? | W-18, W-19 | `src/services/api/httpClient.ts` → `getJson` | In one place. If `fetch` itself rejects, there was no answer: `network`, or `timeout` if our abort fired. If a response arrives with `!response.ok` (e.g. 404, 500), the server answered: `http`, with the status in the developer message. |
| Q15 | What happens if the user has no internet connection and opens the app for the first time? | W-17, W-18 | — | — |
| Q16 | What happens if they open it a second time, after having successfully loaded data before? | W-16, W-17 | — | — |
| Q17 | Where is the error state declared, and how does it flow to the UI? | W-18, W-19, W-26 | `src/models/AppError.ts` (`AppError`, `toAppError`); `src/viewmodels/loadState.ts`; `src/viewmodels/useSearchViewModel.ts`; `src/views/components/SearchStatus.tsx` (`describeSearchStatus`, `searchErrorMessage`) | Services and parsers throw `AppError` with a `kind`; the repository passes it on. The ViewModel catches it, converts anything else with `toAppError` (kind `unknown`), and sets `{ status: 'error', error }`. `HomeScreen` passes the state to `SearchStatus`: `describeSearchStatus` turns it into a loading indicator or a message, and `searchErrorMessage` picks the text from `error.kind`, e.g. `network` → "No internet connection…". The developer `message` is never shown. An empty query (`validation`) is shown as a neutral hint, not as an error. |
| Q18 | What was the hardest error case to handle? Show the code. | W-30 | — | — |

### Architecture

| # | Question | Req. | Code location | Answer |
|---|---|---|---|---|
| Q19 | Show the MVVM layers in your code: what belongs to the View, what to the ViewModel, what to the Model/Repository? | W-26 | Place search: `src/views/screens/LocationSearchSheet.tsx` (opened from `HomeScreen`) → `src/viewmodels/useSearchViewModel.ts` → `src/repositories/locationRepository.ts` → `src/services/api/geocodingService.ts` + `src/parsers/geocodingParser.ts` → `src/models/Location.ts` | **View** (`LocationSearchSheet`, `CitySearchForm`, `LocationResultItem`, `SearchStatus`): renders `state` and calls `search(query)` when the user presses "Search"; it never sees a URL or JSON. **ViewModel** (`useSearchViewModel`): trims the query, skips empty and repeated searches, sets `loading`/`success`/`error`, ignores outdated answers. **Repository** (`searchLocations`): joins service and parser. **Service** (`fetchLocations` → `getJson`): the HTTP request, returning `unknown`. **Parser** (`parseGeocodingResponse`): JSON → `Location[]`. **Model** (`Location`): plain typed data. |
| Q20 | Why is the network call not made directly from the View? | W-13, W-26 | `src/services/api/`, `src/repositories/weatherRepository.ts` | The View only renders state. The network call sits in a service behind a repository, so it can be tested without UI (fake `fetch`), and the screen never deals with URLs, timeouts or JSON. The repository is also where caching will be added without changing screens (STYLE §3). |
| Q21 | Where in the code is testable logic separated from UI code? What made that separation easy or hard? | W-24, W-26 | `src/utils/coordinateValidation.ts`; `src/parsers/`; `tests/` | Rules live in pure functions with no React or I/O: `validateCoordinates`, the parsers, `prepareSearchQuery`, `toAppError`. ViewModels only call them, and views only render. That made the 37 coordinate tests trivial: plain input → expected result. Hooks were harder: testing them needs a React test renderer, which we chose not to add, so their state changes are checked on the simulator (UX scenarios). |
| Q22 | How does navigation between screens work? Why does the ViewModel not navigate itself? | W-07, W-26 | — | — |
| Q23 | Open SPEC.md. Walk through how one requirement ID maps to the code that implements it. | W-31 | SPEC.md §11 | — |
| Q24 | What would you change about your architecture if you had to add hourly forecast support tomorrow? | W-06, W-26 | `src/utils/forecastSelection.ts` → `selectRemainingHoursToday`; `src/views/components/HourlyForecastList.tsx` | Almost nothing, which is how US-03.04 went. The data layer already requested and parsed hourly data into `HourlyForecast[]`. The new parts are one pure selector (which hours are "rest of today"), one formatter, two presentational components, and one field (`todayHours`) in the ViewModel's `forecast`. No new request, service, parser or repository change. |

### AI & LLM usage

| # | Question | Req. | Code location | Answer |
|---|---|---|---|---|
| Q25 | Show a function the AI helped you write. Explain it line by line in your own words. | W-33 | — | — |
| Q26 | Open SPEC.md and show us the AI meta-instructions at the top. Walk us through one requirement and find the code that implements it. **(Always asked first.)** | W-31, W-33 | SPEC.md §0, §11 | — |
| Q27 | Where did the AI suggest something you pushed back on or changed? What was your reasoning? | W-33 | LLM_PROCESS.md | — |
| Q28 | How did you verify that AI-generated code actually works correctly? Show a test case. | W-24, W-33 | `tests/parsers/weatherParser.test.ts`; TEST_REPORT §2.3 | The parser is tested against a **real** saved Open-Meteo response, not an invented one. Each failure test changes one field, e.g. "throws a parse error when the current temperature is missing". Mutation checks broke the parser on purpose (removed the length check, skipped the seconds→ms conversion) and confirmed the tests fail. |
| Q29 | What was the most effective prompt you wrote during this lab? What made it work? | W-33 | LLM_PROCESS.md | — |
| Q30 | If you were starting this lab again with the same AI tools, what would you do differently? | W-33 | — | — |

## 13. Decision Log

| ID | Date | Decision | Status | Rationale / Notes | Linear |
|---|---|---|---|---|---|
| D-01 | 2026-11-10 | Expo SDK 58, React Native 0.88, TypeScript strict | Decided | One cross-platform codebase for Android and iOS. Expo removes the need for native project maintenance. | NIT-193 |
| D-02 | 2026-11-10 | Start from the `blank-typescript` template without Expo Router; removed the template's `AGENTS.md` | Decided | Keeps the structure open for our own MVVM layout. Project-specific agent instructions later lived in `agents/` (D-13) and now live in the root `CLAUDE.md` (D-14, D-15). | NIT-193 |
| D-03 | 2026-11-10 | Public GitHub repo with `main` (stable), `dev` (integration) and feature branches from `dev` | Decided | Portfolio visibility and safe integration. See GIT_WORKFLOW.md. | NIT-196, NIT-197 |
| D-04 | 2026-11-10 | `.gitattributes` enforces LF line endings in the repository and working tree | Decided | Avoids CRLF/LF churn between Windows and macOS. | NIT-197 |
| D-05 | 2026-11-10 | Weather API: **Open-Meteo** | Decided | Free REST/JSON API with no key; provides current, hourly and daily data. | NIT-164 (recorded) |
| D-06 | 2026-11-10 | Geocoding: **SMHI place-search API**, as permitted by the lab | Superseded by D-24 | Verify the response format with real requests before implementing the service. See §13.1. | NIT-164 (recorded) |
| D-07 | 2026-11-10 | Navigation: **React Navigation**, minimal packages | Decided | Widely used and well documented. Only the core package, one navigator type and their required peer dependencies are added. Navigation stays out of ViewModels (STYLE.md §3). | NIT-164 (recorded) |
| D-08 | 2026-11-10 | Persistence: **`@react-native-async-storage/async-storage`** | Decided | Simple key-value storage, enough for cache, favourites and settings. Accessed only through `keyValueStorage`. | NIT-164 (recorded) |
| D-09 | 2026-11-10 | Unit testing: **Jest + `jest-expo`** | Decided | The Expo-supported preset for testing pure TypeScript logic. | NIT-164 (recorded) |
| D-10 | 2026-11-10 | ViewModels are custom React hooks, with no global state library | Proposed | Smallest solution that keeps MVVM separation. Revisit only if shared state becomes complex. | NIT-164 |
| D-11 | 2026-11-10 | `README.md` is the only Markdown file at the project root. Agent instructions live in `agents/` (`claude.md`, `codex.md`), and all other project documentation lives in `docs/`. | Superseded by D-14 | Keeps the root clean and groups AI-specific instructions in one place. Trade-off: the files are not auto-loaded, so they must be read explicitly each session. | NIT-164 |
| D-12 | 2026-11-10 | Cross-platform testing on the Android Emulator (Windows) and iOS Simulator (macOS) | Decided | Each developer covers the platform their machine supports. Both are required for `VERIFIED`. | NIT-164 (recorded) |
| D-13 | 2026-11-10 | Two AI coding assistants: Claude Code (Developer 1, Windows) and OpenAI Codex (Developer 2, macOS). Both use `docs/` as the single source of truth through identical rule sets in `agents/claude.md` and `agents/codex.md`, which each developer tells their assistant to read at session start. | Superseded by D-15 | Each developer uses their own assistant without separate or conflicting instructions. | NIT-164 (NIT-204) |
| D-14 | 2026-11-18 | All project Markdown files live at the repository root: `README.md`, `CLAUDE.md`, `AGENTS.md`, `SPEC.md`, `STYLE.md`, `CONTEXT.md`, `GIT_WORKFLOW.md`, `TEST_REPORT.md`, `LLM_PROCESS.md`, `REFLECTION.md`. The `docs/` and `agents/` folders are removed. | Decided | A root `CLAUDE.md` is loaded automatically by Claude Code, which removes the manual-loading trade-off of D-11. Flat links between documents. | NIT-163 |
| D-15 | 2026-11-18 | Both developers use Claude Code in VS Code. `CLAUDE.md` is the single agent rule set; `AGENTS.md` is a short pointer to it. | Decided | One assistant and one rule set remove the risk of two copies diverging. OpenAI Codex usage before this date stays recorded in D-13 and in LLM_PROCESS.md. | NIT-163 |
| D-16 | 2026-11-18 | One-off exception: the work explicitly authorised in the 2026-11-18 session is done directly on `dev`, without a feature branch or PR. That covers the D-14/D-15 Markdown move and related documentation corrections, the NIT-163 folder structure, the minimal shared types and architecture contracts, and the data-flow and navigation-ownership documentation. | Decided | Team decision for this Lab B.2 step only. The feature-branch and PR workflow (GIT_WORKFLOW.md) applies to all later work. See GIT_WORKFLOW.md §16. | NIT-163 |
| D-17 | 2026-11-18 | Add `locationRepository`. It calls `geocodingService`, passes the response to `geocodingParser` and returns typed `Location` values. It stays thin: no location caching or other behaviour. | Decided | Keeps the rule that services return `unknown` and repositories call parsers (STYLE §9), so `useSearchViewModel` never touches raw JSON. STYLE §4 previously had no repository for search. | NIT-163 (NIT-199) |
| D-18 | 2026-11-18 | Timestamps are stored and passed as epoch milliseconds in fields named `…EpochMs` (e.g. `fetchedAtEpochMs`). | Decided | A `Date` does not survive JSON storage. Numbers compare simply in `refreshPolicy` and are easy to test. Convert to `Date` only for display. | NIT-163 (NIT-199) |
| D-19 | 2026-11-18 | The full `src/` folder structure is created up front. Folders without a file contain an empty `.gitkeep`, removed when the first real file is added. No empty modules or placeholder functions. | Decided | Makes the MVVM layers visible from the start (NIT-200). An exception to the earlier "create folders only when needed" rule, limited to this initial setup (STYLE §4). | NIT-163 (NIT-200) |
| D-20 | 2026-11-18 | `LoadState<T>` (in `src/viewmodels/loadState.ts`) has the states `idle`, `loading`, `success`, `refreshFailed` and `error`, with `isRefreshing` on the states that carry data. There is no "from cache" flag: a fresh cache hit is a normal `success`. Only `refreshFailed` shows an outdated or offline notice. | Decided | Separates "data came from the cache" from "data could not be updated", which W-17 actually requires. Shows existing data during a refresh without extra booleans (STYLE §7). | NIT-163 (NIT-199, NIT-200) |
| D-21 | 2026-11-18 | Claude Code writes the `LLM_PROCESS.md` entry at the end of every session, based only on what happened in that session (CLAUDE.md rule 14). Entries do not say who wrote them. Fields the assistant cannot know are left empty. | Decided | The assistant has the full session in context, so the log is complete and consistent across both developers. Previously the students wrote the entries themselves. | NIT-191 (US-09.03) |
| D-22 | 2026-11-20 | One `HomeScreen` combines search with the selected location's current conditions, today's hourly forecast and the seven-day summary. Selecting a day navigates to `DayDetailScreen`. There is no separate search or weather screen. | Decided | Matches the Lab B:2 description of the search/home screen and Linear US-03.01. Removes one screen and one navigation step, so the forecast appears where the user searched. `HomeScreen` uses two ViewModels, `useSearchViewModel` and `useWeatherViewModel` (STYLE §3.2). | NIT-169 (US-03.01) |
| D-23 | 2026-11-20 | All unit tests live in a root `tests/` folder that mirrors `src/` (e.g. `tests/parsers/weatherParser.test.ts`), with saved API responses in `tests/fixtures/`. This replaces the earlier "tests next to the module" rule. `tsconfig.json` lists `"types": ["jest"]`, because TypeScript 6 no longer loads `@types` packages automatically. | Decided | Separates test code from app code, so `src/` holds only what ships in the app. Trade-off: test imports are longer (`../../src/...`), and a moved module must be moved in both trees. | NIT-216 |
| D-24 | 2026-11-20 | Geocoding: **Open-Meteo Geocoding API** (`https://geocoding-api.open-meteo.com/v1/search?name=…&count=10&language=sv&format=json`), replacing the SMHI place search (D-06). | Decided | The lab's SMHI URL returns HTTP 404 for every query. The lab's other option, geocode.maps.co, now returns HTTP 401 without an API key, and a key would be embedded in the app bundle. The KTH proxy only answers its example place and is not allowed in the final app. Open-Meteo Geocoding is free, needs no key, covers the whole world, and comes from the same provider as the weather data. `language=sv` is used because with `en` a search for "Göteborg" does not find the city. Evidence: TEST_REPORT §1.3. Deviation from the lab's list of geocoding APIs; the teacher should be informed. | NIT-205 |
| D-25 | 2026-11-20 | Coordinate input accepts both `.` and `,` as the decimal separator, with a strict format (optional sign, digits, optional decimal part with digits on both sides). Validated by the pure `validateCoordinates`; invalid input never reaches the network. | Decided | Swedish keyboards type a comma, so rejecting "59,33" would fail many real users. A strict pattern before `Number()` is needed because `Number()` turns "" into 0 and accepts "1e2", "0x10" and "Infinity". | NIT-166 (NIT-209) |
| D-26 | 2026-11-22 | Safe areas with **`react-native-safe-area-context`** (installed with `npx expo install`, `~5.11.1`): `SafeAreaProvider` in `App.tsx`, its `SafeAreaView` in screens. | Decided | React Native 0.88's own `SafeAreaView` is deprecated (warns on use) and works on iOS only, so it cannot keep content clear of the Android status bar. The package is a required peer dependency of React Navigation (D-07), and US-03.01 is the first story that needs it (CONTEXT §4). Included in Expo Go. Team decision in the US-03.01 session. | NIT-169 (NIT-217) |
| D-27 | 2026-11-22 | User-facing text is in **English**, like the existing coordinate form. Place names, regions and countries come from the geocoding API in Swedish (`language=sv`, D-24), e.g. "Skåne län, Sverige". | Decided | One language for all app text, consistent with SPEC §0 rule 10 and the existing `coordinateErrorMessage` tests. Team decision in the US-03.01 session. | NIT-169 |
| D-28 | 2026-11-22 | Place search is started only by submitting (button or keyboard search key). Repeating the query that is loading or shown sends no request; the comparison ignores case. After an error the same query can be searched again. | Decided | Avoids duplicate network calls without a debounce timer. Ignoring case is safe because the API does too: "Lund", "lund" and "LUND" returned the same 10 results (2026-11-22). Searching again after an error is how the user retries until a retry button exists (US-07.03). | NIT-169 (NIT-218) |
| D-29 | 2026-11-22 | Current weather display: condition as **text** from the Open-Meteo WMO code table (`describeWeatherCode`), with "Unknown conditions" for unlisted codes; no icons or emoji yet. Units as requested from the API (°C, %, m/s). Rounding: temperature and percentages to whole numbers, wind to one decimal, with a non-breaking space before the unit. Observation time in the location's local time from `utcOffsetSeconds`. | Decided | Text needs no new dependency and is accessible as it is (STYLE §15). The table is copied from the Open-Meteo docs (checked 2026-11-22), not written from memory. An icon set can be added in the design story (US-08.01). The offset is the location's current offset, so it is exact for "now". **"No icons" superseded by D-34**; the text descriptions remain the accessible equivalent of every icon. | NIT-170 |
| D-30 | 2026-11-22 | The selected location is owned by `useWeatherViewModel` together with its weather, in one state value. Both search modes end in `load(location)`. The location's coordinates are used unchanged for the request. Selecting the place that is loading or shown sends no request; after an error, selecting it again retries. | Decided | Replaces the temporary screen state of US-03.01 (STYLE §3.2, step 5). One value for location and weather means the screen can never show one place's weather under another's name. Request ordering uses `createLatestRequestGuard`, which can be unit-tested without a React renderer. | NIT-170 |
| D-31 | 2026-11-22 | **Local time and "today" follow the API's day boundaries and its fixed offset.** "Today" runs from today's `DailyForecast.dateEpochMs` to the next day's. Hour and date labels use the report's `utcOffsetSeconds`; day labels are read at local noon. No `Intl` time zones. | Decided | Real responses (TEST_REPORT §1.7) show Open-Meteo uses **one fixed offset per response**, the location's current one, even across a daylight-saving change. Stockholm 24–26 Oct 2026 (clocks back on 25 Oct), New York 31 Oct – 2 Nov and Sydney 3–5 Oct (clocks forward on 4 Oct) all start every day at the same UTC hour, with exactly 24 hours per day. Following the API keeps labels and day grouping consistent, so no hour is dropped, duplicated or shown under the wrong day. Hermes's Intl documentation does not mention the `timeZone` option, so relying on it was not an option. Limitation: OQ-08. | NIT-171, NIT-172 |
| D-32 | 2026-11-22 | The forecast sections are derived from the same report as the current weather. `forecastForState` in `useWeatherViewModel` calls `selectForecast(report, fetchedAtEpochMs)` and exposes `forecast`. "Now" is the fetch time. | Decided | One request feeds all three sections (W-04 – W-06). Using the fetch time keeps the choice of days and hours consistent with the data and deterministic on every render. Until refreshing exists (Epic 7), the selection is as of the last load. | NIT-171, NIT-172 |
| D-33 | 2026-11-22 | **Weather-first home screen.** The home screen shows a header with the selected place and a compact search button, then the current weather as a large hero, then "Rest of today" and the seven-day forecast in glass cards on a day or night sky gradient. Search moves into `LocationSearchSheet`, a modal with both search modes. Before a place is chosen, a welcome panel invites a search. Compact temperatures ("2°") are used in the hero and lists; screen-reader labels and details keep full units. Gradients and shadows use React Native's own `backgroundImage` and `boxShadow`, so no library is needed. | Decided | The earlier layout gave search, results and weather the same weight. Refines D-22: still one home screen, with search as a modal on top (no navigation library, Epic 4). The ViewModels, data flow and logic are unchanged. The colours were chosen by computed WCAG contrast: white ≥ 6.3:1, muted text ≥ 4.8:1 on every gradient stop and card. Gradient and modal behaviour not yet seen on a device. | Redesign (team request, 2026-11-22) |
| D-34 | 2026-11-22 | **Weather icons from `@expo/vector-icons`** (MaterialCommunityIcons weather glyphs). The pure `weatherIconName(code, isDay)` chooses the glyph. The hero uses `current.isDay`; hours use `isDaytimeAt` with the day's real sunrise and sunset; days use the day icon. Installed with `npx expo install`: `@expo/vector-icons`, plus its required peer `expo-font` (Expo Doctor reported it missing) and `expo-asset`, which `expo-font` imports but which was only nested inside `expo`. These installs added the `expo-font` and `expo-asset` config plugins to `app.json`. | Decided | Chosen by the team over emoji and text only: one consistent, tintable style with day/night variants, bundled in Expo Go. Icons are hidden from screen readers; each element's label carries the condition text (STYLE §15). Polar night and midnight sun come out right from the API's sunrise/sunset values (TEST_REPORT §1.2). Supersedes the "no icons" part of D-29. | Redesign (team request, 2026-11-22) |
| D-35 | 2026-11-23 | **Navigation: one native stack, no tabs** (resolves OQ-05). `@react-navigation/native` and `@react-navigation/native-stack`, plus their required peer `react-native-screens`, installed with `npx expo install` in NIT-229. `Home` is the root; `DayDetail` is pushed on top. `Favorites` and `Settings` get their routes in Epic 5 and Epic 6, together with their screens, not as placeholders (STYLE §4). | Decided | One navigator type, as D-07 asks. The native stack uses each platform's own navigation (iOS swipe-back, Android back button) and needs no `react-native-gesture-handler`. A stack keeps `HomeScreen` mounted under the pushed screen, so the selected place, its forecast and the scroll position survive going back, with no new request. Favourites and settings can be pushed from header buttons, so no tabs package is needed. | NIT-173 (NIT-229) |
| D-36 | 2026-11-23 | **The day detail screen gets its data in the route params.** `HomeScreen` passes the place's fields, the selected day's `DailyForecast` and the report's `utcOffsetSeconds`. `DayDetailScreen` shows them and sends no request. Refines STYLE §3.3, which earlier said the receiving screen loads its data itself. | Decided | W-07 uses only daily fields, all in one `DailyForecast` (about ten numbers, so small and serialisable). The home screen already holds them. Loading again would mean a second request until the cache exists (Epic 7), a failure offline even though the day is on screen, extra loading and error states, and possibly a different forecast from the row that was tapped. Trade-off accepted: an open detail screen does not update when the home screen refreshes; going back shows the fresh data. | NIT-173 (NIT-230), NIT-174 |

D-05 – D-09 record the choices only. The libraries are installed with `npx expo install` in the user stories that implement them.

### 13.1 Open Questions

| ID | Question | Affects | How to resolve |
|---|---|---|---|
| OQ-01 | ~~Exact SMHI place-search endpoint URL and query parameters~~ | W-01, W-02 | **Resolved 2026-11-20:** the SMHI endpoint returns 404; replaced by Open-Meteo Geocoding (D-24) |
| OQ-02 | ~~Response JSON format~~ | W-02, W-14 | **Resolved 2026-11-20:** `results[]` with `name`, `latitude`, `longitude`, optional `admin1` (region) and `country`; no `results` key when nothing matches. Fixtures in `tests/fixtures/openMeteoGeocoding*.json` |
| OQ-03 | ~~Geographic coverage~~ | W-01, W-02, UX-02 | **Resolved 2026-11-20:** worldwide (GeoNames data). 1-character queries return nothing. |
| OQ-04 | Terms of use, rate limits, attribution, key | W-02 | **Partly resolved 2026-11-20:** no key needed (verified by real requests). Terms not yet re-read: to our knowledge, Open-Meteo is free for non-commercial use with fair-use limits and asks for attribution to Open-Meteo (data partly from GeoNames). Confirm on open-meteo.com before submission and credit it in the app (e.g. settings screen). |
| OQ-05 | ~~Which React Navigation navigator(s) to use (stack only, or stack plus tabs)~~ | W-07, W-09, W-10 | **Resolved 2026-11-23:** one native stack, no tabs (D-35) |
| OQ-06 | Course submission deadline and oral examination format | — | Copy from the course page into CONTEXT.md §14 |
| OQ-07 | How should days without a normal sunrise/sunset be shown? Open-Meteo marks polar night as sunrise = sunset = local midnight, and midnight sun as sunrise = midnight, sunset = next midnight (no `null`). This happens in northern Sweden, e.g. Kiruna. | W-07 | Decide in the day detail story (US-04.03, NIT-175), e.g. show "Polar night" / "Midnight sun" instead of 00:00. Evidence: TEST_REPORT §1.2 |
| OQ-08 | Times after a daylight-saving change inside the forecast window are one hour off from the wall clock. The API applies its current offset to the whole response (D-31), so we show what it delivers. Real example: sunrise on 3 Oct 2026 in Sydney is sent as 06:30 with UTC+11, while the wall-clock time was 05:30. Today's hours are affected only on the night of a change. | W-05 – W-07 | Accept and document for the lab, or derive per-day offsets in a later story (e.g. by also requesting `timeformat=iso8601`, not yet checked). Evidence: TEST_REPORT §1.7 |

## 14. Change Log

| Date | Change | Linear |
|---|---|---|
| 2026-11-10 | Initial specification created | NIT-202 |
| 2026-11-10 | Confirmed D-05 – D-09 and D-12; updated D-11 (root `CLAUDE.md`); added open questions (§13.1), verified-progress notes (§11.1) and the Linear identifier list (§11.2) | NIT-164 |
| 2026-11-10 | Added OpenAI Codex alongside Claude Code (D-13, root `AGENTS.md`); mapped all 34 requirements to the 32 user stories | NIT-204 |
| 2026-11-10 | Moved agent instructions to `agents/claude.md` and `agents/codex.md` (root `CLAUDE.md`/`AGENTS.md` removed); documented explicit loading; updated D-11 and D-13 | NIT-164 |
| 2026-11-18 | Moved all Markdown files to the repository root (`docs/*.md` → root, `agents/claude.md` → `CLAUDE.md`, `agents/codex.md` → `AGENTS.md`); both developers now use Claude Code in VS Code; added D-14 – D-16, superseding D-11 and D-13 | NIT-163 |
| 2026-11-18 | Created the `src/` folder structure and the shared types `AppError`, `Coordinates`/`Location` and `LoadState<T>`; documented layer contracts, data flow and navigation ownership (STYLE §3.1 – §3.3); added D-17 – D-20 and widened D-16's scope | NIT-163 (NIT-199 – NIT-201) |
| 2026-11-18 | Added D-21 (assistant writes the LLM_PROCESS.md session entries) | NIT-191 |
| 2026-11-20 | Renumbered the Epic 2 user stories by dependency. Aligned W-24 with the lab's three test areas. Replaced §12 with the 30 official oral examination questions. Added §10.1 AI Usage Summary. Added D-22 (one home screen) | NIT-153, NIT-169, NIT-189 |
| 2026-11-20 | US-02.01: added `Weather.ts` and `weatherParser.ts`; installed Jest; added D-23 (root `tests/` folder); W-14, W-15 and W-24 set to IN PROGRESS; answered Q2 – Q4 and Q28 | NIT-168 (NIT-214 – NIT-216) |
| 2026-11-20 | Geocoding switched from SMHI to Open-Meteo Geocoding (D-24, D-06 superseded); OQ-01 – OQ-04 resolved | NIT-165 (NIT-205) |
| 2026-11-20 | US-02.04: added D-25 (comma decimals); W-03 detail and status updated | NIT-166 (NIT-209) |
| 2026-11-20 | US-02.04: `CoordinateSearchForm` and minimal theme tokens added; simulator check recorded | NIT-166 (NIT-208) |
| 2026-11-22 | US-03.01: `HomeScreen` with place-name and coordinate search, results, status messages and selection; `App.tsx` renders it. Added D-26 – D-28; installed `react-native-safe-area-context`; W-20 set to IN PROGRESS; W-01 detail (submit only); answered Q19 and extended Q12 and Q17 | NIT-169 (NIT-217 – NIT-219) |
| 2026-11-22 | US-03.02: `useWeatherViewModel`, `CurrentWeatherCard`, `WeatherStatus`, `weatherCode`, `weatherFormatting` and `latestRequest`; the selected location moved into the weather ViewModel. Added D-29, D-30; W-04 set to IN PROGRESS; answered Q5, Q7, Q9 and extended Q8 | NIT-170 |
| 2026-11-22 | US-03.03 and US-03.04: seven-day forecast and the rest of today hour by hour on `HomeScreen`, chosen from the same report (`forecastSelection`, `forecastFormatting`, four components). Added D-31, D-32 and OQ-08; W-05, W-06 and W-21 set to IN PROGRESS; answered Q24 | NIT-171, NIT-172 |
| 2026-11-22 | Weather-first home-screen redesign: header with search button, `WeatherHero`, glass forecast cards on a day/night sky, `LocationSearchSheet` for both search modes, welcome panel, "Try again". Installed `@expo/vector-icons`, `expo-font`, `expo-asset` (D-34). Added D-33, D-34; W-29 set to IN PROGRESS; Q5, Q9, Q19 updated | Redesign |
| 2026-11-23 | US-04.01 planning: added D-35 (one native stack, no tabs; OQ-05 resolved) and D-36 (the detail screen gets the selected `DailyForecast` in its route params); STYLE §3.2 step 9, §3.3 and §6 updated | NIT-173 |
| 2026-11-23 | US-04.01 (NIT-229): installed React Navigation (D-35); added `src/navigation/routes.ts`, `RootNavigator.tsx` and a minimal `DayDetailScreen`; `App.tsx` renders the navigator | NIT-173 (NIT-229) |

## 15. End-of-Session Update Procedure

At the end of every work session, the AI assistant updates this file as part of the session's changes, and the student reviews them before committing. Only a student sets a status to `VERIFIED` (§0 rule 6).

1. Update the **status** in §11 for each requirement touched. Use `VERIFIED` only after verifying on both platforms.
2. Fill in any `TBD` Linear identifiers that are now known.
3. Add new or changed decisions to §13 and resolve open ones.
4. Add a line to the §14 change log.
5. Fill in the code location and a short answer in §12 for any oral examination question that the new code answers.
6. Then complete the checklist in [CONTEXT.md §16](CONTEXT.md#16-end-of-session-checklist).
