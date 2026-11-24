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
| Hero shows weekday, date, icon, condition and high/low matching the tapped row; VoiceOver reads it as one sentence; nothing cut off with large text (iOS Simulator) | 2026-11-23 | Tyrone Asante reported "It works" | PASS (by report) |
| Same on the Android Emulator | | | NOT RUN |

**NIT-234 (sun card):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| Real fixtures for polar days | 2026-11-23 | Fetched with the app's request (`buildForecastUrl`). Longyearbyen (78.22, 15.65), `Arctic/Longyearbyen`, UTC+1: all 7 days sunrise = sunset = day start. McMurdo (−77.85, 166.67), `Antarctica/McMurdo`, UTC+13: all 7 days sunrise = day start, sunset 24 h later. Saved as `tests/fixtures/openMeteoForecastLongyearbyen.json` and `…McMurdo.json` | PASS |
| `npm run check` | 2026-11-23 | `tsc --noEmit` without errors; Jest 365 / 365 | PASS |
| iOS bundle | 2026-11-23 | `npx expo export --platform ios` exported without errors | PASS |
| Expo Doctor | 2026-11-23 | 20/20 checks passed | PASS |
| Stockholm times plausible; Longyearbyen "Polar night"; McMurdo (−77.85, 166.67) "Midnight sun"; rows wrap with large text; back and swipe-back still work (iOS Simulator) | 2026-11-23 | Tyrone Asante reported "It works" | PASS (by report) |
| Same on the Android Emulator | | | NOT RUN |

**NIT-235 (detail fields mapped, US-04.03):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| Real response to the extended request | 2026-11-23 | Stockholm (59.33, 18.07), URL from `buildForecastUrl`. All 9 new daily fields present with 7 values; `daily_units`: apparent temperature °C, rain mm, snowfall **cm**, precipitation hours h, gusts m/s, direction °, UV index (none), daylight s. Saved as `tests/fixtures/openMeteoForecastStockholmDetails.json` | PASS |
| `npm run check` | 2026-11-23 | `tsc --noEmit` without errors; Jest 398 / 398 | PASS |
| iOS bundle | 2026-11-23 | `npx expo export --platform ios` exported without errors | PASS |
| Home still loads with the larger request; detail screen unchanged (iOS Simulator) | 2026-11-23 | Tyrone Asante reported "It works" | PASS (by report) |

**NIT-236 (labels and units on screen):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| `npm run check` | 2026-11-23 | `tsc --noEmit` without errors; Jest 398 / 398 | PASS |
| iOS bundle | 2026-11-23 | `npx expo export --platform ios` exported without errors | PASS |
| Three cards with values and units; feels-like line in the hero; bottom not hidden behind the home indicator (iOS Simulator) | 2026-11-23 | Tyrone Asante reported "It works" | PASS (by report) |
| VoiceOver reading of "m/s", "mm", "cm", "h" and compass letters (iOS Simulator) | 2026-11-23 | Tyrone Asante reported "It works" | PASS (by report) |

**NIT-237 (missing values and small screens; US-04.03 and Epic 4 wrap-up):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| `npm run check` | 2026-11-23 | `tsc --noEmit` without errors; Jest 416 / 416 | PASS |
| iOS bundle | 2026-11-23 | `npx expo export --platform ios` exported without errors | PASS |
| Expo Doctor | 2026-11-23 | 20/20 checks passed | PASS |
| UX-26, largest text size (iOS Simulator, iPhone 18 Pro Max, iOS 27.2) | 2026-11-23 | Tyrone Asante reported: "I set the largest text size and it works" | PASS (by report) |
| UX-26, smallest screen (iOS Simulator, iPhone 17e, iOS 27.2) | 2026-11-23 | iPhone SE is not offered for iOS 27.2, so the smallest available iPhone was used. Tyrone Asante reported "It works" (open a day, scroll to the bottom) | PASS (by report) |
| UX-26, landscape (iOS Simulator) | 2026-11-23 | Reported to work "when I used resize mode". The app is still portrait-only (`app.json` `"orientation": "portrait"`, STYLE §14) until W-22 (US-08.02), so the screen did not actually rotate; this is not a landscape result | NOT RUN (blocked by W-22) |
| UX-26 on the Android Emulator | | | NOT RUN |

