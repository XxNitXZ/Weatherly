# Weatherly – Project Context

> The stable background for the project: who, what, with which tools, and under which constraints. Created in NIT-204.
> Requirements are in [SPEC.md](SPEC.md) and coding rules in [STYLE.md](STYLE.md). This file changes only when the context changes.

## 1. Course and Lab

| Item | Value |
|---|---|
| Course | KTH HI1033 / CM2023 |
| Lab | Lab B:2 – Building a Native Weather App |
| Grading target | Higher level – 2 points |
| Team | Two students, one shared repository |
| Linear project | Weather App |

## 2. Project Goal and Scope

**Goal:** build a native weather app for Android and iOS from one codebase. It must meet every mandatory Lab B:2 requirement and show higher-level software quality (see [SPEC.md §1–3](SPEC.md#1-project-goal)).

**In scope:**
- location search (by name and by coordinates)
- current, hourly (today) and seven-day forecasts, plus day details
- favourites
- settings (refresh interval, UI preferences)
- caching with offline fallback
- error and loading handling
- portrait and landscape support
- unit tests and at least 20 UX scenarios

**Out of scope:** user accounts, push notifications, weather maps/radar, a backend server, publishing to app stores.

## 3. Higher-Level Grading Criteria

As targeted by the team (see [SPEC.md §3 and §8](SPEC.md#8-quality-requirements-higher-level)):
- clear separation of responsibilities
- consistent and deliberate naming
- maintainable code
- a designed and consistent UI
- robust edge-case handling
- both students can explain the architectural decisions

## 4. Approved Technology Stack

| Area | Approved | Notes |
|---|---|---|
| Runtime / framework | Expo SDK 58, React Native 0.88, React 19 | Installed |
| Language | TypeScript 6.0, strict mode | Installed |
| Package manager | npm (with `package-lock.json`) | Use `npm ci` for clean installs |
| Weather API | Open-Meteo | Decided (SPEC D-05) |
| Geocoding API | Open-Meteo Geocoding API | Decided (SPEC D-24, supersedes D-06) |
| Navigation | React Navigation, minimal packages | Decided (SPEC D-07); **not installed** |
| Persistence | `@react-native-async-storage/async-storage` | Decided (SPEC D-08); installed in US-05.02 (NIT-177), 2.2.0 |
| Unit testing | Jest + `jest-expo` | Decided (SPEC D-09); installed as dev dependencies in US-02.01 (NIT-216). Run with `npm test`. |
| Cross-platform testing | Android Emulator (Windows), iOS Simulator (macOS) | Decided (SPEC D-12) |
| Safe areas | `react-native-safe-area-context` | Decided (SPEC D-26); installed in US-03.01 (NIT-169) |

Decided libraries are installed with `npx expo install` in the user story that first needs them, not before. Any library not in this table needs a decision entry in [SPEC.md §13](SPEC.md#13-decision-log) first.

## 5. Shared Expo Project Architecture

- One Expo project with Continuous Native Generation: the `android/` and `ios/` folders are generated and git-ignored.
- App configuration is in `app.json`. The entry point is `index.ts` → `App.tsx`.
- Source code lives in `src/`, following the MVVM layers in [STYLE.md §3–4](STYLE.md#3-mvvm-architecture). The folder structure exists. Which modules exist and which are still planned is tracked in one place: the status column of STYLE §3.1.
- The same code runs on both platforms. Platform-specific code (`Platform.OS`, `*.ios.tsx` / `*.android.tsx`) is used only when needed and documented in the PR.

## 6. Development Environments

| | Developer 1 | Developer 2 |
|---|---|---|
| OS | Windows 11 | macOS |
| Test target | Android Emulator | iOS Simulator (Xcode) |
| AI coding assistant | Claude Code in VS Code (loads `CLAUDE.md`) | Claude Code in VS Code (loads `CLAUDE.md`); used OpenAI Codex until 2026-11-18 |
| Node.js / npm | Node 24.13.0, npm 11.6.2 (observed 2026-11-10) | To be recorded |
| Git | 2.45.1 | To be recorded |
| GitHub | `XxNitXZ` (repository owner) | To be recorded |

Both developers:
- Use an editor with TypeScript support (VS Code recommended).
- Install dependencies with `npm ci`, never `npm install <pkg>` without a decision.
- Need Node.js LTS. Record version differences here if problems appear.

## 7. Android Emulator and iOS Simulator

**Android (Windows):**
- Requires Android Studio with an Android Virtual Device (AVD) and the Android SDK.
- The `ANDROID_HOME` environment variable and `platform-tools` on `PATH` are needed for `npm run android`.
- As of 2026-11-10, `ANDROID_HOME` was **not set** on the Windows machine, so the emulator setup is still pending.

**iOS (macOS):**
- Requires Xcode with an iOS Simulator runtime installed.
- `npm run ios` opens the app in the Simulator.
- iOS can only be built and simulated on macOS.

**Rule:** a feature is verified only after it has run on **both** targets (SPEC W-32). Results go in [TEST_REPORT.md](TEST_REPORT.md).

## 8. Team Development Workflow

1. Pick a Linear issue and move it to *In Progress*.
2. Work on the Epic's feature branch, created from `dev` (`feat/Epic-xx`, SPEC D-41; [GIT_WORKFLOW.md](GIT_WORKFLOW.md)). Push it after each finished user story. The one-off direct-on-`dev` exception in [GIT_WORKFLOW.md §16](GIT_WORKFLOW.md#16-documented-exception-direct-work-on-dev-nit-163) does not change this step for future work.
3. Implement following STYLE.md, with AI assistance as described in §15.
4. Run `npx tsc --noEmit` (and tests, once configured). Test on your platform.
5. When the whole Epic is done, open a pull request into `dev`. The other student reviews it and tests on their platform.
6. Merge, then update SPEC.md status, TEST_REPORT.md and LLM_PROCESS.md.
7. Complete the end-of-session checklist (§16).

## 9. GitHub Branching Strategy

| Item | Value |
|---|---|
| Repository | https://github.com/XxNitXZ/Weatherly (public) |
| `main` | Stable branch. Updated only by a PR from `dev` when `dev` is verified on both platforms. |
| `dev` | Integration branch. All feature PRs target `dev`. |
| `feat/*` | Feature branches, created from `dev`. Other prefixes are listed in GIT_WORKFLOW.md. |

There's no branch protection yet; it will be configured later. Never force-push `main` or `dev`. Details: [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

## 10. Linear Project Structure

- **Hierarchy:** Project *Weather App* → Epics → User Stories (`US-xx.yy`) → Tasks.
- Every commit and PR should reference its Linear issue ID (e.g. `NIT-197`); branches are named after their Epic (`feat/Epic-04`, SPEC D-41).
- The full identifier list (9 epics, NIT-152 – NIT-160, and 32 user stories, NIT-161 – NIT-192, with titles) is in [SPEC.md §11.2](SPEC.md#112-linear-identifiers-weather-app-project).
- Every requirement is mapped to its epic and user story in [SPEC.md §11](SPEC.md#11-requirement-tracking).

| Epic | Linear ID |
|---|---|
| Epic 1 – Project Setup & Architecture | NIT-152 |
| Epics 2–9 | NIT-153 – NIT-160 (epic titles: see Linear) |

## 11. External API Strategy

- **Weather: Open-Meteo** (SPEC D-05), a free REST/JSON API with no key.
- **Geocoding: Open-Meteo Geocoding API** (SPEC D-24), free and with no key.
  - The lab lists SMHI's place search and geocode.maps.co. The SMHI endpoint no longer exists (HTTP 404), and maps.co now requires an API key, so we deviate from the list; see D-24 and TEST_REPORT §1.3.
  - Requests use `language=sv` so Swedish spellings are found.
- All requests go through `src/services/api/`, and all JSON is parsed in `src/parsers/` (STYLE.md §9–10).
- Respect each provider's terms of use and attribution requirements, and avoid unnecessary request frequency (caching, refresh interval).

## 12. Local Persistence Strategy

Uses `@react-native-async-storage/async-storage` (SPEC D-08) behind the `keyValueStorage` wrapper (`src/storage/keyValueStorage.ts`, US-05.02). Favourites are stored under `weatherly:favorites` in a versioned format (SPEC D-38); the cache and settings are still planned.

| Data | Owner | Purpose |
|---|---|---|
| Last weather report per location + `fetchedAt` | `weatherRepository` | Cache and offline fallback (W-16, W-17) |
| Favourite locations | `favoritesRepository` | W-08, W-09 |
| Settings (refresh interval, UI preferences) | `settingsRepository` | W-10–W-12 |

All persisted values are re-validated when read (STYLE.md §11).

## 13. Testing Expectations

- Unit tests with Jest + `jest-expo` (SPEC D-09) for at least two required logic areas, with mutation evidence (W-24).
- At least 20 distinct UX scenarios, executed on Android Emulator and iOS Simulator (W-25, W-32).
- `npx tsc --noEmit` and `npx expo-doctor` pass before each PR.
- Untested items are recorded as `NOT RUN`. Results are never assumed.

## 14. Submission Requirements

**From the Lab B:2 instructions** (`Lab-B2-Weather.pdf`, read 2026-11-26). The dates are not in the PDF; copy them from the course page.

- **When:** at least one day before the scheduled presentation. Presentation date: *TBD (course page)*. Submission date: *TBD*.
- **What:** one document: a reflection report (about half a page: one thing that surprised you when building a networked app with AI assistance, and one thing you would do differently next time) that includes Appendices A – D. The code is not submitted separately; it is reviewed and discussed at the presentation.
  - **Appendix A – Test report** ([TEST_REPORT.md](TEST_REPORT.md)): which parts of the logic were tested, the test cases and their results, with the test files attached. Testing on a physical device or the official simulator/emulator; a browser preview does not count. At least 20 UX scenarios, each with starting state, action and expected result.
  - **Appendix B – README** ([README.md](README.md)): how the code is structured, so a reader understands the architecture before opening the project.
  - **Appendix C – SPEC** ([SPEC.md](SPEC.md)): requirement IDs, AI meta-instructions at the top, an end-of-session update log.
  - **Appendix D – LLM process log** ([LLM_PROCESS.md](LLM_PROCESS.md)): per session, the task given to the AI, what it produced, what was kept or changed, and where it helped or fell short. The lab's appendix adds: tools and context files used, a who-wrote-what table, 3 – 5 representative prompts with why each was chosen, AI mistakes and how they were handled, and a one-line-per-session work log. It also says the AI must never write this file for the student (SPEC OQ-09).
- **Presentation:** a demo of the running app, then questions from the 30-question list (SPEC §12); the first question is always Q26.
- **The final submission uses the real API**, not a test server.
- Public GitHub repository: https://github.com/XxNitXZ/Weatherly

### 14.1 Submission Checklist

Only the students tick these boxes.

**Reflection** (students only; the AI must not write it, SPEC §0 rule 9)
- [ ] About half a page in [REFLECTION.md](REFLECTION.md): one surprise, one thing to do differently. Private running notes deleted.

**Appendix A – [TEST_REPORT.md](TEST_REPORT.md) and `tests/`**
- [ ] At least 20 scenarios run on **both** the Android Emulator and the iOS Simulator (§3.2), with observations and evidence; everything else left as `NOT RUN`.
- [ ] Android rows: 0 of 35 run so far. iOS rows: 12 of 35 run so far (2026-11-26).
- [ ] §1: the AVD name and API level, the simulator model and iOS version, and the commit tested.
- [ ] `npm run check` run by a student on the submitted commit and added to §2.4.
- [ ] §0, §3.3 and §4 summaries agree with the tables.
- [ ] The `tests/` folder (with `fixtures/` and `helpers/`) attached.

**Appendix B – [README.md](README.md)**
- [ ] Still matches the code after the last merge (screens, layers, file names, test count).

**Appendix C – [SPEC.md](SPEC.md)**
- [ ] §0 at the top, requirement IDs, §14 change log up to date.
- [ ] §11 statuses set by the students; `VERIFIED` only after both platforms (§11, W-32).
- [ ] §12 answers and §12.1 tests: each student can open every code location and test.
- [ ] Open questions OQ-04, OQ-06, OQ-08, OQ-09 resolved or explained.

**Appendix D – [LLM_PROCESS.md](LLM_PROCESS.md)** (students; see SPEC OQ-09). Missing on 2026-11-26:
- [ ] §2 who-wrote-what table: empty (one row per module or document).
- [ ] 3 – 5 representative prompts, each with why it was chosen: no section yet.
- [ ] Work log, one line per session with date, what was done and approximate time: no section yet, and no session records its time.
- [ ] Context files loaded per session: only the agent-file field exists; SPEC, STYLE and CONTEXT are read at the start of every session (CLAUDE.md).
- [ ] Sessions without an entry: the 2026-11-26 Epic 8/9 session on `feat/NIT-159-160-rework` (no entry written, OQ-09), and any session after LLM-016.
- [ ] "Read and understood line by line" and the review fields in each entry, which only the students can fill in.
- [ ] §4 summary: empty.

**Repository and demo**
- [ ] Every Epic merged into `dev` through a pull request reviewed by the other student; `main` updated if the team releases.
- [ ] A clean `npm ci` and `npm start` on the submitted commit open the app on both platforms.
- [ ] No secrets or local config in the repository.
- [ ] Both students have practised the demo (§14.2) on their own platform.
- [ ] Submitted at least one day before the presentation.

### 14.2 Oral Demonstration Walkthrough

A suggested order for the demo (about 5 minutes), then Q26. Each step names the requirement, so a question can lead straight to the code.

**Before the presentation**
- Start the app on both platforms beforehand (§7; TEST_REPORT §3.0). Load a place once, so the start shows the cache.
- Know where to switch the network off (Airplane mode on Android; the Mac's Wi-Fi for the iOS Simulator) and how to rotate (emulator toolbar; ⌘← / ⌘→).
- Open in VS Code: SPEC.md at §0 and §11, and a terminal where `npm run check` can be run.

**Demo**
1. **Start (W-16, D-51):** close and reopen the app: a short spinner, then the last place and its weather without a search. Code: `restoreLastReport` in `useWeatherViewModel.ts`.
2. **Search by name (W-01, W-02):** search "Lund": places with region and country; choose one. Show the hero, "Rest of today" and the seven days, all from one request (W-04 – W-06).
3. **Coordinates (W-03, W-30):** enter latitude `95`: an inline error, no request. Then `59.33`, `18.07`: the weather loads.
4. **A day (W-07):** tap a day: the detail screen with precipitation, wind and sun; back.
5. **Favourites (W-08, W-09):** tap the star; open Favourites; choose the place. Restart the app: it is still saved.
6. **Settings (W-10 – W-12):** switch to °F and km/h: every temperature and wind speed changes, also on the day screen, without a reload.
7. **Rotation (W-22, D-50):** rotate Home and a day to landscape: the compact hero, everything reachable by scrolling, nothing reloads.
8. **Offline (W-17, W-18):** network off, pull to refresh: "No connection. Showing the weather from HH:MM." with "Try again"; network on, "Try again" updates it.
9. Optional, **race condition (W-23, Q12):** search "Lund" and at once "Kiruna": Kiruna's results stay.

**Then Q26 (always first):** SPEC §0 (the meta-instructions), then one requirement end to end, e.g. W-16: §6 → §7 "W-16 – Local caching" → §11 row → `weatherRepository.loadLastReport` → `tests/repositories/weatherRepository.test.ts` › "gives back the saved entry, as after a restart of the app" (SPEC §12, §12.1).

## 15. AI Collaboration Workflow

| Tool | Operated by | Role |
|---|---|---|
| Claude Code in VS Code | Developer 1 (Windows) and Developer 2 (macOS) | Implementation assistance inside the repository |
| ChatGPT | Both | Planning, review, prompt preparation |
| Students | — | Decide, review, test, and explain all code. Write the reflection. |

**History:** until 2026-11-18, Developer 1 used Claude Code (rules in `agents/claude.md`) and Developer 2 used OpenAI Codex (rules in `agents/codex.md`). Both files had to be read explicitly at the start of each session (SPEC D-11, D-13, both superseded by D-14 and D-15).

- **One rule set, one file.** [CLAUDE.md](CLAUDE.md) is the agent rule set and points to SPEC.md, STYLE.md and CONTEXT.md as the single source of truth (SPEC D-15). [AGENTS.md](AGENTS.md) only points to `CLAUDE.md` and holds no rules of its own.
- **Loading is automatic.** Claude Code loads the root `CLAUDE.md` at the start of every session. A developer may still ask Claude to re-read it.
- Change project rules in the root documentation (SPEC, STYLE, CONTEXT). Change `CLAUDE.md` only to point to or summarise them.
- AI sessions follow [SPEC.md §0](SPEC.md#0-ai-meta-instructions) and [STYLE.md §18](STYLE.md#18-ai-collaboration-guidelines).
- Code produced with Claude by one student is reviewed by the other student, who tests it on the other platform.
- Each session is logged in [LLM_PROCESS.md](LLM_PROCESS.md) with the assistant and the developer who operated it.

## 16. End-of-Session Checklist

Complete this at the end of every work session (AI-assisted or not):

- [ ] `npx tsc --noEmit` passes.
- [ ] Unit tests pass (once configured).
- [ ] The app was run on my platform (Android Emulator / iOS Simulator), or I noted that it was not.
- [ ] [SPEC.md](SPEC.md) updated: requirement statuses (§11), decisions (§13), change log (§14).
- [ ] [TEST_REPORT.md](TEST_REPORT.md) updated with actual results only.
- [ ] [LLM_PROCESS.md](LLM_PROCESS.md) entry written for any AI use.
- [ ] Linear issue status updated.
- [ ] Changes committed with a Conventional Commit message and pushed to my feature branch.
- [ ] No secrets, `.env` files or local config staged (`git status` reviewed).
- [ ] Open questions noted for my teammate.

## 17. Important Restrictions and Decisions

- Implement only the current user story or task. No speculative features.
- No unnecessary libraries. Each new dependency needs a decision entry.
- No secrets in the repository (it is public).
- Never claim untested results or unverified platform runs.
- Code and documentation are in English.
- All project Markdown files live at the repository root, including the agent instructions `CLAUDE.md` and `AGENTS.md` (SPEC D-14, superseding D-11).
- Decided libraries are not installed until their implementation user story.
- See the full decision log in [SPEC.md §13](SPEC.md#13-decision-log).

## 18. Current Project State

Update this section when the state changes.

**State on `dev`** (from `git log`, as of 2026-11-23):
- Project setup (Epic 1): Expo SDK 58 + TypeScript, Git and GitHub with `main`/`dev`, MVVM folder structure and shared types, project documentation. The app runs on the iOS Simulator (TEST_REPORT §1.1); the Android Emulator run is still open.
- Epic 2: weather models and `weatherParser`; `httpClient`, `weatherService` and `weatherRepository.getReport`; Open-Meteo geocoding with `locationRepository` and `useSearchViewModel`; coordinate validation and `useCoordinateSearchViewModel`.
- Epic 3 and the weather-first redesign (SPEC D-33, D-34), merged in PR #2: `HomeScreen` with header, weather hero, "Rest of today" and the seven-day forecast on a day/night sky; search in `LocationSearchSheet`.
- US-04.01 task NIT-229, merged early so Epic 5 can build on it: React Navigation with one native stack (D-35), `src/navigation/routes.ts`, `RootNavigator.tsx`, a minimal `DayDetailScreen`.

**Epic 4** (day details, SPEC D-35, D-36, D-41 – D-43) is on `dev` through a merge commit (`8c09dfc`, 2026-11-23); W-07 was set to VERIFIED by the students.

**Epic 6** (settings, refresh and units; SPEC D-44 – D-46) is on `dev` through a merge commit (2026-11-24):
- US-06.01 (NIT-179): `SettingsScreen` from the gear on Home; settings stored and shared by `SettingsProvider` (D-44); UX-14 reported to work.
- US-06.02 (NIT-180): stale weather refreshed when Home comes back into view or the app returns from the background (`isStale`, D-45); pull-to-refresh; failed-refresh notice with "Try again". UX-27 reported to work; UX-15 partly (the refresh after the interval was not waited out).
- US-06.03 (NIT-181): temperature (°C/°F) and wind (m/s, km/h) units on every screen (D-46); UX-16 reported to work.
- 697 unit tests pass; iOS export and Expo Doctor pass.

**In progress on `feat/EPIC-07`** (from `dev`, 2026-11-25): offline support and the cache (NIT-158). The scope was checked against the lab on 2026-11-25: one cache entry, the last viewed place restored at launch, and US-07.03 and US-07.04 reduced to a check of what Epic 2 and Epic 6 already built.
- US-07.01 (NIT-182) done: one cache entry, saved after each newest load, restored at the start (SPEC D-47); UX-28 reported to work, offline part with a screenshot.
- US-07.02 (NIT-183) done: a stale cache is refreshed at the start, a failed refresh shows a notice with the data's time or date, and no cache offline gives a message with "Try again" (SPEC D-48); UX-17 – UX-19 reported to work. Offline runs use `EXPO_OFFLINE=1 npx expo start --localhost`.
- US-07.03 (NIT-184) done: weather error texts name "Try again"; error-text audit in TEST_REPORT §1.18.
- US-07.04 (NIT-185) done: search and weather share `createLatestRequestGuard`; UX-23 and UX-29 reported to work.
- 757 unit tests pass; iOS export and Expo Doctor pass. PR into `dev` pending.

**Open checks:** every Android Emulator scenario; the on-screen iOS minus key for coordinates (TEST_REPORT §1.4).

**In progress on `feat/NIT-159-160-rework`** (from `dev` at `4cb3328`, uncommitted, Windows, 2026-11-26): Epic 8 (NIT-159) and the documentation part of Epic 9 (NIT-160). The earlier attempt on `feat/NIT-159-160-ui-testing` is left untouched and is not to be merged.
- US-08.01 (NIT-186): one pressed and one disabled opacity (`src/theme/interaction.ts`, SPEC D-49); disabled settings options are dimmed.
- US-08.02 (NIT-187): `"orientation": "default"`; `screenLayoutFor` (D-50); a stacked home header on narrow windows or with large text; compact heroes in short windows. One scrolling column everywhere, no two-column layout.
- US-08.03 (NIT-188): no welcome-panel flash at the start (`isCacheChecked`, `homeContentFor`, D-51); a loading line on Settings.
- Epic 9: README rewritten as Appendix B; TEST_REPORT with an Appendix A summary, run instructions, 35 scenarios and a status overview; SPEC traceability corrected, §12.1 tests per question, OQ-09; the checklist and demo walkthrough in §14.
- 800 unit tests pass; Android and iOS exports and Expo Doctor (20/20) pass. Nothing has been run on a device yet (TEST_REPORT §1.20).

**Epic 5 phase 1** (favourites logic and persistence, US-05.01 without the star and US-05.02; SPEC D-37 – D-39) is on `dev` through PR #3 (`9d90de1`).

**In progress on `feat/NIT-178-favorites-screen`** (from `dev` at `9d90de1`, uncommitted, 2026-11-23):
- the star and a favourites button in the home header (NIT-239);
- `FavoritesScreen`, the `Favorites` route and the return of a chosen place to Home (US-05.03);
- reading the favourites again on focus, and storage reads and writes in order (SPEC D-40).

Automated checks pass; nothing has been run on a device yet. Developer 2's NIT-230 commit (`1bdc00b` on `feat/Epic-04`) is not merged into `dev`; both change the `HomeScreen` signature, so expect a small conflict there. On 2026-11-23 `ANDROID_HOME` was still not set on the Windows machine.

Which modules exist is tracked in STYLE §3.1; requirement status in SPEC §11.
