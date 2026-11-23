# Weatherly – Test Report

> Template created in NIT-204. Tracks SPEC requirements W-24, W-25 and W-32.
>
> **Rules**
> - Record only results that were actually observed. Every test starts as `NOT RUN`.
> - The status is one of `NOT RUN`, `PASS` or `FAIL`. A `FAIL` is never deleted: fix the code, re-run, and add the new result with its date.
> - Every UX scenario is executed on **both** platforms before the requirement it covers can be set to `VERIFIED` in SPEC.md.

## 1. Test Environment

| | Android | iOS |
|---|---|---|
| Host OS | Windows 11 | macOS 27.0.1, Xcode 27.2 (build 27B52) |
| Target | Android Emulator – AVD name/API level: *TBD* | iOS Simulator – iPhone 18 Pro Max, iOS 27.2 |
| Tester | | Tyrone Asante |
| App commit tested | | `043b005` |

### 1.1 Startup Smoke Test (US-01.01, NIT-161)

Checks that the Expo project starts on each platform. Command: `npm ci`, then `npm run android` or `npm run ios` (`expo start --<platform>`, loaded in Expo Go).

| Platform | Date | Tester | Commit | Actual result | Status |
|---|---|---|---|---|---|
| Android Emulator (Windows) | | | | | NOT RUN |
| iOS Simulator (macOS) | 2026-11-18 | Tyrone Asante | `043b005` | Metro reported `iOS Bundled 5637ms index.ts (713 modules)`. Expo Go (SDK 58.0.0) opened the app on iPhone 18 Pro Max / iOS 27.2 and showed the `App.tsx` placeholder text "Open up App.tsx to start working on your app!". No errors in the terminal. `npx tsc --noEmit` passed. | PASS |

### 1.2 Real-API Checks (US-02.02, NIT-213)

Checks that `weatherRepository.getReport` works against the **real** Open-Meteo API, not a fixture or a fake `fetch`. Code at commit `bfaeb95` on `feat/implement-weather-rest-api`.

**Node (run by the AI, 2026-11-20 ≈ 11:23 UTC).** The real modules were compiled to a scratch folder outside the repository and called directly.

| Location | Coordinates | Actual result | Status |
|---|---|---|---|
| Stockholm | 59.33, 18.07 | `Europe/Stockholm` (UTC+1); 7 daily, 168 hourly; now 1.4 °C, code 51, day | PASS |
| Sydney | -33.87, 151.21 | `Australia/Sydney` (UTC+11); 7 daily, 168 hourly; now 20.6 °C, code 3, night | PASS |
| Gulf of Guinea | 0, 0 | `Etc/GMT` (UTC+0); 7 daily, 168 hourly; now 27.2 °C, code 0, day | PASS |
| Longyearbyen (polar night) | 78.22, 15.65 | `Arctic/Longyearbyen` (UTC+1); 7 daily, 168 hourly; now -12.2 °C, code 45, night. **Finding:** sunrise and sunset are **not** `null`; both equal local midnight, with 0 s of daylight (see the note below the table) | PASS (parses), finding open |

**Finding (polar night):** Open-Meteo reports "no sunrise" as `sunrise == sunset == local midnight`, not as `null`. The parser passes these values through, so a screen would show sunrise and sunset at 00:00. The comment in `Weather.ts` ("Missing during polar day or polar night") was wrong and has been corrected. A midnight-sun check at McMurdo (-77.85, 166.67) showed sunrise = local midnight and sunset = next midnight (86 400 s of daylight). **Decision (2026-11-20, Tyrone Asante):** keep the parser as it is and decide the display in the day detail story (SPEC OQ-07).

**iOS Simulator (run by Tyrone Asante, 2026-11-20).** `App.tsx` was temporarily changed to call `getReport` for Stockholm, then restored to the committed version. It was never committed.

| Platform | Date | Tester | Actual result (Metro log) | Status |
|---|---|---|---|---|
| iOS Simulator (macOS) | 2026-11-20 | Tyrone Asante | `iOS Bundled 254ms index.ts (644 modules)`; `NIT-213 OK: Stockholm, Europe/Stockholm, 7 days, 168 hours, now 1.4 °C (code 51), fetched 2026-11-20T11:24:27.063Z` | PASS |
| Android Emulator (Windows) | | | | NOT RUN |

### 1.3 Geocoding Endpoint Check (US-02.03, NIT-205)

Real requests run by the AI with `curl` on 2026-11-20, to choose the geocoding API (SPEC D-24).

| Endpoint | Request | Actual result | Usable? |
|---|---|---|---|
| SMHI place search (lab instructions) | `https://www.smhi.se/wpta/backend_solr/autocomplete/search/{place}` for Stockholm, Lund, Göteborg, goteborg, Åre, London, xqzvbn, Sto, empty | HTTP 404 with an HTML "page not found" page for every query | No |
| KTH proxy (SMHI format, test only) | `maceo.sth.kth.se/weather/search?location=…` | `Sigfridstorp`: HTTP 200, 2 results, with broken characters (`l\ufffdn` for "län"). Stockholm, Göteborg, London, xqzvbn: HTTP 200, 0 results | No (stub; not allowed in the final app) |
| geocode.maps.co (lab instructions) | `https://geocode.maps.co/search?q=Stockholm` | HTTP 401 `Missing API Key` | Only with a key |
| Open-Meteo Geocoding | `…/v1/search?name=…&count=…&language=sv&format=json` | Stockholm 5, Göteborg 4, Lund 10 results (each with region and country); xqzvbn: HTTP 200 with no `results` key; 1-character query: no results; `count=abc`: HTTP 400 `{"error": true, "reason": …}` | **Yes (chosen)** |

**Language check (Open-Meteo Geocoding):**

| Query | `language=en` | `language=sv` |
|---|---|---|
| Göteborg | city **not found** (only "Göteborgnuten", "Göteborgs Botaniska Trädgård") | Göteborg, Västra Götalands län, Sverige |
| Gothenburg | Gothenburg, Västra Götaland County, Sweden | Göteborg, Västra Götalands län, Sverige |
| Malmö | Malmö, Skåne County, Sweden | Malmö, Skåne län, Sverige |

Result: `language=sv` is used, so both Swedish and English spellings find Swedish cities. Saved fixtures: `tests/fixtures/openMeteoGeocodingLund.json` (10 results) and `tests/fixtures/openMeteoGeocodingNoResults.json`.

### 1.4 Coordinate Form Check (US-02.04, NIT-208)

`App.tsx` was temporarily changed to show `CoordinateSearchForm` wired to `useCoordinateSearchViewModel`, plus a result line, then restored to the committed version (never committed). Code at `9729e05` on `feat/coordinate-search-validation`.

| # | Platform | Date | Tester | Input (latitude / longitude) | Expected | Actual result (screenshot + Metro log) | Status |
|---|---|---|---|---|---|---|---|
| 1 | iOS Simulator (iPhone 18 Pro Max, iOS 27.2) | 2026-11-20 | Tyrone Asante | `59.33` / `18.07` | location, no errors | `Location: 59.33, 18.07 (lat 59.33, lon 18.07)` | PASS |
| 2 | iOS Simulator | 2026-11-20 | Tyrone Asante | `59,33` / `18,07` | same location | `Location: 59.33, 18.07` | PASS |
| 3 | iOS Simulator | 2026-11-20 | Tyrone Asante | `95` / `18` | latitude range message, no request | red latitude field, "Latitude must be between -90 and 90"; `Invalid input: no location, no request` | PASS |
| 4 | iOS Simulator | 2026-11-20 | Tyrone Asante | `abc` / *(empty)* | two messages | "Use a decimal number, e.g. 59.33" and "Enter a longitude", both fields red | PASS |
| 5 | iOS Simulator | 2026-11-20 | Tyrone Asante | `-33.87` / `151.21` after step 4 | errors cleared, location | errors gone; `Location: -33.87, 151.21` | PASS |
| 6 | iOS Simulator | 2026-11-20 | Tyrone Asante | return key in latitude, then longitude | focus moves, then submits | as expected (reported by the tester) | PASS |
| — | iOS Simulator | | | on-screen keyboard shows a minus key | minus key present | not verified: input was most likely typed on the Mac keyboard (software keyboard not visible in the screenshots) | NOT RUN |
| — | Android Emulator (Windows) | | | steps 1–6 | | | NOT RUN |

**Observation:** in step 4 the empty longitude field shows its grey placeholder "18.07" next to "Enter a longitude", which can read as a typed value. Candidate for the design story (US-08.01), e.g. placeholder "e.g. 18.07".

### 1.5 Home Screen Bundle Check (US-03.01, NIT-169)