**Epic 4 merged into `dev` (merge commit `8c09dfc`):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| Day detail and favourites together on `dev`: open a day; star a place, open Favourites, choose it; open a day afterwards (iOS Simulator) | 2026-11-23 | Tyrone Asante reported "It worked, on dev now and all is merged" and "Everything worked on dev" | PASS (by report) |

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

### 1.11 Favourites Logic and Persistence: Automated Checks (US-05.01, US-05.02)

Code uncommitted on `feat/NIT-156-favorites` after `8150846`, on Windows. No screen uses the new modules yet: the star button (NIT-239) and the favourites screen (US-05.03) come after the Epic 4 navigation work, so nothing new can be seen on a device. A bundle export was not run, because the new modules are not imported by the app yet.

| Check | Date | Actual result | Status |
|---|---|---|---|
| Install | 2026-11-23 | `npx expo install @react-native-async-storage/async-storage` → `2.2.0` in `dependencies` ("Installing 1 SDK 58.0.0 compatible native module"); `app.json` unchanged | PASS |
| `npm run check` before the changes | 2026-11-23 | `tsc --noEmit` without errors; Jest 22 suites, 348 / 348 | PASS |
| `npm run check` after the changes | 2026-11-23 | `tsc --noEmit` without errors; Jest 27 suites, 480 / 480 (the 348 earlier tests unchanged and passing, 132 new) | PASS |
| Earlier tests alone | 2026-11-23 | `npx jest` without the five new files: 22 suites, 348 / 348 | PASS |
| Expo Doctor | 2026-11-23 | `npx expo-doctor`: 20/20 checks passed | PASS |
| Mutation checks | 2026-11-23 | 9 deliberate faults, each detected by at least one failing test, all reverted (§2.3) | PASS |
| Restart persistence (UX-12) on the Android Emulator | | Needs the favourites UI; no Android SDK on the Windows machine yet | NOT RUN |
| Restart persistence (UX-12) on the iOS Simulator | | Needs the favourites UI | NOT RUN |

### 1.12 Favourites UI: Star, Favourites Screen and Return to Home (NIT-239, US-05.03)

