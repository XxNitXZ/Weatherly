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
| Host OS | Windows 11 | macOS (version TBD) |
| Target | Android Emulator – AVD name/API level: *TBD* | iOS Simulator – device/iOS version: *TBD* |
| Tester | | |
| App commit tested | | |

## 2. Automated Unit Tests

**Test framework:** Jest + `jest-expo` (SPEC D-09). Not installed or configured yet, so no unit tests exist and none have run.
**Command (once configured):** `npm test`

### 2.1 Test Categories

At least two areas are required (W-24).

| Category | Module (planned) | Requirement(s) | Selected? |
|---|---|---|---|
| Coordinate validation | `src/utils/coordinateValidation.ts` | W-03 | |
| Weather JSON parsing | `src/parsers/weatherParser.ts` | W-14, W-15, W-19 | |
| Geocoding JSON parsing | `src/parsers/geocodingParser.ts` | W-02, W-14, W-19 | |
| Refresh / staleness policy | `src/utils/refreshPolicy.ts` | W-11, W-16 | |
| Unit conversion | `src/utils/units.ts` | W-12 | |

### 2.2 Test Cases

Planned cases are listed as a starting point. Adjust the names to match the real tests when they are written.

| Test name | Req. | Input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| coordinateValidation › accepts valid coordinates | W-03 | `59.33, 18.07` | valid | | NOT RUN |
| coordinateValidation › accepts boundary values | W-03 | `90, 180` and `-90, -180` | valid | | NOT RUN |
| coordinateValidation › rejects out-of-range latitude | W-03 | `90.0001, 0` | invalid, latitude error | | NOT RUN |
| coordinateValidation › rejects out-of-range longitude | W-03 | `0, -180.5` | invalid, longitude error | | NOT RUN |
| coordinateValidation › rejects non-numeric input | W-03 | `"abc", ""` | invalid | | NOT RUN |
| weatherParser › parses a valid response | W-14, W-15 | valid API fixture | typed `WeatherReport` with 7 daily entries | | NOT RUN |
| weatherParser › rejects a missing required field | W-19 | fixture without current temperature | throws `AppError('parse')` | | NOT RUN |
| weatherParser › rejects a wrong field type | W-19 | temperature as string | throws `AppError('parse')` | | NOT RUN |
| geocodingParser › parses results | W-02 | valid fixture | list of `Location` | | NOT RUN |
| geocodingParser › handles empty results | W-01, W-02 | fixture with no results | empty list | | NOT RUN |
| refreshPolicy › fresh data is not stale | W-11 | fetched 5 min ago, interval 15 min | `false` | | NOT RUN |
| refreshPolicy › old data is stale | W-11 | fetched 20 min ago, interval 15 min | `true` | | NOT RUN |
| refreshPolicy › exact boundary | W-11 | fetched exactly 15 min ago, interval 15 min | as defined in SPEC W-11 (document the rule) | | NOT RUN |

### 2.3 Mutation Test Evidence

For each tested category: deliberately introduce one fault, run the tests, confirm at least one fails, then revert.

| Category | Mutation introduced | Test(s) that failed | Reverted? | Date | Status |
|---|---|---|---|---|---|
| | e.g. changed `<= 90` to `< 90` | | | | NOT RUN |
| | | | | | NOT RUN |

### 2.4 Run History

| Date | Commit | Command | Total | Passed | Failed | Tester |
|---|---|---|---|---|---|---|
| | | | | | | |

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
| Unit tests PASS / total | not configured | not configured |
| Known open defects | | |