`npx expo export` builds the JavaScript bundle that Expo Go loads, so it catches broken imports and modules that do not resolve. It does **not** run the app: no screen is rendered and nothing is tapped. The output went to a temporary folder outside the repository. Code uncommitted on `feat/NIT-169-home-search` after `6f057f5`. There was no Android Emulator or iOS Simulator on the Windows machine used (no Android SDK installed).

| Platform | Date | Command | Actual result | Status |
|---|---|---|---|---|
| Android | 2026-11-22 | `npx expo export --platform android` | `Android Bundled 6430ms index.ts (623 modules)`, no errors | PASS |
| iOS | 2026-11-22 | `npx expo export --platform ios` | `iOS Bundled 6314ms index.ts (625 modules)`, no errors | PASS |
| Android Emulator (Windows) | | run the home screen: UX-01 – UX-05 | | NOT RUN |
| iOS Simulator (macOS) | | run the home screen: UX-01 – UX-05 | | NOT RUN |

### 1.6 Current Weather: Live Data and Bundle Check (US-03.02, NIT-170)

Code uncommitted on `feat/NIT-169-home-search` after `6f057f5`, on Windows without an emulator or simulator. **What was checked:** the real data path below the ViewModel. `buildForecastUrl` built the request; the live Open-Meteo response was fetched with `curl` (the `jest-expo` preset replaces `fetch` inside Jest with a stub, so `getReport` itself could not reach the network there); then `parseWeatherResponse` and `presentCurrentWeather` ran on it. **Not checked:** `useWeatherViewModel`, `HomeScreen` and `CurrentWeatherCard` on a screen.

| Input | Date | Actual result (formatted current weather) | Status |
|---|---|---|---|
| typed `59.3293`, `18.0686` | 2026-11-22, 11:16 UTC | `Europe/Stockholm`, UTC+1: 2 °C, Light drizzle, feels like -6 °C, humidity 78 %, wind 9.1 m/s, observed 12:15 | PASS |
| Lund (search result, `55.70584`, `13.19321`) | 2026-11-22 | `Europe/Stockholm`, UTC+1: 3 °C, Clear sky, feels like -2 °C, humidity 79 %, wind 4.2 m/s, observed 12:15 | PASS |
| Sydney (`-33.87`, `151.21`) | 2026-11-22 | `Australia/Sydney`, UTC+11: 24 °C, Overcast, feels like 26 °C, humidity 76 %, wind 5.0 m/s, observed 22:15 | PASS |
| Bundles | 2026-11-22 | `npx expo export`: `Android Bundled … (632 modules)`, `iOS Bundled … (634 modules)`, no errors | PASS |
| Android Emulator (Windows) | | select a place by name and by coordinates; current weather appears (UX-06) | NOT RUN |
| iOS Simulator (macOS) | | same as above (UX-06) | NOT RUN |

The observation times are consistent: 12:15 in Stockholm (UTC+1) and 22:15 in Sydney (UTC+11) are both 11:15 UTC, the last 15-minute step before the check at 11:16 UTC.

### 1.7 Forecast Days and Hours: Time Zones, Daylight Saving and Live Data (US-03.03, US-03.04)

Code uncommitted on `feat/NIT-169-home-search` after `6f057f5`, on Windows without an emulator or simulator.

**A. How Open-Meteo handles daylight-saving changes (evidence for SPEC D-31).**
- Requests: the same fields as `buildForecastUrl`, with `start_date`/`end_date` around a clock change, `timezone=auto`, `timeformat=unixtime`.
- The Stockholm response is saved as `tests/fixtures/openMeteoForecastDstStockholm.json`.

| Place and dates | Clock change | `utc_offset_seconds` | Day starts (UTC) | Hours per day | Gaps between hours |
|---|---|---|---|---|---|
| Stockholm, 24–26 Oct 2026 | 25 Oct, UTC+2 → UTC+1 | 3600 | 23:00, 23:00, 23:00 | 24, 24, 24 | none (72 × 1 h) |
| New York, 31 Oct – 2 Nov 2026 | 1 Nov, UTC−4 → UTC−5 | −18000 | 05:00, 05:00, 05:00 | 24, 24, 24 | none |
| Sydney, 3–5 Oct 2026 | 4 Oct, UTC+10 → UTC+11 | 39600 | 13:00, 13:00, 13:00 | 24, 24, 24 | none |