Code uncommitted on `feat/NIT-178-favorites-screen` after `9d90de1` (`dev` with PR #3), on Windows. Developer 2's NIT-230 commit (`1bdc00b`, `HomeScreen` signature and day rows) is not in this branch.

| Check | Date | Actual result | Status |
|---|---|---|---|
| Earlier tests after the source changes, before new tests | 2026-11-23 | `npx tsc --noEmit` without errors; `npx jest` 27 suites, 480 / 480 (ViewModel and repository changes did not break a test) | PASS |
| `npm run check` after the changes | 2026-11-23 | `tsc --noEmit` without errors; Jest 31 suites, 537 / 537 (480 earlier, 57 new) | PASS |
| Android and iOS bundles | 2026-11-23 | `npx expo export --platform android --platform ios` (output outside the repository): both bundles exported without errors | PASS |
| Expo Doctor | 2026-11-23 | `npx expo-doctor`: 20/20 checks passed | PASS |
| Glyphs used | 2026-11-23 | `star`, `star-outline`, `star-box-multiple-outline`, `trash-can-outline`, `alert-circle-outline` are in the installed MaterialCommunityIcons glyph map; `tsc` checks the names | PASS |
| `popTo` and `useFocusEffect` exist | 2026-11-23 | In the installed `@react-navigation/native` 7.5.2 / core 7.25.0 typings | PASS |
| Mutation checks | 2026-11-23 | 6 deliberate faults, each detected, all reverted (§2.3) | PASS |
| Physical device, Android Emulator, iOS Simulator | | Not available in this session | NOT RUN |

**Manual checks for the final verification** (each on the Android Emulator and the iOS Simulator; all NOT RUN):

| # | Action | Expected result | Status |
|---|---|---|---|
| F-1 | Open the app with no place selected | No star in the header; the favourites button and search are shown | NOT RUN |
| F-2 | Choose Lund, tap the outlined star (UX-10) | Star becomes filled after saving; a screen reader reads "Remove Lund from favourites" | NOT RUN |
| F-3 | Tap the filled star (UX-11) | Star becomes outlined | NOT RUN |
| F-4 | Save Lund, search another place, then choose Lund again | Star outlined for the other place, filled for Lund | NOT RUN |
| F-5 | Search "Lund" again and pick the same result, or enter `55.7058, 13.1932` (UX-24) | Star is already filled; tapping it removes Lund; no second Lund on the favourites screen | NOT RUN |
| F-6 | Open Favourites with nothing saved (UX-25) | Empty state with the star icon and "Search for a place, then tap the star…" | NOT RUN |
| F-7 | Save two places, open Favourites | Both listed, newest first, with region and country; a coordinate place shows its coordinates | NOT RUN |
| F-8 | Tap a favourite (UX-13) | Back on Home with that place's weather; header shows the place; star filled | NOT RUN |
| F-9 | Tap the favourite that Home already shows | Home again, no new loading indicator (no request) | NOT RUN |
| F-10 | Remove the shown place on Favourites, then go back | The row disappears; on Home the star is outlined | NOT RUN |
| F-11 | Save favourites, fully close and reopen the app (UX-12) | Favourites still listed; the star is filled for a saved place | NOT RUN |
| F-12 | Tap a day row after returning from Favourites (needs NIT-230 merged) | `DayDetail` opens for that place | NOT RUN |
| F-13 | Back button, iOS swipe-back and the Android back button on Favourites | Home with the same place and scroll position | NOT RUN |
| F-14 | Landscape and a small phone on Favourites | List scrolls; content stays inside the safe area | NOT RUN |

### 1.13 Settings Screen (US-06.01)

**NIT-247 (screen and entry point, defaults shown):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| `cog-outline` and `check` glyphs exist | 2026-11-24 | Both present in the installed MaterialCommunityIcons glyph map | PASS |
| `npm run check` | 2026-11-24 | `tsc --noEmit` without errors; Jest 611 / 611 | PASS |
| iOS bundle | 2026-11-24 | `npx expo export --platform ios` exported without errors | PASS |
| Gear button on Home; a long place name still fits (iPhone 17e); Settings shows 30 min, °C and m/s ticked and marked "default"; back and swipe-back return to Home with the same place (iOS Simulator) | 2026-11-24 | Tyrone Asante reported "It works" | PASS (by report) |

**NIT-248 (stored settings, choosing):**

| Check | Date | Actual result | Status |
|---|---|---|---|
| `npm run check` | 2026-11-24 | `tsc --noEmit` without errors; Jest 639 / 639 | PASS |
| iOS bundle | 2026-11-24 | `npx expo export --platform ios` exported without errors | PASS |
| Choose 60 min, °F, km/h; checkmarks move at once; still selected after going back and reopening Settings; still selected after fully closing and restarting the app; "default" still shown on the default options; VoiceOver reads a tapped row as selected (iOS Simulator) | | | NOT RUN |

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
| Forecast day/hour display texts | Data transformation | `formatDayLabel`, `presentDailyForecast`, `presentHourlyForecast`, `presentDayDetail`, `presentSunTimes` in `src/utils/forecastFormatting.ts` (US-03.03, US-03.04, NIT-233, NIT-234) | W-05, W-06, W-07 | |
| Favourite identity and list rules (tolerance, newest first, duplicates) | Data transformation | `src/utils/favorites.ts` (US-05.01) | W-08 | |
| Stored favourites JSON → `Location[]` | JSON parsing | `parseStoredFavorites`, `toStoredFavorites` in `src/parsers/favoritesParser.ts` (US-05.02) | W-08, W-19 | proposed |
| Storage failures → `AppError` kind | Error-state logic (data layer) | `src/storage/keyValueStorage.ts`, `src/repositories/favoritesRepository.ts` (US-05.02) | W-08 | |
| Favourites load/save result → `LoadState`, write gating | Error-state logic (ViewModel) | `loadFavoritesState`, `reloadingState`, `planFavoritesChange`, `saveFavoritesChange`, `isFavoriteIn` in `src/viewmodels/useFavoritesViewModel.ts` (US-05.01, US-05.02) | W-08 | proposed |
| Favourites state → star, list, empty and error views; `AppError` kind → message | Error-state logic (View) | `presentFavoriteToggle` in `HomeHeader.tsx`, `describeFavoritesStatus`, `favoritesLoadErrorMessage`, `favoritesSaveErrorMessage` in `FavoritesStatus.tsx`, `presentFavoriteItem` in `FavoriteListItem.tsx` (NIT-239, US-05.03) | W-08, W-09 | |
| Settings → screen texts (selected, default, spoken units) | Data transformation | `presentSettings` in `src/utils/settingsPresentation.ts` (NIT-247) | W-10 – W-12 | |
| Stored settings JSON → `AppSettings` (defaults field by field) | JSON parsing | `parseStoredSettings`, `toStoredSettings` in `src/parsers/settingsParser.ts` (NIT-248) | W-10 – W-12 | |
| Settings storage: defaults, round trip, write order, storage errors | (extra) | `settingsRepository` (NIT-248) | W-10 | |
| Read/write order across screens | (extra) | `favoritesRepository` (US-05.03, SPEC D-40) | W-08, W-09 | |
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
| weatherService › buildForecastUrl › requests exactly the fields present in the parser test fixture | W-13, W-14 | field lists vs. fixture keys (since NIT-235: `openMeteoForecastStockholmDetails.json`, the response to the extended request) | identical sets for current, hourly and daily | as expected (2026-11-20) | PASS |
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
| presentSunTimes (6 tests) | W-07, D-42 | real Stockholm days 0 and 1; all 7 real Longyearbyen days; all 7 real McMurdo days; 23½ h of daylight from 00:15; sunset, sunrise or both missing; UTC−5 and UTC+5:30 | "07:53"/"15:12", "07:55"/"15:11"; "Polar night" in both rows; "Midnight sun" in both rows; "00:15"/"23:45"; "Not available" in the missing row only; "01:53"/"09:12", "12:23"/"19:42" | as expected (2026-11-23) | PASS |
| weatherParser › detail fields (16 tests) | W-07, W-14, W-19, D-43 | new real Stockholm response; each of the 9 fields removed; `wind_gusts_10m_max[0] = null`; `snowfall_sum` cut to 5 values; `uv_index_max[2] = "high"`; the older response without the fields | day 0: −2.3/−4.6 °C, 7.5 mm, 0 cm, 22 h, 15.4 m/s, 3°, UV 0.15, 25645.94 s; every day in order; missing → `undefined`, other values kept; null → `undefined` for that day only; `AppError('parse')` naming the field (twice); older response → `undefined` | as expected (2026-11-23) | PASS |
| formatPrecipitation, formatSnowfall, formatHours, formatUvIndex, formatDaylight, formatCompassDirection (10 tests) | W-07, D-43 | `7.5`, `0.4`, `0` mm; `0`, `2.45` cm; `22`, `0`, `3.6` h; UV `0.15`, `0.55`, `7.3`; `25645.94`, `2700`, `0`, `86400`, `3599.9` s; the 8 centres, the real directions, `22.5`, `22.4`, `337.5`, `360`, `359`, `−90`, `405` | "7.5 mm", "0.4 mm", "0.0 mm"; "0.0 cm", "2.5 cm"; "22 h", "0 h", "4 h"; "0", "1", "7"; "7 h 7 min", "45 min", "0 min", "24 h 0 min", "1 h 0 min"; N … NW; N N N NW NW SW S; NE, N, N, N, N, W, NE | as expected (2026-11-23) | PASS |
| presentDayDetail › feels like (2 tests) | W-07, D-43 | real day 0 of the new response; feels-like min or max removed | "high -2 °C · low -5 °C", spoken "… Feels like high -2 °C, low -5 °C" (no "·"); `undefined` and no "Feels like" in the label | as expected (2026-11-23) | PASS |
| presentDayConditions (5 tests) | W-07, D-42, D-43 | real rainy day 0; real dry day 5; no optional values; gusts removed; real dry day 3 | all 10 rows ("7.5 mm", "100 %", "22 h", "15.4 m/s", "N", UV "0", "7 h 7 min" …); "0.0 mm", "2 %", "SW", UV "1"; all 10 "Not available"; only gusts "Not available"; zero shown as "0.0 mm"/"0.0 cm" | as expected (2026-11-23) | PASS |
| day detail from the API response (18 tests) | W-07, W-19, D-42, D-43 | new real Stockholm response complete; each of the 12 optional daily fields the screen shows removed in turn; `wind_gusts_10m_max[2] = null`; feels-like max or min removed; the older response without the detail fields; real dry day 4 | no "Not available" in any of 12 rows; only the matching row "Not available", all others unchanged; "Not available" on day 2 only (day 1 "13.4 m/s", day 3 "6.2 m/s"); feels-like line left out, high still "3 °C"; the 7 new rows "Not available", total "1.4 mm", sunrise "07:53"; "0.0 mm", "0.0 mm", "0.0 cm", "0 h" | as expected (2026-11-23) | PASS |
| favorites › isSameFavoritePlace (10 tests) | W-08 | real Lund SE and Lund GB from the geocoding fixture; typed coordinates; differences of exactly 0.0001 in both directions on both axes; 0.000101; latitude-only and longitude-only differences; −180/180 | same place, also under another name and within 0.0001 (inclusive); same-named places elsewhere differ; just outside differs; each axis checked; −180/180 differ (documented) | as expected (2026-11-23) | PASS |
| favorites › containsFavorite, addFavorite, removeFavorite, toggleFavorite (16 tests) | W-08 | empty and frozen lists; duplicates under the same and another name; Lund SE/GB | newest first; same object and exact coordinates kept; no duplicate, first entry kept, original array returned; same-named place elsewhere added/kept; input never changed; toggle twice restores the list | as expected (2026-11-23) | PASS |
| favorites › normalizeFavorites (4 tests) + fixture check | W-08 | lists with and without duplicates | first-saved entry of a duplicate kept in its own position, order kept, original returned when nothing changes, input not changed | as expected (2026-11-23) | PASS |
| favoritesParser › parseStoredFavorites (42 tests) | W-08, W-19 | valid versioned value; empty list; optional fields missing; bounds ±90/±180; extra field; null/array/string/number root; missing or non-array `favorites`; non-object entry; missing, 0, 2, 1.5 and "1" versions; missing/empty/blank/numeric name; missing coordinates/latitude/longitude; null or non-string region/country; string/null/boolean/array coordinates; NaN, ±Infinity; ±90.0001, ±180.0001; duplicates | `Location[]` in stored order; otherwise `AppError('parse')` naming the field (version message names the unsupported version); duplicates left to the repository | as expected (2026-11-23) | PASS |
| favoritesParser › toStoredFavorites (5 tests) | W-08 | Lund and a typed place; a place with an extra field | version 1; exactly the documented JSON; no `region`/`country`/`null` for a typed place; only `Location` fields; JSON round trip unchanged | as expected (2026-11-23) | PASS |
| keyValueStorage (8 tests) | W-08 | AsyncStorage Jest mock: nothing stored; stored JSON; broken JSON text; rejected `getItem`/`setItem`; delayed `setItem` | `undefined`; the value; `parse`; `storage` (earlier value kept); `writeJson` resolves only after the write is confirmed | as expected (2026-11-23) | PASS |
| favoritesRepository (18 tests) | W-08 | first launch; valid stored list; stored duplicates; malformed JSON, version 2, array root, missing field, latitude 91; read failure; save of two places, of `[]`, of duplicates; write failure; save → load (restart); damaged value then an explicit save; fake `fetch` | `[]`; newest-first list; first-saved duplicate kept; `parse` with the stored text untouched; `storage`; versioned JSON under `weatherly:favorites`; earlier favourites kept after a failed write; exact coordinates restored; recovery only by an explicit save; no network call | as expected (2026-11-23) | PASS |
| useFavoritesViewModel › pure state rules (28 tests) | W-08 | load results (list, `[]`, `storage`, `parse`, other errors); reload from each state; changes with a saved list, while saving and without a saved list; duplicate adds; failing and delayed saves; the rules on the real repository: add/toggle/remove, five identical adds, a failed write then a retry, damaged storage | success / error with the same kind / `unknown`, never rejects; list kept visible while reloading; no write while saving, after a failed read or for a no-op; new list only after a confirmed write, else the last saved list and the error; storage always equals the state; one write for five adds; damaged text untouched | as expected (2026-11-23) | PASS |
| homeHeader › presentFavoriteToggle, the star on the home screen (10 tests) | W-08 | saved and unsaved places; a coordinate place; a disabled star; Lund saved / Kiruna not; typed Lund within the tolerance; saving, reloading and loading states | outlined "Add … to favourites" / filled "Remove … from favourites"; follows the selected place; disabled with a hint while saving, reading or loading; the last list stays visible while reading | as expected (2026-11-23) | PASS |
| favoriteListItem › presentFavoriteItem (3 tests) | W-09 | Lund; a place with a country only; a typed place | "Skåne län, Sverige"; "Monaco"; "33.87° S, 151.21° E"; select and remove labels | as expected (2026-11-23) | PASS |
| favoritesStatus (22 tests) | W-09, W-18 | loading/idle; empty list; list with entries (also while reading); `parse` and `storage` read errors; every `AppError` kind for both messages; reset confirmation | loading; empty state explaining the star; `null`; reset offered only for `parse`; readable texts without the developer message; save texts say the favourites are unchanged; confirmation says "for good" and "cannot be undone" | as expected (2026-11-23) | PASS |
| favoriteRoutes (6 tests) | W-09 | Home params with a geocoded and a coordinate place; a favourite read back from storage; chosen place equal to / different from the shown place; no place shown | params survive a JSON round trip; the forecast URL uses the saved coordinates exactly; no new weather request for the shown place, a load otherwise | as expected (2026-11-23) | PASS |
| useFavoritesViewModel › canChangeFavorites, canResetFavorites, resetStoredFavorites, two screens (13 tests) | W-08, W-09 | saved, refreshing, loading and error states with and without a write; damaged storage then reset; reset with a failing write; two ViewModel copies on the real repository | changes only from a current list and without a write; reset only after a failed read; damaged text replaced by `{"version":1,"favorites":[]}` only by the reset, kept when it fails; a removal on Favourites is seen by Home after its focus reload; no duplicate from two screens; storage unchanged after a failed removal | as expected (2026-11-23) | PASS |
| favoritesRepository › order of reads and writes (3 tests) | W-08, W-09 | a read started during a delayed write; a failed write followed by another; three operations started at once | the read waits and returns the new list; the next operation still runs; results follow the start order | as expected (2026-11-23) | PASS |
| settings options and defaults (2 tests) | W-10 – W-12 | the option lists; `DEFAULT_SETTINGS` | every default is offered; 30 min, Celsius, metres per second | as expected (2026-11-24) | PASS |
| presentSettings (4 tests) | W-10 – W-12 | the defaults; changed settings (60 min, °F, km/h) | titles "Refresh weather every", "Temperature", "Wind speed"; labels "15 min" … "°C", "°F", "m/s", "km/h"; exactly one selected per group; "default" stays on the default option; spoken "metres per second, default", "kilometres per hour" | as expected (2026-11-24) | PASS |
| settingsParser (18 tests) | W-10, D-44 | valid stored value; `undefined`; `null`, a string, a number, arrays; version `undefined`, 0, 2, "1"; one invalid field (45 min, "kelvin", `null`); "60" as text; a missing field; an extra field; write and JSON round trip | the stored settings; defaults; defaults; defaults; only that field defaulted; refresh 30; wind defaulted; ignored; `{ version: 1, … }` read back unchanged | as expected (2026-11-24) | PASS |
| settingsRepository (7 tests) | W-10, D-44 | nothing saved; save then load; stored format; text that is not JSON; `getItem` fails; `setItem` fails after an earlier save; a slow first save followed by a second | defaults; the same settings; `{ version: 1, … }` under `weatherly:settings`; defaults; `AppError('storage')`; `AppError('storage')` and the earlier value kept; the second (last) choice stored | as expected (2026-11-24) | PASS |
| applySettingsChange (3 tests) | W-10 | one field; all fields; the current object | only that field changed; all changed; the current object unchanged | as expected (2026-11-24) | PASS |
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
| Favourite identity | rounding allowance removed (plain `<= 0.0001`) | `…true at exactly the tolerance, in both directions and on both axes` (1 of 31 failed) | yes | 2026-11-23 | PASS |
| Favourite identity | longitude no longer compared | 3 of 31 failed (longitude outside the tolerance, each axis checked, −180/180) | yes | 2026-11-23 | PASS |
| Favourite list rules | new favourite appended instead of first | 3 of 31 failed (newest first, same-named place elsewhere, toggle adds as newest) | yes | 2026-11-23 | PASS |
| Favourite list rules | `normalizeFavorites` keeps the newest duplicate | 2 of 31 failed (first-saved entry kept, order kept) | yes | 2026-11-23 | PASS |
| Stored favourites parsing | version check disabled | 4 of 47 failed (versions 2, 0, 1.5 and the message test) | yes | 2026-11-23 | PASS |
| Stored favourites parsing | coordinate range check disabled | the 4 out-of-range tests (4 of 47 failed) | yes | 2026-11-23 | PASS |
| Stored favourites parsing | `null` region/country accepted as missing | the 2 `null` tests (2 of 47 failed) | yes | 2026-11-23 | PASS |
| Favourites write gating | changes allowed while a write runs | `…writes nothing while another write is running (rapid repeated taps)` (1 of 28 failed) | yes | 2026-11-23 | PASS |
| Favourites save outcome | failed write reported with the new list | 3 of 28 failed (failed write, non-AppError failure, consistency after a failed write) | yes | 2026-11-23 | PASS |
| Read/write order across screens | `favoritesRepository` runs each operation at once (no queue) | `…lets a read started during a write wait for it, so the read sees the new list` (1 of 21 failed) | yes | 2026-11-23 | PASS |
| Favourites write gating | changes allowed while the list is read again | `canChangeFavorites › blocks changes while the list is read again…`; `the star on the home screen › is disabled while the favorites are read again…` (2 of 147 failed) | yes | 2026-11-23 | PASS |
| Favourites reset gating | reset allowed for any state except loading | `canResetFavorites › never allows deleting a list that was read successfully, or while reading` (1 of 69 failed) | yes | 2026-11-23 | PASS |
| Favourite star | filled and outlined icons swapped | 7 of 10 failed (`presentFavoriteToggle` and `the star on the home screen`) | yes | 2026-11-23 | PASS |
| Favourites error view | "Delete saved favourites" offered for every read error | `describeFavoritesStatus › offers deleting the saved favourites only for damaged data` (1 of 22 failed) | yes | 2026-11-23 | PASS |
| Favourite row texts | coordinates fallback removed | `presentFavoriteItem › falls back to the coordinates for a place entered as coordinates` (1 of 3 failed) | yes | 2026-11-23 | PASS |
| Hourly/daily grouping (hours) | `Number.isFinite` check removed | **none failed (survived)**. The check was redundant: `NaN` fails every comparison and ±Infinity lies outside today. The check was then removed from the code as dead code; the test for non-finite times still passes. | yes | 2026-11-22 | FAIL (mutant survived) |
| Navigation params (NIT-231) | `weatherParser` returns a `Date` instead of epoch ms for `dateEpochMs` (cast past the type checker) | all 5 tests in `tests/navigation/routes.test.ts` failed | yes (file restored from a backup; `git diff` empty) | 2026-11-23 | PASS |
| Day detail texts (NIT-233) | `presentDayDetail`: high and low swapped (`temperatureMinCelsius` ↔ `temperatureMaxCelsius`) | real day 1, real day below zero, min above max (3 of 6 failed) | yes (file restored from a backup; `git diff` empty) | 2026-11-23 | PASS |
| Sun times (NIT-234) | `presentSunTimes`: polar-night check disabled (`if (false)`) | `…"Polar night" for every real Longyearbyen day` (1 of 6 failed) | yes (file restored from a backup, checksum equal) | 2026-11-23 | PASS |
| Sun times (NIT-234) | `presentSunTimes`: UTC offset ignored (`formatLocalTime(epochMs, 0)`) | Stockholm times, long real day, "Not available", other offsets (4 of 6 failed) | yes (file restored from a backup, checksum equal) | 2026-11-23 | PASS |
| Detail fields (NIT-235) | `formatCompassDirection`: `Math.round` → `Math.floor` (sectors shifted by half a point) | 3 compass tests, real dry day in `presentDayConditions` (4 of 398 failed) | yes (file restored from a backup) | 2026-11-23 | PASS |
| Detail fields (NIT-235) | `formatSnowfall`: unit "cm" → "mm" | snowfall formatter test, real rainy day, zero-as-value test (3 of 398 failed) | yes (file restored from a backup) | 2026-11-23 | PASS |
| Detail fields (NIT-235) | `weatherParser`: `snowfallSumCm` read from `rain_sum` | 3 parser detail tests, real rainy day (4 of 398 failed) | yes (file restored from a backup) | 2026-11-23 | PASS |
| Missing values (NIT-237) | `formatOptional`: `value === undefined` → `!value` (zero treated as missing) | 3 `presentDayConditions` tests, 2 end-to-end tests (all rows present; zero on a dry day) (5 of 416 failed) | yes (file restored, `cmp` equal) | 2026-11-23 | PASS |
| Settings texts (NIT-247) | `presentSettings`: `isSelected: value === selected` → `true` | 3 of 6 `settingsPresentation` tests | yes (file restored, `cmp` equal) | 2026-11-24 | PASS |
| Settings storage (NIT-248) | `settingsParser`: an invalid field throws instead of falling back to its default | 3 parser tests (invalid field, number as text, missing field) (3 of 639 failed) | yes (file restored, `cmp` equal) | 2026-11-24 | PASS |
| Settings storage (NIT-248) | `settingsParser`: version check removed | the 4 wrong-version tests (4 of 639 failed) | yes (file restored, `cmp` equal) | 2026-11-24 | PASS |
| Settings storage (NIT-248) | `settingsRepository`: `saveSettings` no longer waits for earlier writes | `…two quick saves in the order they were made…` (1 of 639 failed) | yes (file restored, `cmp` equal) | 2026-11-24 | PASS |
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
| 2026-11-23 | uncommitted, on `feat/Epic-04` after `f7371a3`, with NIT-234 | `npm run check` | 365 | 365 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-23 | uncommitted, on `feat/Epic-04`, with NIT-235 | `npm run check` | 398 | 398 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-23 | uncommitted, on `feat/Epic-04`, with NIT-236 | `npm run check` | 398 | 398 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-23 | uncommitted, on `feat/Epic-04`, with NIT-237 | `npm run check` | 416 | 416 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-23 | `feat/Epic-04` with `dev` (Epic 5) merged in, conflicts resolved, uncommitted | `npm run check` | 605 | 605 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-24 | uncommitted, on `feat/EPIC-06` after `8c09dfc`, with NIT-247 | `npm run check` | 611 | 611 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-24 | uncommitted, on `feat/EPIC-06` after `8c09dfc`, with NIT-248 | `npm run check` | 639 | 639 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-23 | `8150846` on `feat/NIT-156-favorites`, before changes (Windows) | `npm run check` | 348 | 348 | 0 | Claude Code (session with Developer 1) |
| 2026-11-23 | uncommitted, on `feat/NIT-156-favorites` after `8150846`, with US-05.01/US-05.02 logic (Windows) | `npm run check` | 480 | 480 | 0 | Claude Code (session with Developer 1) |
| 2026-11-23 | uncommitted, on `feat/NIT-178-favorites-screen` after `9d90de1`, source changed, no new tests yet (Windows) | `npx tsc --noEmit`, `npx jest` | 480 | 480 | 0 | Claude Code (session with Developer 1) |
| 2026-11-23 | uncommitted, on `feat/NIT-178-favorites-screen` after `9d90de1`, with NIT-239 and US-05.03 (Windows) | `npm run check` | 537 | 537 | 0 | Claude Code (session with Developer 1) |

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
| UX-26 | W-07, W-21, W-22 | Day detail open, on the smallest available iPhone simulator (iPhone 17e on iOS 27.2) or a small Android phone. Landscape part only after W-22 (US-08.02) | Scroll to the bottom; rotate to landscape and back; set the largest text size | All cards scroll into view, nothing is cut off or overlaps, labels and values wrap, the header and back navigation keep working |

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
| UX-09 | iOS Simulator (macOS) | 2026-11-23 | Tyrone Asante | Navigation reported to work for N-1 – N-7 (§1.10). The day's data (date, condition, high/low, feels-like, sun, precipitation and wind cards) reported to work after NIT-232 – NIT-236 (§1.9) | PASS (by report) |
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
| UX-26 | Android Emulator (Windows) | | | | NOT RUN |
| UX-26 | iOS Simulator (macOS) | 2026-11-23 | Tyrone Asante | Smallest screen (iPhone 17e) and largest text size reported to work (TEST_REPORT §1.9). Landscape not run: the app is portrait-only until W-22 (US-08.02) | PARTIAL (by report; landscape NOT RUN) |

## 4. Summary

Fill this in from the tables above. Do not estimate.

| | Android Emulator | iOS Simulator |
|---|---|---|
| UX scenarios executed / PASS | 0 of 26 executed | 2 of 26 executed: UX-09 PASS (by report); UX-26 partial (by report; landscape NOT RUN until W-22) |
| Unit tests PASS / total | One shared suite: Jest runs in Node, not on a device or emulator | 639 / 639 (run on macOS, 2026-11-24) |
| Known open defects | | |
