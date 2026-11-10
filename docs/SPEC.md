# Weatherly – Requirements Specification

> Living document. Last structural update: 2026-11-10 (NIT-202).
> Status values in this file are changed **only by the students** after independent verification.

---

## 0. AI Meta-Instructions

These instructions apply to every AI assistant working on this repository: **Claude Code** (Developer 1, Windows), **OpenAI Codex** (Developer 2, macOS), and ChatGPT for planning and review. They take precedence over general assistant defaults. The agent files [agents/claude.md](../agents/claude.md) and [agents/codex.md](../agents/codex.md) contain the same rule set and point here. They must not diverge from each other or from this file. They are **not** loaded automatically: each developer tells their assistant to read its agent file at the start of every session ([CONTEXT.md §15](CONTEXT.md#15-ai-collaboration-workflow)).

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
11. **Core logic: explain before generating.** For parsing, caching, validation and ViewModel logic, prefer explanation, pseudocode and review before generating complex code (see [STYLE.md §18](STYLE.md#18-ai-collaboration-guidelines)).
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
| Geocoding API | SMHI place-search API (permitted by the lab). Integration details unverified, see §13.1 | Decided, details open (D-06) |
| Navigation | React Navigation, minimal packages | Decided (D-07) |
| Local persistence | `@react-native-async-storage/async-storage` | Decided (D-08) |
| Unit testing | Jest with the `jest-expo` preset | Decided (D-09) |
| State management | React hooks as ViewModels, no global state library | Proposed (D-10) |
| Cross-platform testing | Android Emulator (Windows) and iOS Simulator (macOS) | Decided (D-12) |

Only `expo`, `expo-status-bar`, `react` and `react-native` are installed as runtime dependencies today. The libraries decided above are **not installed yet**. Each is added with `npx expo install` in the user story that first needs it.

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

Detailed layer rules and the planned folder structure are in [STYLE.md §3–4](STYLE.md#3-mvvm-architecture).

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
| W-24 | Unit tests cover at least two required logic areas. | Testing |
| W-25 | At least 20 distinct UX interaction scenarios are defined, executed and documented. | Testing |

## 7. Detailed Requirements

Planned components follow the folder structure in [STYLE.md §4](STYLE.md#4-folder-structure). File names are **planned**, not existing.

**W-01 – Place-name search**
- Searching is triggered by a submit action, or by debounced typing if the team chooses it (decided during implementation).
- Leading and trailing whitespace is trimmed, and empty input sends no request.
- Results show the name plus context (region/country) so that places with the same name can be told apart.
- An empty result list shows a "no locations found" message.
- Planned: `SearchScreen`, `useSearchViewModel`, `geocodingService`.

**W-02 – Geocoding API integration**
- Uses the SMHI place-search API (D-06).
- Its endpoint, response format and coverage must be verified against real responses **before** the service is implemented (§13.1 OQ-01 – OQ-04).
- The response is parsed by `geocodingParser` into `Location` models.
- Selecting a result loads the weather for that location.

**W-03 – Coordinate search and validation**
- Latitude must be in [-90, 90] and longitude in [-180, 180].
- Accepts decimal numbers with a `.` decimal separator. Whether `,` is also accepted is decided during implementation and recorded in §13.
- Invalid input shows an inline validation message, and no request is sent.
- The validation logic is a pure function (`coordinateValidation`) and is a unit-test candidate (W-24).

**W-04 – Current weather**
- Shows at least the temperature, a weather-condition description/icon and the observation time.
- Additional fields (wind, humidity, etc.) are selected from what Open-Meteo provides (D-05).
- Values are shown in the user's selected units (W-12).

**W-05 – Seven-day forecast**
- Shows exactly seven days starting today, each with the date/weekday, min/max temperature and a condition indicator.
- The list is scrollable (W-21).

**W-06 – Hourly details for today**
- Shows hourly entries for the rest of the current day, in the selected location's time zone.
- If the API gives a different resolution, the actual behaviour is documented in §13.

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
- `weatherRepository` stores the last successful `WeatherReport` per location, together with the time it was fetched.
- The cache is read through `keyValueStorage`, a thin wrapper around `@react-native-async-storage/async-storage` (D-08).

**W-17 – Offline fallback**
- If a fetch fails and cached data exists, the cached data is shown with an "offline / last updated <time>" indicator.
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
- Automated unit tests, written in Jest with `jest-expo` (D-09), cover at least two of: coordinate validation, JSON parsing, refresh/staleness policy, unit conversion.
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
| W-33 | AI usage is recorded per session in [LLM_PROCESS.md](LLM_PROCESS.md): which assistant was used (Claude Code or OpenAI Codex), which developer operated it, and what was accepted, modified and verified. |
| W-34 | All work follows the Git workflow in [GIT_WORKFLOW.md](GIT_WORKFLOW.md): feature branches from `dev`, pull requests into `dev`, a stable `main`, and Conventional Commits. |

AI usage rules:
- AI may propose code, but students review, test and must be able to explain every line that is merged.
- AI output that a student cannot explain is not merged.
- The meta-instructions in §0 apply to every session.
- The students write [REFLECTION.md](REFLECTION.md) themselves.

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
| W-01 | NIT-153 | NIT-165 (US-02.01); NIT-169 (US-03.01) | `SearchScreen`, `useSearchViewModel`, `geocodingService` | UX-01, UX-02, UX-03 | NOT STARTED |
| W-02 | NIT-153 | NIT-165 (US-02.01) | `geocodingService`, `geocodingParser`, `Location` | Unit: geocodingParser; UX-01 | NOT STARTED |
| W-03 | NIT-153 | NIT-166 (US-02.02) | `coordinateValidation`, `SearchScreen` | Unit: coordinateValidation; UX-04, UX-05 | NOT STARTED |
| W-04 | NIT-154 | NIT-170 (US-03.02) | `WeatherScreen`, `useWeatherViewModel`, `CurrentWeather` | UX-06 | NOT STARTED |
| W-05 | NIT-154 | NIT-171 (US-03.03) | `WeatherScreen`, `DailyForecast` | UX-07 | NOT STARTED |
| W-06 | NIT-154 | NIT-172 (US-03.04) | `WeatherScreen`, `HourlyForecast` | UX-08 | NOT STARTED |
| W-07 | NIT-155 | NIT-174 (US-04.02); NIT-175 (US-04.03); NIT-173 (US-04.01) | `DayDetailScreen`, `src/navigation/` | UX-09 | NOT STARTED |
| W-08 | NIT-156 | NIT-176 (US-05.01); NIT-177 (US-05.02) | `favoritesRepository`, `useFavoritesViewModel` | UX-10, UX-11, UX-12, UX-24 | NOT STARTED |
| W-09 | NIT-156 | NIT-178 (US-05.03); NIT-173 (US-04.01) | `FavoritesScreen` | UX-12, UX-13, UX-25 | NOT STARTED |
| W-10 | NIT-157 | NIT-179 (US-06.01); NIT-173 (US-04.01) | `SettingsScreen`, `useSettingsViewModel`, `settingsRepository` | UX-14 | NOT STARTED |
| W-11 | NIT-157 | NIT-180 (US-06.02) | `refreshPolicy`, `settingsRepository` | Unit: refreshPolicy; UX-15 | NOT STARTED |
| W-12 | NIT-157 | NIT-181 (US-06.03) | `AppSettings`, `units`, `settingsRepository` | Unit: unit conversion (optional); UX-16 | NOT STARTED |
| W-13 | NIT-153 | NIT-167 (US-02.03) | `weatherService`, `httpClient` | UX-06 | NOT STARTED |
| W-14 | NIT-153 | NIT-168 (US-02.04); NIT-165 (US-02.01) | `weatherParser`, `geocodingParser` | Unit: weatherParser, geocodingParser | NOT STARTED |
| W-15 | NIT-153 | NIT-168 (US-02.04) | `src/models/*` | `tsc --noEmit`; review | NOT STARTED |
| W-16 | NIT-158 | NIT-182 (US-07.01) | `weatherRepository`, `keyValueStorage` | UX-17 | NOT STARTED |
| W-17 | NIT-158 | NIT-183 (US-07.02) | `weatherRepository`, offline indicator | UX-17, UX-18 | NOT STARTED |
| W-18 | NIT-158 | NIT-184 (US-07.03); NIT-188 (US-08.03) | `httpClient`, `ErrorView` | UX-18, UX-19 | NOT STARTED |
| W-19 | NIT-158 | NIT-184 (US-07.03) | parsers, `httpClient`, `AppError` | Unit: parser error cases | NOT STARTED |
| W-20 | NIT-158 | NIT-185 (US-07.04); NIT-188 (US-08.03) | all ViewModels, `LoadingView` | UX-20 | NOT STARTED |
| W-21 | NIT-154 | NIT-171 (US-03.03); NIT-172 (US-03.04) | forecast lists (`FlatList`) | UX-07, UX-08 | NOT STARTED |
| W-22 | NIT-159 | NIT-187 (US-08.02) | `app.json`, responsive layouts | UX-21, UX-22 | NOT STARTED |
| W-23 | NIT-158 | NIT-185 (US-07.04); NIT-167 (US-02.03) | `httpClient`, ViewModels | UX-20, UX-23 | NOT STARTED |
| W-24 | NIT-160 | NIT-189 (US-09.01) | `*.test.ts` | TEST_REPORT §2 | NOT STARTED |
| W-25 | NIT-160 | NIT-190 (US-09.02) | — | TEST_REPORT §3 | NOT STARTED |
| W-26 | NIT-152 | NIT-163 (US-01.03) | whole codebase, folder structure | Code review | NOT STARTED |
| W-27 | NIT-152 | NIT-163 (US-01.03); NIT-164 (US-01.04) | whole codebase | Code review | NOT STARTED |
| W-28 | NIT-152 | NIT-161 (US-01.01); NIT-163 (US-01.03) | whole codebase | `tsc`, review | NOT STARTED |
| W-29 | NIT-159 | NIT-186 (US-08.01) | `src/theme/`, shared components | Visual review | NOT STARTED |
| W-30 | NIT-158, NIT-159 | NIT-184 (US-07.03); NIT-188 (US-08.03) | whole codebase | UX-03, UX-05, UX-18, UX-19, UX-24 | NOT STARTED |
| W-31 | NIT-160, NIT-152 | NIT-192 (US-09.04); NIT-164 (US-01.04) | SPEC §13 | Oral exam prep | IN PROGRESS |
| W-32 | NIT-160 | NIT-190 (US-09.02); NIT-162 (US-01.02) | — | TEST_REPORT §3 | NOT STARTED |
| W-33 | NIT-160, NIT-152 | NIT-191 (US-09.03); NIT-164 (US-01.04) | LLM_PROCESS.md, agents/claude.md, agents/codex.md | Review | IN PROGRESS |
| W-34 | NIT-152 | NIT-162 (US-01.02) | GIT_WORKFLOW.md, repository | Review | IN PROGRESS |

### 11.1 Verified Progress on Partially Complete Requirements

Only items that were actually checked are listed as verified.

| ID | Verified (date, evidence) | Not yet verified / remaining |
|---|---|---|
| W-28 | `tsconfig.json` has `strict: true`; `npx tsc --noEmit` passes on the scaffold (2026-11-10, NIT-193) | All application code. Status stays `NOT STARTED` because no app code exists yet. |
| W-31 | Decision log (§13) exists with D-01 – D-13 (2026-11-10) | Both students reviewing and being able to explain each decision |
| W-33 | `LLM_PROCESS.md` template with assistant and operator fields exists (NIT-204); `agents/claude.md` and `agents/codex.md` share one rule set | No session entries yet; students must log sessions. `agents/codex.md` has not yet been used with Codex on macOS. |
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
| NIT-153 | US-02.01 | NIT-165 | Implement City Search with Geocoding | W-01, W-02, W-14 |
| NIT-153 | US-02.02 | NIT-166 | Implement Coordinate Search & Validation | W-03 |
| NIT-153 | US-02.03 | NIT-167 | Integrate Weather REST API | W-13, W-23 |
| NIT-153 | US-02.04 | NIT-168 | Create Weather Models & JSON Parser | W-14, W-15 |
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

These are *anticipated* questions the team prepares for, not official examination questions.

| Topic | Requirements | Anticipated question | Where the answer is documented |
|---|---|---|---|
| Architecture | W-26 | Why MVVM? What does each layer do, and what may it not do? | STYLE.md §3 |
| ViewModels | W-26, W-20 | Why are ViewModels custom hooks? How is loading/error state modelled? | STYLE.md §7 |
| JSON parsing | W-14, W-15, W-19 | Why is parsing separate? What happens with missing fields? | STYLE.md §10 |
| Caching | W-16, W-17, W-11 | How does the cache decide when data is stale? What is shown offline? | SPEC W-11, W-17; STYLE.md §11 |
| Async | W-23, W-18 | How are requests made asynchronous? What happens if the user navigates away during a request? | STYLE.md §8 |
| Validation | W-03 | How are coordinates validated, and how is it tested? | SPEC W-03; TEST_REPORT §2 |
| Testing | W-24, W-25 | Which logic is unit tested and why? How do you know the tests detect faults? | TEST_REPORT §2 (mutation evidence) |
| Orientation | W-22 | How does the layout adapt to landscape? | STYLE.md §14 |
| API choice | W-13, W-02 | Why Open-Meteo for weather and SMHI for place search? | §13 D-05, D-06 |
| Navigation | W-26 | Why is navigation kept out of ViewModels? | STYLE.md §3, §6 |
| Cross-platform | W-32 | What differed between Android and iOS? | TEST_REPORT, LLM_PROCESS |
| AI usage | W-33 | Which parts did AI generate, and how did you verify them? How did you keep two different assistants consistent? | LLM_PROCESS.md; §13 D-13 |

## 13. Decision Log

| ID | Date | Decision | Status | Rationale / Notes | Linear |
|---|---|---|---|---|---|
| D-01 | 2026-11-10 | Expo SDK 58, React Native 0.88, TypeScript strict | Decided | One cross-platform codebase for Android and iOS. Expo removes the need for native project maintenance. | NIT-193 |
| D-02 | 2026-11-10 | Start from the `blank-typescript` template without Expo Router; removed the template's `AGENTS.md` | Decided | Keeps the structure open for our own MVVM layout. Project-specific agent instructions now live in `agents/` (D-13). | NIT-193 |
| D-03 | 2026-11-10 | Public GitHub repo with `main` (stable), `dev` (integration) and feature branches from `dev` | Decided | Portfolio visibility and safe integration. See GIT_WORKFLOW.md. | NIT-196, NIT-197 |
| D-04 | 2026-11-10 | `.gitattributes` enforces LF line endings in the repository and working tree | Decided | Avoids CRLF/LF churn between Windows and macOS. | NIT-197 |
| D-05 | 2026-11-10 | Weather API: **Open-Meteo** | Decided | Free REST/JSON API with no key; provides current, hourly and daily data. | NIT-164 (recorded) |
| D-06 | 2026-11-10 | Geocoding: **SMHI place-search API**, as permitted by the lab | Decided, details open | Verify the response format with real requests before implementing the service. See §13.1. | NIT-164 (recorded) |
| D-07 | 2026-11-10 | Navigation: **React Navigation**, minimal packages | Decided | Widely used and well documented. Only the core package, one navigator type and their required peer dependencies are added. Navigation stays out of ViewModels (STYLE.md §3). | NIT-164 (recorded) |
| D-08 | 2026-11-10 | Persistence: **`@react-native-async-storage/async-storage`** | Decided | Simple key-value storage, enough for cache, favourites and settings. Accessed only through `keyValueStorage`. | NIT-164 (recorded) |
| D-09 | 2026-11-10 | Unit testing: **Jest + `jest-expo`** | Decided | The Expo-supported preset for testing pure TypeScript logic. | NIT-164 (recorded) |
| D-10 | 2026-11-10 | ViewModels are custom React hooks, with no global state library | Proposed | Smallest solution that keeps MVVM separation. Revisit only if shared state becomes complex. | NIT-164 |
| D-11 | 2026-11-10 | `README.md` is the only Markdown file at the project root. Agent instructions live in `agents/` (`claude.md`, `codex.md`), and all other project documentation lives in `docs/`. | Decided | Keeps the root clean and groups AI-specific instructions in one place. Trade-off: the files are not auto-loaded, so they must be read explicitly each session. | NIT-164 |
| D-12 | 2026-11-10 | Cross-platform testing on the Android Emulator (Windows) and iOS Simulator (macOS) | Decided | Each developer covers the platform their machine supports. Both are required for `VERIFIED`. | NIT-164 (recorded) |

| D-13 | 2026-11-10 | Two AI coding assistants: Claude Code (Developer 1, Windows) and OpenAI Codex (Developer 2, macOS). Both use `docs/` as the single source of truth through identical rule sets in `agents/claude.md` and `agents/codex.md`, which each developer tells their assistant to read at session start. | Decided | Each developer uses their own assistant without separate or conflicting instructions. | NIT-164 (NIT-204) |

D-05 – D-09 record the choices only. The libraries are installed with `npx expo install` in the user stories that implement them.

### 13.1 Open Questions

| ID | Question | Affects | How to resolve |
|---|---|---|---|
| OQ-01 | Exact SMHI place-search endpoint URL and query parameters | W-01, W-02 | Check SMHI's official documentation and the lab instructions |
| OQ-02 | SMHI response JSON format: field names for place name, region/municipality, country, coordinates and ID | W-02, W-14 | Save a real response as a test fixture before writing `geocodingParser` |
| OQ-03 | Geographic coverage of the SMHI place search, and how it behaves for places outside its coverage | W-01, W-02, UX-02 | Test real queries and record the result here |
| OQ-04 | SMHI terms of use, rate limits, attribution, and whether a key is required | W-02 | Check SMHI's documentation |
| OQ-05 | Which React Navigation navigator(s) to use (stack only, or stack plus tabs) | W-07, W-09, W-10 | Decide in the navigation user story and record it as a new decision |
| OQ-06 | Course submission deadline and oral examination format | — | Copy from the course page into CONTEXT.md §14 |

## 14. Change Log

| Date | Change | Linear |
|---|---|---|
| 2026-11-10 | Initial specification created | NIT-202 |
| 2026-11-10 | Confirmed D-05 – D-09 and D-12; updated D-11 (root `CLAUDE.md`); added open questions (§13.1), verified-progress notes (§11.1) and the Linear identifier list (§11.2) | NIT-164 |
| 2026-11-10 | Added OpenAI Codex alongside Claude Code (D-13, root `AGENTS.md`); mapped all 34 requirements to the 32 user stories | NIT-204 |
| 2026-11-10 | Moved agent instructions to `agents/claude.md` and `agents/codex.md` (root `CLAUDE.md`/`AGENTS.md` removed); documented explicit loading; updated D-11 and D-13 | NIT-164 |

## 15. End-of-Session Update Procedure

At the end of every work session, a student (not the AI) updates this file:

1. Update the **status** in §11 for each requirement touched. Use `VERIFIED` only after verifying on both platforms.
2. Fill in any `TBD` Linear identifiers that are now known.
3. Add new or changed decisions to §13 and resolve open ones.
4. Add a line to the §14 change log.
5. Then complete the checklist in [CONTEXT.md §16](CONTEXT.md#16-end-of-session-checklist).