**Finding:** the API applies one fixed offset (the current one) to the whole response, also before a clock change. Sunrise shown with that offset compared with the wall clock (checked with Node's `Intl`):

| Place | Day before the change | After the change |
|---|---|---|
| Sydney | 06:30, wall clock 05:30 | 06:28 / 06:28 |
| Stockholm | 06:47, wall clock 07:47 | 06:49 / 06:49 |

Times before the change are one hour off from the wall clock (SPEC OQ-08).

**B. Live data through the real request, parser, selection and formatting** (2026-11-22, 11:37 UTC; same `curl` method as §1.6, ViewModel and UI not included):

| Place | Days | All days 24 h | Today | Remaining hours | Status |
|---|---|---|---|---|---|
| typed `59.3293`, `18.0686` (Europe/Stockholm, 12:37 local) | 7 | yes | "Today 22 Nov", then Mon 23 Nov … Sat 28 Nov | 12: 12:00 … 23:00 | PASS |
| New York (America/New_York, 06:37 local) | 7 | yes | "Today 22 Nov" | 18: 06:00 … 23:00 | PASS |
| Sydney (Australia/Sydney, 22:37 local) | 7 | yes | "Today 22 Nov" | 2: 22:00 … 23:00 | PASS |
| Bundles | — | — | `Android Bundled … (638 modules)`, `iOS Bundled … (640 modules)`, no errors | — | PASS |
| Android Emulator (Windows) | | | UX-07, UX-08 | | NOT RUN |
| iOS Simulator (macOS) | | | UX-07, UX-08 | | NOT RUN |

### 1.8 Weather-First Home Screen Redesign: Build Checks (SPEC D-33, D-34)

Code uncommitted on `feat/NIT-169-home-search` after `6f057f5`, on Windows without an emulator or simulator. **Nothing has been seen on a screen.** Everything visual below is unverified.

**What was checked:**

| Check | Date | Actual result | Status |
|---|---|---|---|
| Contrast of the sky colours (computed, WCAG 2.1 formula) | 2026-11-22 | White text ≥ 6.33:1; 85 % white text ≥ 4.85:1 on every day/night gradient stop, inside glass cards and on today's row. The first candidate (lighter blue with white cards) was rejected at 2.90:1. | PASS |
| TypeScript accepts `backgroundImage: 'linear-gradient(…)'` and `boxShadow` | 2026-11-22 | `npx tsc --noEmit` passed with a temporary probe file (deleted afterwards) | PASS |
| Icon glyph names exist | 2026-11-22 | All 16 weather glyphs and the `magnify` and `close` icons are in the installed MaterialCommunityIcons glyph map | PASS |
| Expo Doctor after installing `@expo/vector-icons` only | 2026-11-22 | **19/20**: "Missing peer dependency: expo-font, Required by: @expo/vector-icons" | FAIL |
| Unit tests after that install | 2026-11-22 | `tests/views/weatherStatus.test.ts` could not load: "Cannot find module 'expo-asset' from 'node_modules/expo-font/…'" (`expo-asset` existed only inside `expo`) | FAIL |
| Fix | 2026-11-22 | `npx expo install expo-font` and `npx expo install expo-asset` (58.0.21, the version already inside `expo`); Expo added both config plugins to `app.json` | — |
| Expo Doctor after the fix | 2026-11-22 | 20/20 checks passed | PASS |
| Bundles | 2026-11-22 | `Android Bundled … (722 modules)`, `iOS Bundled … (724 modules)`, icon font exported as an asset, no errors | PASS |
| Protected layers unchanged | 2026-11-22 | `git diff` empty for `src/services`, `src/parsers`, `src/repositories`, `src/models`, `coordinateValidation.ts`, `useCoordinateSearchViewModel.ts`; `app.json` orientation still `portrait` | PASS |

**Still to check on the Android Emulator and iOS Simulator** (all NOT RUN):

| # | What to check |
|---|---|
| R-1 | The gradient sky and card shadows are drawn (or the solid fallback colour appears), day and night |
| R-2 | Icons appear in the hero, hourly items and day rows (the font loads in Expo Go) |
| R-3 | First launch shows the welcome panel; "Search for a place" and the header button open the sheet |
| R-4 | Both search modes work in the sheet; choosing a result or valid coordinates closes it and loads the weather |
| R-5 | Sheet safe areas and status bar on both platforms (Android edge-to-edge modal) |
| R-6 | Keyboard does not cover the fields or results in the sheet |
| R-7 | "Try again" after an offline error loads the weather once the connection is back |
| R-8 | Small screen (e.g. iPhone SE size) and large text: hero, header and day rows fit without overlap |
| R-9 | Screen reader reads the hero, hourly and day summaries; icons are skipped |

### 1.9 Navigation Setup: Build Checks (US-04.01, NIT-229)

Code uncommitted on `feat/Epic-04` after `e406795`, on macOS. Nothing navigates to `DayDetail` yet (NIT-230), so only the home screen can be checked on a screen.

| Check | Date | Actual result | Status |
|---|---|---|---|
| Install | 2026-11-23 | `npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens` → `^7.5.2`, `^7.21.1`, `~4.30.1`, all in `dependencies`. The stack's peers (`react-native-safe-area-context`, `react-native-screens`) are installed. | PASS |
| `npm run check` | 2026-11-23 | `tsc --noEmit` without errors; Jest 348 / 348 | PASS |
| iOS bundle | 2026-11-23 | `npx expo export --platform ios` exported without errors | PASS |
| Expo Doctor | 2026-11-23 | 20/20 checks passed | PASS |
| Home screen unchanged on the iOS Simulator after `npx expo start -c` | 2026-11-23 | Tyrone Asante reported: "The home screen works as before on the simulator" | PASS |
| Home screen unchanged on the Android Emulator | | | NOT RUN |

**NIT-230 (day rows open the detail screen):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| Contrast of the pressed row (computed, WCAG 2.1) | 2026-11-23 | 15 % white over the card on every sky stop: `onSkyMuted` text ≥ 4.53:1, white higher. 18 % was rejected at 4.24:1 | PASS |
| `chevron-right` glyph exists | 2026-11-23 | Present in the installed MaterialCommunityIcons glyph map | PASS |
| `npm run check` | 2026-11-23 | `tsc --noEmit` without errors; Jest 348 / 348 | PASS |
| iOS bundle | 2026-11-23 | `npx expo export --platform ios` exported without errors | PASS |
| Expo Doctor | 2026-11-23 | 20/20 checks passed | PASS |
| Tapping a day opens the right day and place; back button and swipe-back return to Home (iOS Simulator) | 2026-11-23 | Tyrone Asante reported "It works" after the two steps given (open a day; go back with the button and with a swipe) | PASS (by report; detailed checks in NIT-231) |

**NIT-232 (detail screen layout):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| `npm run check` | 2026-11-23 | `tsc --noEmit` without errors; Jest 353 / 353 | PASS |
| iOS bundle | 2026-11-23 | `npx expo export --platform ios` exported without errors | PASS |
| Day sky, matching blue header with white title and back arrow, white text; back and swipe-back as before (iOS Simulator) | 2026-11-23 | Tyrone Asante reported "It works" | PASS (by report) |

**NIT-233 (date, temperature and condition):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| `npm run check` | 2026-11-23 | `tsc --noEmit` without errors; Jest 359 / 359 | PASS |
| iOS bundle | 2026-11-23 | `npx expo export --platform ios` exported without errors | PASS |
| Hero shows weekday, date, icon, condition and high/low matching the tapped row; VoiceOver reads it as one sentence; nothing cut off with large text (iOS Simulator) | | | NOT RUN |
| Same on the Android Emulator | | | NOT RUN |

### 1.10 Navigation and Return (US-04.01, NIT-231)

Scenarios for UX-09, run on the iOS Simulator by Tyrone Asante on 2026-11-23. Results were reported in one message: "the simulator scenarios also work". No screenshots or logs were shared.

| # | Action | Expected result | Status |
|---|---|---|---|
| N-1 | Tap a day that is not today | The detail screen shows that row's weekday and date, and the place name in the header | PASS (by report) |
| N-2 | Back button | Home again with the same place, weather and scroll position | PASS (by report) |
| N-3 | Open a day, swipe back from the left edge | Same as N-2 | PASS (by report) |
| N-4 | Double-tap a day quickly | Only one detail screen opens; one back returns to Home | PASS (by report) |
| N-5 | Go back, search another place, open a day | The detail screen shows the new place | PASS (by report) |
| N-6 | Accessibility Inspector on a day row | Label (day, condition, high, low), "Button" trait and hint are read | PASS (by report) |
| N-7 | Open and close a day while watching Metro's log | No new weather request | PASS (by report: "We already know N-7 works", 2026-11-23) |

**Note on N-7:** the temporary `console.log` described in the brief was not added. The student reported that N-7 is already known to work. The code supports it: `DayDetailScreen` imports no repository or service, and `HomeScreen` stays mounted (D-35).

Android Emulator: all NOT RUN.

## 2. Automated Unit Tests

**Test framework:** Jest + `jest-expo` (SPEC D-09), installed in US-02.01 (NIT-216). Test files live in the root `tests/` folder (SPEC D-23).
**Command:** `npm test`

### 2.1 Test Categories

W-24 requires at least two of the lab's three areas: **JSON parsing**, **error-state logic** and **data transformation**. Our plan is JSON parsing plus error-state logic or data transformation. The other categories are optional extras and do not count toward the two.

| Category | Lab area | Module (planned) | Requirement(s) | Selected? |
|---|---|---|---|---|
| Weather JSON parsing | JSON parsing | `src/parsers/weatherParser.ts` | W-14, W-15, W-19 | yes |
| Geocoding JSON parsing | JSON parsing | `src/parsers/geocodingParser.ts` | W-02, W-14, W-19 | yes |
| HTTP outcome → `AppError` kind | Error-state logic (data layer) | `src/services/api/httpClient.ts` | W-18, W-19, W-23 | yes |
| Caught value → `AppError` (`toAppError`) | Error-state logic (ViewModel) | `src/models/AppError.ts` | W-18, W-19 | yes |
| Result/error → `LoadState` transitions | Error-state logic (ViewModel) | `useSearchViewModel` (hook not unit-tested; checked via UX-01 – UX-03 in US-03.01) | W-01, W-17, W-18, W-19 | |
| Search `LoadState` → what the screen shows; `AppError` kind → message | Error-state logic (View) | `describeSearchStatus`, `searchErrorMessage` in `src/views/components/SearchStatus.tsx` (US-03.01) | W-01, W-18, W-19, W-20 | proposed |
| Search query trimming | (extra) | `prepareSearchQuery` in `src/viewmodels/useSearchViewModel.ts` | W-01 | |
| Repeated search detection | (extra) | `isRepeatedSearch` in `src/viewmodels/useSearchViewModel.ts` (US-03.01) | W-01, W-23 | |
| Location display text | (extra) | `src/utils/locationFormatting.ts` (US-03.01) | W-01, W-03 | |
| Weather `LoadState` → loading/error; `AppError` kind → message | Error-state logic (View) | `describeWeatherStatus`, `weatherErrorMessage` in `src/views/components/WeatherStatus.tsx` (US-03.02) | W-04, W-18, W-19, W-20 | proposed |
| Current weather → display texts (units, rounding, local time, missing values) | Data transformation | `presentCurrentWeather` and formatters in `src/utils/weatherFormatting.ts` (US-03.02) | W-04 | proposed |
| WMO weather code → description | Data transformation | `src/utils/weatherCode.ts` (US-03.02) | W-04 | |
| Request ordering (newest wins) | (extra) | `src/viewmodels/latestRequest.ts` (US-03.02) | W-23 | |
| Repeated weather load detection | (extra) | `isRepeatedWeatherLoad` in `src/viewmodels/useWeatherViewModel.ts` (US-03.02) | W-04, W-23 | |
| Forecast request URL | (extra) | `src/services/api/weatherService.ts` | W-13 | |
| Hourly/daily grouping | Data transformation | `selectForecastDays`, `selectRemainingHoursToday`, `findTodayBounds` in `src/utils/forecastSelection.ts` (US-03.03, US-03.04) | W-05, W-06 | proposed |
| Forecast day/hour display texts | Data transformation | `formatDayLabel`, `presentDailyForecast`, `presentHourlyForecast`, `presentDayDetail` in `src/utils/forecastFormatting.ts` (US-03.03, US-03.04, NIT-233) | W-05, W-06, W-07 | |
| Unit conversion | Data transformation | `src/utils/units.ts` | W-12 | |
| Coordinate validation | (extra) | `src/utils/coordinateValidation.ts` | W-03, W-30 | yes |
| Refresh / staleness policy | (extra) | `src/utils/refreshPolicy.ts` | W-11, W-16 | |

### 2.2 Test Cases

Planned cases are listed as a starting point. Adjust the names to match the real tests when they are written.

| Test name | Req. | Input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| coordinateValidation › valid input › accepts %j, %j (7 tests) | W-03 | `59.33/18.07`, `-33.87/151.21`, `59,33/18,07`, surrounding spaces and tabs, `59/18`, `+59.33/+18.07`, `0/0` | `isValid: true` with the exact numbers | as expected (2026-11-20) | PASS |
| coordinateValidation › geographic bounds › accepts the exact bounds (3 tests) | W-03 | `90/180`, `-90/-180`, `90.0/-180.0` | `isValid: true` | as expected (2026-11-20) | PASS |
| coordinateValidation › geographic bounds › rejects latitude as out of range (4 tests) | W-03, W-30 | `90.0001`, `-90.5`, `91`, `-1000` | `latitudeError: 'outOfRange'` only | as expected (2026-11-20) | PASS |
| coordinateValidation › geographic bounds › rejects longitude as out of range (3 tests) | W-03, W-30 | `180.1`, `-181`, `360` | `longitudeError: 'outOfRange'` only | as expected (2026-11-20) | PASS |
| coordinateValidation › missing input › reports an empty latitude (3 tests) | W-03, W-30 | `''`, `' '`, `'\t\n'` | `latitudeError: 'empty'` | as expected (2026-11-20) | PASS |
| coordinateValidation › missing input › reports an empty longitude | W-03 | `59.33`, `''` | `longitudeError: 'empty'` | as expected (2026-11-20) | PASS |
| coordinateValidation › missing input › reports both fields when both are empty | W-03 | `''`, `'  '` | both `empty` | as expected (2026-11-20) | PASS |
| coordinateValidation › malformed input › rejects as not a number (12 tests) | W-03, W-30 | `abc`, `59.3.3`, `59,33,1`, `1e2`, `0x10`, `Infinity`, `NaN`, `59.`, `.5`, `--5`, `5 9`, `59.33°` | `latitudeError: 'notANumber'` | as expected (2026-11-20) | PASS |
| coordinateValidation › both fields invalid › reports an error for each field, not only the first | W-03 | `abc`, `200` | `notANumber` and `outOfRange` | as expected (2026-11-20) | PASS |
| coordinateValidation › error order › reports empty before checking the format | W-03 | `'   '` | `empty` | as expected (2026-11-20) | PASS |
| coordinateValidation › error order › reports notANumber before checking the range | W-03 | `999e9` | `notANumber` | as expected (2026-11-20) | PASS |
| coordinateErrorMessage › latitude/longitude × empty/notANumber/outOfRange (6 tests) | W-03 | each field and error kind | e.g. `Enter a latitude`, `Use a decimal number, e.g. 18.07`, `Longitude must be between -180 and 180` | as expected (2026-11-20) | PASS |
| weatherParser › valid response › reads the timezone and UTC offset | W-15 | real fixture (Stockholm) | `Europe/Stockholm`, `3600` | as expected (2026-11-20) | PASS |
| weatherParser › valid response › parses current conditions and converts seconds to milliseconds | W-14, W-15 | real fixture | `current` equals the expected object, times in ms, `isDay: true` | as expected (2026-11-20) | PASS |
| weatherParser › valid response › turns the hourly arrays into one entry per hour | W-14, W-15 | real fixture | 168 entries; first entry equals the expected object | as expected (2026-11-20) | PASS |
| weatherParser › valid response › turns the daily arrays into one entry per day | W-14, W-15 | real fixture | 7 entries; first entry equals the expected object | as expected (2026-11-20) | PASS |
| weatherParser › valid response › maps is_day 0 to false | W-14 | `current.is_day = 0` | `isDay: false` | as expected (2026-11-20) | PASS |
| weatherParser › missing required fields › throws a parse error when the current temperature is missing | W-19 | `current.temperature_2m` removed | `AppError('parse')` naming `current.temperature_2m` | as expected (2026-11-20) | PASS |
| weatherParser › missing required fields › throws a parse error when the daily weather codes are missing | W-19 | `daily.weather_code` removed | `AppError('parse')` naming `daily.weather_code` | as expected (2026-11-20) | PASS |
| weatherParser › missing required fields › throws a parse error when the hourly block is missing | W-19 | `hourly` removed | `AppError('parse')` naming `hourly` | as expected (2026-11-20) | PASS |
| weatherParser › missing required fields › throws a parse error when the timezone is missing | W-19 | `timezone` removed | `AppError('parse')` naming `timezone` | as expected (2026-11-20) | PASS |
| weatherParser › invalid data › throws a parse error when a temperature is a string | W-19 | `hourly.temperature_2m[5] = "0.7"` | `AppError('parse')` naming `hourly.temperature_2m[5]` | as expected (2026-11-20) | PASS |
| weatherParser › invalid data › throws a parse error when a required value is null | W-19 | `hourly.temperature_2m[0] = null` | `AppError('parse')` naming `hourly.temperature_2m[0]` | as expected (2026-11-20) | PASS |
| weatherParser › invalid data › throws a parse error when an array is shorter than its time array | W-19 | `daily.weather_code` with 6 of 7 entries | `AppError('parse')` naming `daily.weather_code` | as expected (2026-11-20) | PASS |
| weatherParser › invalid data › throws a parse error when an optional array has the wrong length | W-19 | `daily.sunrise` with 3 of 7 entries | `AppError('parse')` naming `daily.sunrise` | as expected (2026-11-20) | PASS |
| weatherParser › invalid data › throws a parse error when the response is not an object | W-19 | `null`, `[]`, `"not json"` | `AppError('parse')` naming `response` | as expected (2026-11-20) | PASS |
| weatherParser › optional fields › turns a null optional value into undefined | W-14, W-15 | `daily.sunrise[0] = null` | day 0 `sunriseEpochMs` is `undefined`; day 1 unchanged | as expected (2026-11-20) | PASS |
| weatherParser › optional fields › turns a missing optional array into undefined for every entry | W-14, W-15 | `hourly.precipitation_probability` removed | 168 entries, all `precipitationProbabilityPercent` `undefined` | as expected (2026-11-20) | PASS |
| weatherParser › optional fields › turns a missing optional current value into undefined | W-14, W-15 | `current.wind_speed_10m` removed | `windSpeedMs` `undefined`; temperature unchanged | as expected (2026-11-20) | PASS |
| weatherService › buildForecastUrl › uses the Open-Meteo forecast endpoint | W-13 | Stockholm coordinates | base URL is `OPEN_METEO_FORECAST_URL` | as expected (2026-11-20) | PASS |
| weatherService › buildForecastUrl › includes the coordinates | W-13 | 59.33, 18.07 | `latitude=59.33`, `longitude=18.07` | as expected (2026-11-20) | PASS |
| weatherService › buildForecastUrl › keeps negative and zero coordinates | W-13 | -33.87, 0 | `latitude=-33.87`, `longitude=0` | as expected (2026-11-20) | PASS |
| weatherService › buildForecastUrl › sets the fixed options the parser relies on | W-13 | Stockholm | `timezone=auto`, `forecast_days=7`, `wind_speed_unit=ms`, `timeformat=unixtime` | as expected (2026-11-20) | PASS |
| weatherService › buildForecastUrl › requests the current, hourly and daily fields as comma-separated lists | W-13 | Stockholm | each block equals its field list joined by commas | as expected (2026-11-20) | PASS |
| weatherService › buildForecastUrl › requests exactly the fields present in the parser test fixture | W-13, W-14 | field lists vs. fixture keys | identical sets for current, hourly and daily | as expected (2026-11-20) | PASS |
| httpClient › getJson › returns the parsed JSON for a 200 response | W-13 | fake 200, `{"temperature": 1.2}` | resolves to the object; `fetch` got an abort `signal` | as expected (2026-11-20) | PASS |
| httpClient › getJson › throws a network error when fetch fails (no connection) | W-18 | `fetch` rejects with `TypeError` | `AppError('network')` | as expected (2026-11-20) | PASS |
| httpClient › getJson › throws a timeout error when no response arrives in time | W-18, W-23 | no answer; fake timers advanced 1000 ms | `AppError('timeout')` | as expected (2026-11-20) | PASS |
| httpClient › getJson › does not time out when the response arrives in time | W-23 | answer before 999 ms | resolves normally | as expected (2026-11-20) | PASS |
| httpClient › getJson › throws an http error for status 404 / 500 / 503 (3 tests) | W-19 | fake 404, 500, 503 | `AppError('http')` with `HTTP <status>` | as expected (2026-11-20) | PASS |
| httpClient › getJson › throws a parse error when the body is not valid JSON | W-19 | fake 200, HTML body | `AppError('parse')` | as expected (2026-11-20) | PASS |
| httpClient › getJson › throws a network error when the connection breaks while reading the body | W-18 | `text()` rejects | `AppError('network')` | as expected (2026-11-20) | PASS |
| weatherRepository › getReport › requests the forecast URL for the given coordinates | W-13 | Stockholm; fake 200 with fixture | one `fetch` call with `buildForecastUrl(...)` | as expected (2026-11-20) | PASS |
| weatherRepository › getReport › returns the parsed report with the time it was fetched | W-13, W-15 | fixture; `Date.now` fixed | `fetchedAtEpochMs` = fixed time; 7 daily, 168 hourly | as expected (2026-11-20) | PASS |
| weatherRepository › getReport › passes a service error through unchanged | W-19 | fake 500 | `AppError('http')` | as expected (2026-11-20) | PASS |
| weatherRepository › getReport › passes a parse error through when the JSON is valid but incomplete | W-19 | fixture without `daily` | `AppError('parse')` naming `daily` | as expected (2026-11-20) | PASS |
| geocodingParser › valid response › returns one location per result | W-02, W-14 | Lund fixture | 10 locations | as expected (2026-11-20) | PASS |
| geocodingParser › valid response › maps name, region, country and coordinates | W-02, W-15 | Lund fixture | first result: Lund, Skåne län, Sverige, 55.70584 / 13.19321 | as expected (2026-11-20) | PASS |
| geocodingParser › valid response › keeps same-named places apart by region and country | W-01 | Lund fixture | second result: Lund, England, Storbritannien | as expected (2026-11-20) | PASS |
| geocodingParser › valid response › returns an empty list when nothing matched (no results key) | W-01, W-02 | no-results fixture | `[]` | as expected (2026-11-20) | PASS |
| geocodingParser › optional fields › turns a missing country into undefined | W-14 | `results[0].country` removed | `country` is `undefined` | as expected (2026-11-20) | PASS |
| geocodingParser › optional fields › turns a missing region (admin1) into undefined | W-14 | `results[0].admin1` removed | `region` is `undefined` | as expected (2026-11-20) | PASS |
| geocodingParser › missing or invalid required fields › throws a parse error when name / latitude / longitude is missing (3 tests) | W-19 | field removed from `results[3]` | `AppError('parse')` naming `results[3].<field>` | as expected (2026-11-20) | PASS |
| geocodingParser › missing or invalid required fields › throws a parse error when a latitude is a string | W-19 | `results[0].latitude = "55.7"` | `AppError('parse')` | as expected (2026-11-20) | PASS |
| geocodingParser › missing or invalid required fields › throws a parse error when a country is not a string | W-19 | `results[0].country = 46` | `AppError('parse')` | as expected (2026-11-20) | PASS |
| geocodingParser › missing or invalid required fields › throws a parse error when results is not an array | W-19 | `results` is an object | `AppError('parse')` naming `results` | as expected (2026-11-20) | PASS |
| geocodingParser › missing or invalid required fields › throws a parse error when a result is not an object | W-19 | `results[2] = "Lund"` | `AppError('parse')` naming `results[2]` | as expected (2026-11-20) | PASS |
| geocodingParser › missing or invalid required fields › throws a parse error when the response is not an object | W-19 | `null`, `[]` | `AppError('parse')` naming `response` | as expected (2026-11-20) | PASS |
| geocodingService › buildSearchUrl › uses the Open-Meteo geocoding endpoint | W-02 | Lund | base URL is `OPEN_METEO_GEOCODING_URL` | as expected (2026-11-20) | PASS |
| geocodingService › buildSearchUrl › sets the name, result count, language and format | W-02 | Lund | `name=Lund`, `count=10`, `language=sv`, `format=json` | as expected (2026-11-20) | PASS |
| geocodingService › buildSearchUrl › uses Swedish so Swedish spellings are found | W-02 | — | `GEOCODING_LANGUAGE` is `sv` | as expected (2026-11-20) | PASS |
| geocodingService › buildSearchUrl › encodes Swedish letters | W-02 | Göteborg | `name=G%C3%B6teborg` | as expected (2026-11-20) | PASS |
| geocodingService › buildSearchUrl › encodes spaces and characters that would break the query string | W-02 | `New York & Co?` | `name=New%20York%20%26%20Co%3F`; other parameters intact | as expected (2026-11-20) | PASS |
| locationRepository › searchLocations › requests the search URL for the query | W-02 | Lund; fake 200 | one `fetch` call with `buildSearchUrl('Lund')` | as expected (2026-11-20) | PASS |
| locationRepository › searchLocations › returns typed locations with region and country | W-01, W-02 | Lund fixture | 10 locations; first equals the expected `Location` | as expected (2026-11-20) | PASS |
| locationRepository › searchLocations › returns an empty list when nothing matched | W-01 | no-results fixture | `[]` | as expected (2026-11-20) | PASS |
| locationRepository › searchLocations › passes a service error through unchanged | W-18 | `fetch` rejects | `AppError('network')` | as expected (2026-11-20) | PASS |
| locationRepository › searchLocations › passes a parse error through when a result is malformed | W-19 | latitude `"north"` | `AppError('parse')` naming `results[0].latitude` | as expected (2026-11-20) | PASS |
| useSearchViewModel › prepareSearchQuery › returns a normal query unchanged | W-01 | `Lund` | `Lund` | as expected (2026-11-20) | PASS |
| useSearchViewModel › prepareSearchQuery › trims surrounding spaces | W-01 | `  Göteborg  ` | `Göteborg` | as expected (2026-11-20) | PASS |
| useSearchViewModel › prepareSearchQuery › keeps spaces inside the name | W-01 | ` New York ` | `New York` | as expected (2026-11-20) | PASS |
| useSearchViewModel › prepareSearchQuery › trims tabs and newlines | W-01 | `\tKiruna\n` | `Kiruna` | as expected (2026-11-20) | PASS |
| useSearchViewModel › prepareSearchQuery › returns null for an empty query (5 tests) | W-01 | `''`, `' '`, `'   '`, `'\t'`, `'\n \t'` | `null` (no request is sent) | as expected (2026-11-20) | PASS |
| AppError › toAppError › returns an AppError unchanged | W-18, W-19 | `AppError('timeout')` | the same object | as expected (2026-11-20) | PASS |
| AppError › toAppError › wraps a plain Error as kind "unknown" and keeps its message | W-19 | `TypeError` | `AppError('unknown')` containing the message | as expected (2026-11-20) | PASS |
| AppError › toAppError › wraps a thrown string as kind "unknown" | W-19 | `'something broke'` | `AppError('unknown')` | as expected (2026-11-20) | PASS |
| AppError › toAppError › wraps undefined as kind "unknown" | W-19 | `undefined` | `AppError('unknown')` | as expected (2026-11-20) | PASS |
| AppError › toAppError › keeps instanceof working for AppError | — | `new AppError('validation', …)` | instance of `AppError` and `Error`; `name` is `AppError` | as expected (2026-11-20) | PASS |
| describeSearchStatus › idle / loading / results / empty results (4 tests) | W-01, W-20 | `idle`, `loading`, `success` with Lund, `success` with `[]` | neutral hint; `{ kind: 'loading' }`; `null`; "No places found…" (neutral) | as expected (2026-11-22) | PASS |
| describeSearchStatus › treats an empty query as a hint, not an error | W-01 | `error` with `AppError('validation')` | "Enter a place name to search.", tone `neutral` | as expected (2026-11-22) | PASS |
| describeSearchStatus › shows a %s failure as an error (6 tests) | W-18, W-19 | `error` with kind `network`, `timeout`, `http`, `parse`, `storage`, `unknown` | tone `error` with the matching `searchErrorMessage` | as expected (2026-11-22) | PASS |
| searchErrorMessage › kind → message (7 tests) + never shows the developer message | W-18, W-19 | each `AppErrorKind`; an `http` error whose message contains "HTTP 500" | one fixed message per kind; "HTTP 500" not in the text | as expected (2026-11-22) | PASS |
| isRepeatedSearch (5 tests) | W-01, W-23 | `Lund`/`null`, `Lund`/`Lund`, `lund`/`Lund`, `GÖTEBORG`/`Göteborg`, `Lund`/`Kiruna`, `Lunds`/`Lund` | `false`, `true`, `true`, `true`, `false`, `false` | as expected (2026-11-22) | PASS |
| formatLocationDetails (6 tests) | W-01 | real Lund (Skåne län, Sverige); region or country missing; equal region and country; empty region; coordinate location | "Skåne län, Sverige", "Sverige", "Skåne län", "Singapore", "Sverige", `undefined` | as expected (2026-11-22) | PASS |
| formatCoordinates (5 tests) | W-03 | `59.33/18.07`, `-33.87/151.21`, `40.71427/-74.00597`, `0/0`, `-90/-180` | "59.33° N, 18.07° E", "33.87° S, 151.21° E", "40.71° N, 74.01° W", "0.00° N, 0.00° E", "90.00° S, 180.00° W" | as expected (2026-11-22) | PASS |
| isSameLocation (3 tests) | W-01 | equal copy; Lund (England, real result); other name | `true`, `false`, `false` | as expected (2026-11-22) | PASS |
| describeWeatherCode › each documented code (29 tests) | W-04 | 0, 1, 2, 3, 45, 48, 51 … 99 | the Open-Meteo table text, e.g. `3` → "Overcast", `97` → "Heavy thunderstorm" | as expected (2026-11-22) | PASS |
| describeWeatherCode › unknown codes (6 tests) + every code in the real fixture | W-04 | `4`, `50`, `98`, `100`, `-1`, `2.5`; fixture codes 0, 1, 2, 3, 51, 53, 61, 71, 73, 85 | "Unknown conditions"; fixture codes all known | as expected (2026-11-22) | PASS |
| formatTemperature / formatPercent / formatWindSpeed (14 tests) | W-04 | e.g. `1.2`, `-2.6`, `-0.4`, `-0.5`; `72.6`; `3.14`, `0` | "1 °C", "-3 °C", "0 °C" (never "-0"); "73 %"; "3.1 m/s", "0.0 m/s" | as expected (2026-11-22) | PASS |
| formatLocalTime (4 tests) | W-04 | fixture time with +3600; offsets −5 h, +5.5 h; 23:30 UTC with +1 h | "11:15", "19:00", "05:30", "00:30" | as expected (2026-11-22) | PASS |
| presentCurrentWeather › real fixture / missing optional values / unknown code | W-04, W-15 | parsed `openMeteoForecast.json`; a `CurrentWeather` without optional fields; code `42` | temperature "1 °C", Overcast, observed "11:15", feels like "-3 °C", "89 %", "3.1 m/s"; optional texts `undefined`; "Unknown conditions" | as expected (2026-11-22) | PASS |
| createLatestRequestGuard (5 tests) | W-23 | two starts; `cancelAll`; two guards; Lund (30 ms) and Kiruna (5 ms) started in that order | only the newest is latest; nothing is latest after `cancelAll`; guards independent; only Kiruna is applied | as expected (2026-11-22) | PASS |
| isRepeatedWeatherLoad (4 tests) | W-04, W-23 | `null`; same Lund; another place; typed coordinates differing in the 4th decimal | `false`, `true`, `false`, `false` | as expected (2026-11-22) | PASS |
| describeWeatherStatus (10 tests) + weatherErrorMessage (8 tests) | W-18 – W-20 | `idle`, `loading`, `success` with the real fixture, `error` for each `AppErrorKind`; a `parse` error naming `temperature_2m` | `null`, loading, `null`, one fixed message per kind; developer text never shown | as expected (2026-11-22) | PASS |
| selectForecastDays (7 tests) | W-05 | real forecast at its fetch time; now on day 3; 9, 3 and 0 days; now before the first / after the last day | 7 days with today first; days 3–6; at most 7; 3 (none invented); all days without "today"; none | as expected (2026-11-22) | PASS |
| findTodayIndex (5 tests) | W-05, W-06 | exact day start; 1 ms before; 23:59:59.999 local; end of the last day; real daylight-saving response | that day; previous day; still day 0; 6 then −1; API starts all at 23:00 UTC, 25 Oct → index 1 | as expected (2026-11-22) | PASS |
| formatDayLabel (7 tests) | W-05 | the 7 real days; UTC+1, UTC−5, UTC+14; 31 Dec → 1 Jan; day start one hour off around a clock change | "Fri 20 Nov" … "Thu 26 Nov"; location date, not UTC date; "Fri 1 Jan"; still "24 Oct" | as expected (2026-11-22) | PASS |
| presentDailyForecast (5 tests) | W-05 | real today; real day 5; no optional values; code 42; min above max | "Today", "20 Nov", "Light drizzle", "2 °C"/"0 °C" with full screen-reader text; "Wed", high "0 °C" (from −0.2), low "-5 °C" (from −5.5); works; "Unknown conditions"; shown as sent | as expected (2026-11-22) | PASS |
| forecastForState (5 tests) | W-05, W-06 | `idle`, `loading`, `error`; `success`; `refreshFailed` | `null`; 7 days and 13 hours from the same report; still 7 days | as expected (2026-11-22) | PASS |
| selectRemainingHoursToday (12 tests) | W-06 | real forecast at 11:15 local; end of an hour; 23:30 local; local midnight; early hours only; no hours; one instant in Stockholm and New York; real daylight-saving weekend; no daily data; NaN/±Infinity times; shuffled input | 13 hours 11:00–23:00 (current hour kept, ended hour dropped); 12; only 23:00; 24 of the next day; `[]`; `[]`; 20 vs 2; 24 + 24 + 24, all 72 once; same as with daily data; only the finite entry; same order, nothing added | as expected (2026-11-22) | PASS |
| findTodayBounds (4 tests) | W-06 | real forecast; no daily data at UTC+1, UTC−5, UTC+5:30 | API start and next start; local midnight computed from the offset | as expected (2026-11-22) | PASS |
| selectForecast (1 test) | W-05, W-06 | real forecast at its fetch time | 7 days, 13 hours, today = first day | as expected (2026-11-22) | PASS |
| weatherIconName (35 tests) + every fixture code | D-34 | each of the 29 WMO codes by day and by night; `4`, `50`, `98`, `100`, `-1`, `2.5`; the real fixture codes | the planned glyph (e.g. 0 → `weather-sunny` / `weather-night`, 80 → `weather-partly-rainy` / `weather-rainy`); `weather-cloudy-alert`; no fixture code unknown | as expected (2026-11-22) | PASS |
| isDaytimeAt (6 tests) | D-34 | real Stockholm day (sunrise 07:53, sunset 15:12) at 08:00, 14:00, 07:00, 15:00, 02:00; polar night; midnight sun; no sunrise/sunset; outside the days | day, day, night, night, night; never day; always day; day (fallback); day (fallback) | as expected (2026-11-22) | PASS |
| formatTemperatureShort, selectTodayForecast (6 tests) | D-33 | `1.2`, `-2.6`, `-0.4`, `25.5`; selection with and without today | "1°", "-3°", "0°", "26°"; today's entry / `undefined` | as expected (2026-11-22) | PASS |
| presentWeatherHero (4 tests) | W-04, D-33 | real current + today; no today; feels-like and wind missing; clear night | "1°", Overcast, `weather-cloudy`, H "2°" L "0°", full spoken summary; no high/low; "Now 1 °C, Overcast. Humidity 89 %. Observed …"; `weather-night` | as expected (2026-11-22) | PASS |
| presentForecastDayRow (2 tests), presentForecastHourItem (3 tests) | W-05, W-06, D-33 | real day 0 and day 5; real hour 11 at fetch time, hour 12, clear hours at 12:00 and 21:00 | icon and compact temperatures added, full units in the label; "Now" with "Now, 11:00: …"; "12:00"; `weather-sunny` / `weather-night` | as expected (2026-11-22) | PASS |
| skyVariantFor (3 tests) | D-33 | `true`, `false`, `undefined` | day, night, day | as expected (2026-11-22) | PASS |
| presentHourlyForecast (3 tests) | W-06 | real hour 11; UTC−5; no optional values with code 42 | "11:00", "1 °C", "Light drizzle"; "22:00", "-2 °C"; "00:00", "Unknown conditions" | as expected (2026-11-22) | PASS |
| DayDetail route params › survive a JSON round trip (3 tests) | W-07 | params built from the real Stockholm forecast, days 0, 3 and 6 | equal after `JSON.stringify` → `JSON.parse` (D-36: plain, serialisable values) | as expected (2026-11-23) | PASS |
| DayDetail route params › carry the tapped day | W-07 | params for day 3 | `day.dateEpochMs` is day 3's, not day 0's | as expected (2026-11-23) | PASS |
| DayDetail route params › location without region and country | W-03, W-07 | coordinate-search place | unchanged after the round trip; no `region` or `country` key appears | as expected (2026-11-23) | PASS |
| presentDayDetail (6 tests) | W-07 | real day 1 (Sat 21 Nov, code 53, 2.1/1.1 °C); real day 6 (Thu 26 Nov, code 3, −3.6/−6.8 °C); all 7 real days; code 0; code 42; min above max | "Saturday", "21 November", "Moderate drizzle", "2 °C"/"1 °C", full spoken sentence; "-4 °C"/"-7 °C"; same date as `formatDayLabel`; day icon `weather-sunny`, not the night icon; "Unknown conditions" in text and label; shown as sent | as expected (2026-11-23) | PASS |
| geocodingParser › parses results | W-02 | valid fixture | list of `Location` | | NOT RUN |
| geocodingParser › handles empty results | W-01, W-02 | fixture with no results | empty list | | NOT RUN |
| refreshPolicy › fresh data is not stale | W-11 | fetched 5 min ago, interval 15 min | `false` | | NOT RUN |
| refreshPolicy › old data is stale | W-11 | fetched 20 min ago, interval 15 min | `true` | | NOT RUN |
| refreshPolicy › exact boundary | W-11 | fetched exactly 15 min ago, interval 15 min | as defined in SPEC W-11 (document the rule) | | NOT RUN |

### 2.3 Mutation Test Evidence

For each tested category: deliberately introduce one fault, run the tests, confirm at least one fails, then revert.

| Category | Mutation introduced | Test(s) that failed | Reverted? | Date | Status |
|---|---|---|---|---|---|
| JSON parsing (`weatherParser`) | `readArray`: length check replaced with `false` | `…array is shorter than its time array`; `…optional array has the wrong length` (2 of 17 failed) | yes | 2026-11-20 | PASS |
| JSON parsing (`weatherParser`) | `secondsToEpochMs`: `seconds * 1000` changed to `seconds` | the three valid-response object tests; `…null optional value into undefined` (4 of 17 failed) | yes | 2026-11-20 | PASS |
| JSON parsing (`weatherParser`) | `readOptionalNumber`: `null` no longer treated as missing | `…null optional value into undefined` (1 of 17 failed) | yes | 2026-11-20 | PASS |
| Error-state logic (`httpClient`) | `!response.ok` check disabled | the three `http error for status` tests; `getReport › passes a service error through unchanged` (4 of 36 failed) | yes | 2026-11-20 | PASS |
| Error-state logic (`httpClient`) | aborted request reported as `network` instead of `timeout` | `…throws a timeout error when no response arrives in time` (1 of 36 failed) | yes | 2026-11-20 | PASS |
| Error-state logic (`httpClient`) | invalid JSON reported as `network` instead of `parse` | `…throws a parse error when the body is not valid JSON` (1 of 36 failed) | yes | 2026-11-20 | PASS |
| JSON parsing (`geocodingParser`) | missing `results` key no longer returns `[]` | both "empty list when nothing matched" tests (2 of 60 failed) | yes | 2026-11-20 | PASS |
| JSON parsing (`geocodingParser`) | `region` read from `admin2` instead of `admin1` | the two mapping tests, the missing-region test, the repository mapping test (4 of 60 failed) | yes | 2026-11-20 | PASS |
| JSON parsing (`geocodingParser`) | latitude and longitude swapped | 7 of 60 failed (mapping, missing/invalid coordinate and repository tests) | yes | 2026-11-20 | PASS |
| Search query trimming | `prepareSearchQuery`: `raw.trim()` removed | 7 `prepareSearchQuery` tests (7 of 74 failed) | yes | 2026-11-20 | PASS |
| Error-state logic (`toAppError`) | `AppError` no longer passed through (always wrapped) | `toAppError › returns an AppError unchanged` (1 of 74 failed) | yes | 2026-11-20 | PASS |
| Coordinate validation | upper bound made exclusive (`value > max` → `value >= max`) | the exact-bounds tests `90/180` and `90.0/-180.0` (2 of 111 failed) | yes | 2026-11-20 | PASS |
| Coordinate validation | `,` removed from the decimal pattern | `accepts "59,33", "18,07"` (1 of 111 failed) | yes | 2026-11-20 | PASS |
| Coordinate validation | `text.trim()` removed | 5 tests (surrounding spaces, whitespace-only, error order) (5 of 111 failed) | yes | 2026-11-20 | PASS |
| Coordinate validation | longitude error dropped when latitude is also invalid | the two "both fields" tests (2 of 111 failed) | yes | 2026-11-20 | PASS |
| Error-state logic (`describeSearchStatus`) | empty query (`validation`) shown with tone `error` | `…treats an empty query as a hint, not an error` (1 of 19 failed) | yes | 2026-11-22 | PASS |
| Error-state logic (`describeSearchStatus`) | empty-results check `data.length === 0` changed to `< 0` | `…"no places found" message for an empty result list` (1 of 19 failed) | yes | 2026-11-22 | PASS |
| Repeated search detection | case-insensitive comparison replaced with `===` | `isRepeatedSearch › ignores case, as the geocoding API does` (1 of 14 failed) | yes | 2026-11-22 | PASS |
| Location display text | duplicate check in `formatLocationDetails` removed | `…shows a value only once when region and country are the same` (1 of 14 failed) | yes | 2026-11-22 | PASS |
| WMO code → description | unknown-code fallback replaced with `''` | the 6 unknown-code tests (6 of 36 failed) | yes | 2026-11-22 | PASS |
| WMO code → description | code 97 text changed to "Thunderstorm" | `97 → "Heavy thunderstorm"` (1 of 36 failed) | yes | 2026-11-22 | PASS |
| Current weather → display texts | location UTC offset ignored in `formatLocalTime` | 5 of 21 failed (offset tests, real-fixture presentation) | yes | 2026-11-22 | PASS |
| Current weather → display texts | feels-like formatted from the air temperature | `…formats the current conditions of the saved real forecast` (1 of 21 failed) | yes | 2026-11-22 | PASS |
| Request ordering | `isLatest` true for every request | 3 of 5 failed (older request, `cancelAll`, the Lund/Kiruna race) | yes | 2026-11-22 | PASS |
| Repeated weather load detection | every location treated as repeated | 2 of 4 failed (another place, 4th-decimal difference) | yes | 2026-11-22 | PASS |
| Error-state logic (`describeWeatherStatus`) | `loading` mapped to `null` (no indicator) | `…shows the loading indicator while the weather loads` (1 of 18 failed) | yes | 2026-11-22 | PASS |
| Hourly/daily grouping (days) | day end made inclusive (`now <= end`) | 3 of 12 failed (start of a day, 1 ms before, end of the last day) | yes | 2026-11-22 | PASS |
| Hourly/daily grouping (days) | earlier days no longer left out (`slice(0, 7)`) | `…starts at the day that contains now…` (1 of 21 failed) | yes | 2026-11-22 | PASS |
| Forecast display texts | day label read at local midnight instead of noon | `…stays on the right date when a day start is one hour off…` (1 of 12 failed) | yes | 2026-11-22 | PASS |
| Forecast display texts | today not titled "Today" | `…presents today from the real forecast` (1 of 12 failed) | yes | 2026-11-22 | PASS |
| Hourly/daily grouping (hours) | hour in progress dropped (`time >= now`) | 4 of 29 failed | yes | 2026-11-22 | PASS |
| Hourly/daily grouping (hours) | tomorrow's 00:00 included (`time <= end`) | 7 of 29 failed | yes | 2026-11-22 | PASS |
| Hourly/daily grouping (hours) | fallback day start with the offset's sign flipped | 4 of 29 failed (fallback tests) | yes | 2026-11-22 | PASS |
| Forecast display texts | hour shown in UTC instead of location time | 3 of 15 failed | yes | 2026-11-22 | PASS |
| Icons (redesign) | hour judged at its start instead of its middle | `…before sunrise and after sunset as night…` (1 of 42 failed) | yes | 2026-11-22 | PASS |
| Icons (redesign) | clear night shows the sun | 3 of 60 failed | yes | 2026-11-22 | PASS |
| Home presentation (redesign) | current hour not labelled "Now" | `…labels the hour in progress "Now"` (1 of 18 failed) | yes | 2026-11-22 | PASS |
| Home presentation (redesign) | hero high shows the low | `…shows the real current weather with today's high and low` (1 of 18 failed) | yes | 2026-11-22 | PASS |
| Home presentation (redesign) | missing `isDay` gives a night sky | `skyVariantFor › isDay undefined → day sky` (1 of 18 failed) | yes | 2026-11-22 | PASS |
| Hourly/daily grouping (hours) | `Number.isFinite` check removed | **none failed (survived)**. The check was redundant: `NaN` fails every comparison and ±Infinity lies outside today. The check was then removed from the code as dead code; the test for non-finite times still passes. | yes | 2026-11-22 | FAIL (mutant survived) |
| Navigation params (NIT-231) | `weatherParser` returns a `Date` instead of epoch ms for `dateEpochMs` (cast past the type checker) | all 5 tests in `tests/navigation/routes.test.ts` failed | yes (file restored from a backup; `git diff` empty) | 2026-11-23 | PASS |
| Day detail texts (NIT-233) | `presentDayDetail`: high and low swapped (`temperatureMinCelsius` ↔ `temperatureMaxCelsius`) | real day 1, real day below zero, min above max (3 of 6 failed) | yes (file restored from a backup; `git diff` empty) | 2026-11-23 | PASS |
| | | | | | NOT RUN |

### 2.4 Run History

| Date | Commit | Command | Total | Passed | Failed | Tester |
|---|---|---|---|---|---|---|
| 2026-11-20 | uncommitted, on `weather-models-parser` after `580b309` | `npm test` | 17 | 17 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-20 | uncommitted, on `feat/implement-weather-rest-api` after `5089da9` | `npm run check` | 36 | 36 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-20 | uncommitted, on `feat/city-search-geocoding` after `126230c` | `npm run check` | 60 | 60 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-20 | uncommitted, on `feat/city-search-geocoding` after `d6f9a29` | `npm run check` | 74 | 74 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-20 | uncommitted, on `feat/coordinate-search-validation` after `dd442e8` | `npm run check` | 111 | 111 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-20 | uncommitted, on `feat/coordinate-search-validation` after `9729e05` | `npm run check` | 117 | 117 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-22 | `6f057f5` on `feat/NIT-169-home-search`, before changes (Windows) | `npm run check` | 117 | 117 | 0 | Claude Code (session with Developer 1) |
| 2026-11-22 | uncommitted, on `feat/NIT-169-home-search` after `6f057f5` (Windows) | `npm run check` | 155 | 155 | 0 | Claude Code (session with Developer 1) |
| 2026-11-22 | uncommitted, on `feat/NIT-169-home-search` after `6f057f5`, with US-03.02 (Windows) | `npm run check` | 239 | 239 | 0 | Claude Code (session with Developer 1) |
| 2026-11-22 | uncommitted, same branch, with US-03.03 (Windows) | `npm run check` | 268 | 268 | 0 | Claude Code (session with Developer 1) |
| 2026-11-22 | uncommitted, same branch, with US-03.04 (Windows) | `npm run check` | 288 | 288 | 0 | Claude Code (session with Developer 1) |
| 2026-11-22 | same branch, after installing `@expo/vector-icons` only (Windows) | `npx jest` | 270 run | 270 | 1 suite failed to load (`expo-asset` not found) | Claude Code (session with Developer 1) |
| 2026-11-22 | same branch, redesign complete (Windows) | `npm run check` | 348 | 348 | 0 | Claude Code (session with Developer 1) |
| 2026-11-23 | uncommitted, on `feat/Epic-04` after `e406795`, with NIT-229 | `npm run check` | 348 | 348 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-23 | uncommitted, on `feat/Epic-04` after `8150846`, with NIT-230 | `npm run check` | 348 | 348 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-23 | uncommitted, on `feat/Epic-04`, with NIT-231 | `npm run check` | 353 | 353 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-23 | uncommitted, on `feat/Epic-04` after `f7371a3`, with NIT-233 | `npm run check` | 359 | 359 | 0 | Claude Code (session with Tyrone Asante) |

## 3. UX Interaction Scenarios

At least 20 distinct scenarios are required (W-25). Each scenario must be run on both platforms (W-32).

### 3.1 Scenario Definitions

| ID | Req. | Starting state | User action | Expected result |
|---|---|---|---|---|
| UX-01 | W-01, W-02 | Search screen, online | Search for "Stockholm" | Matching locations are listed with region/country |
| UX-02 | W-01 | Search screen, online | Search for a nonsense name, e.g. "xqzvbn" | A "no locations found" message is shown and the app does not crash |
| UX-03 | W-01, W-30 | Search screen | Submit an empty or whitespace-only query | No request is sent and a hint is shown |
| UX-04 | W-03 | Coordinate search | Enter `59.33`, `18.07` and submit | Weather for those coordinates loads |
| UX-05 | W-03, W-30 | Coordinate search | Enter latitude `95` | An inline validation error is shown and no request is sent |
| UX-06 | W-04, W-13 | Location selected, online | Open the weather view | Current conditions are shown with units and the update time |
| UX-07 | W-05, W-21 | Weather view loaded | Scroll the seven-day forecast | Seven days are shown and the list scrolls smoothly |
| UX-08 | W-06, W-21 | Weather view loaded | Scroll today's hourly forecast | Hourly entries for the rest of today are shown |
| UX-09 | W-07 | Seven-day forecast shown | Tap a day | The day detail view opens with that day's data |
| UX-10 | W-08 | Weather view, location not a favourite | Tap "add to favourites" | The location is marked as a favourite |
| UX-11 | W-08 | Location is a favourite | Tap "remove from favourites" | The favourite is removed and the UI updates |
| UX-12 | W-08, W-09 | At least one favourite saved | Fully close and reopen the app | Favourites are still listed |
| UX-13 | W-09 | Favourites screen with entries | Tap a favourite | Its weather view opens |
| UX-14 | W-10 | Any screen | Open Settings, change a value, restart the app | Settings screen opens and the change persists |
| UX-15 | W-11 | Data loaded, refresh interval set | Reopen the location before and after the interval passes | Cache is used before the interval; fresh data is fetched after it |
| UX-16 | W-12 | Weather view in °C | Switch to °F in Settings and return | All temperatures are shown in °F |
| UX-17 | W-16, W-17 | Location loaded once, then device offline | Open that location | Cached data is shown with an offline / last-updated indicator |
| UX-18 | W-17, W-18 | No cache for the location, device offline | Open a new location | An error message with a retry action is shown |
| UX-19 | W-18 | Error state from UX-18 | Restore the network and tap retry | Data loads successfully |
| UX-20 | W-20, W-23 | Slow network (emulator network throttling) | Load a location | A loading indicator is shown and the UI stays responsive |
| UX-21 | W-22 | Weather view, portrait | Rotate to landscape and back | The layout adapts, nothing is cut off and the data stays |
| UX-22 | W-22 | Search and Settings screens | Rotate to landscape | Layouts are usable and all content is reachable |
| UX-23 | W-23 | A location is loading | Navigate away before loading finishes | No crash and no stale update on the new screen |
| UX-24 | W-08, W-30 | Location already a favourite | Try to add it again (e.g. via search) | No duplicate favourite is created |
| UX-25 | W-09 | No favourites saved | Open the Favourites screen | Empty-state guidance is shown |

### 3.2 Execution Log

| ID | Platform | Date | Tester | Actual result | Status |
|---|---|---|---|---|---|
| UX-01 | Android Emulator (Windows) | | | | NOT RUN |
| UX-01 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-02 | Android Emulator (Windows) | | | | NOT RUN |
| UX-02 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-03 | Android Emulator (Windows) | | | | NOT RUN |
| UX-03 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-04 | Android Emulator (Windows) | | | | NOT RUN |
| UX-04 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-05 | Android Emulator (Windows) | | | | NOT RUN |
| UX-05 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-06 | Android Emulator (Windows) | | | | NOT RUN |
| UX-06 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-07 | Android Emulator (Windows) | | | | NOT RUN |
| UX-07 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-08 | Android Emulator (Windows) | | | | NOT RUN |
| UX-08 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-09 | Android Emulator (Windows) | | | | NOT RUN |
| UX-09 | iOS Simulator (macOS) | 2026-11-23 | Tyrone Asante | Reported "the simulator scenarios also work" for N-1 – N-7 (TEST_REPORT §1.10). The detail screen shows only the weekday, date and place so far, not the day's weather (US-04.02) | PASS (by report; navigation part only) |
| UX-10 | Android Emulator (Windows) | | | | NOT RUN |
| UX-10 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-11 | Android Emulator (Windows) | | | | NOT RUN |
| UX-11 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-12 | Android Emulator (Windows) | | | | NOT RUN |
| UX-12 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-13 | Android Emulator (Windows) | | | | NOT RUN |
| UX-13 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-14 | Android Emulator (Windows) | | | | NOT RUN |
| UX-14 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-15 | Android Emulator (Windows) | | | | NOT RUN |
| UX-15 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-16 | Android Emulator (Windows) | | | | NOT RUN |
| UX-16 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-17 | Android Emulator (Windows) | | | | NOT RUN |
| UX-17 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-18 | Android Emulator (Windows) | | | | NOT RUN |
| UX-18 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-19 | Android Emulator (Windows) | | | | NOT RUN |
| UX-19 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-20 | Android Emulator (Windows) | | | | NOT RUN |
| UX-20 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-21 | Android Emulator (Windows) | | | | NOT RUN |
| UX-21 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-22 | Android Emulator (Windows) | | | | NOT RUN |
| UX-22 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-23 | Android Emulator (Windows) | | | | NOT RUN |
| UX-23 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-24 | Android Emulator (Windows) | | | | NOT RUN |
| UX-24 | iOS Simulator (macOS) | | | | NOT RUN |
| UX-25 | Android Emulator (Windows) | | | | NOT RUN |
| UX-25 | iOS Simulator (macOS) | | | | NOT RUN |

## 4. Summary

Fill this in from the tables above. Do not estimate.

| | Android Emulator | iOS Simulator |
|---|---|---|
| UX scenarios executed / PASS | 0 of 25 executed | 1 of 25 executed (UX-09, PASS by report, navigation part only) |
| Unit tests PASS / total | One shared suite: Jest runs in Node, not on a device or emulator | 359 / 359 (run on macOS, 2026-11-23) |
| Known open defects | | |
