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

## 2. Automated Unit Tests

**Test framework:** Jest + `jest-expo` (SPEC D-09), installed in US-02.01 (NIT-216). Test files live in the root `tests/` folder (SPEC D-23).
**Command:** `npm test`

### 2.1 Test Categories

W-24 requires at least two of the lab's three areas: **JSON parsing**, **error-state logic** and **data transformation**. Our plan is JSON parsing plus error-state logic or data transformation. The other categories are optional extras and do not count toward the two.

| Category | Lab area | Module (planned) | Requirement(s) | Selected? |
|---|---|---|---|---|
| Weather JSON parsing | JSON parsing | `src/parsers/weatherParser.ts` | W-14, W-15, W-19 | yes |
| Geocoding JSON parsing | JSON parsing | `src/parsers/geocodingParser.ts` | W-02, W-14, W-19 | |
| HTTP outcome → `AppError` kind | Error-state logic (data layer) | `src/services/api/httpClient.ts` | W-18, W-19, W-23 | yes |
| Result/error → `LoadState` mapping | Error-state logic (ViewModel) | decided with the first ViewModel | W-17, W-18, W-19 | |
| Forecast request URL | (extra) | `src/services/api/weatherService.ts` | W-13 | |
| Hourly/daily grouping | Data transformation | decided in US-03.03 / US-03.04 | W-05, W-06 | |
| Unit conversion | Data transformation | `src/utils/units.ts` | W-12 | |
| Coordinate validation | (extra) | `src/utils/coordinateValidation.ts` | W-03 | |
| Refresh / staleness policy | (extra) | `src/utils/refreshPolicy.ts` | W-11, W-16 | |

### 2.2 Test Cases

Planned cases are listed as a starting point. Adjust the names to match the real tests when they are written.

| Test name | Req. | Input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| coordinateValidation › accepts valid coordinates | W-03 | `59.33, 18.07` | valid | | NOT RUN |
| coordinateValidation › accepts boundary values | W-03 | `90, 180` and `-90, -180` | valid | | NOT RUN |
| coordinateValidation › rejects out-of-range latitude | W-03 | `90.0001, 0` | invalid, latitude error | | NOT RUN |
| coordinateValidation › rejects out-of-range longitude | W-03 | `0, -180.5` | invalid, longitude error | | NOT RUN |
| coordinateValidation › rejects non-numeric input | W-03 | `"abc", ""` | invalid | | NOT RUN |
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
| | | | | | NOT RUN |

### 2.4 Run History

| Date | Commit | Command | Total | Passed | Failed | Tester |
|---|---|---|---|---|---|---|
| 2026-11-20 | uncommitted, on `weather-models-parser` after `580b309` | `npm test` | 17 | 17 | 0 | Claude Code (session with Tyrone Asante) |
| 2026-11-20 | uncommitted, on `feat/implement-weather-rest-api` after `5089da9` | `npm run check` | 36 | 36 | 0 | Claude Code (session with Tyrone Asante) |

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
| UX-09 | iOS Simulator (macOS) | | | | NOT RUN |
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
| UX scenarios executed / PASS | 0 of 25 executed | 0 of 25 executed |
| Unit tests PASS / total | One shared suite: Jest runs in Node, not on a device or emulator | 36 / 36 (run on macOS, 2026-11-20) |
| Known open defects | | |
