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
| Geocoding API | SMHI place-search API (permitted by the lab) | Decided (SPEC D-06); integration details unverified (SPEC §13.1) |
| Navigation | React Navigation, minimal packages | Decided (SPEC D-07); **not installed** |
| Persistence | `@react-native-async-storage/async-storage` | Decided (SPEC D-08); **not installed** |
| Unit testing | Jest + `jest-expo` | Decided (SPEC D-09); **not installed** |
| Cross-platform testing | Android Emulator (Windows), iOS Simulator (macOS) | Decided (SPEC D-12) |

Decided libraries are installed with `npx expo install` in the user story that first needs them, not before. Any library not in this table needs a decision entry in [SPEC.md §13](SPEC.md#13-decision-log) first.

## 5. Shared Expo Project Architecture

- One Expo project with Continuous Native Generation: the `android/` and `ios/` folders are generated and git-ignored.
- App configuration is in `app.json`. The entry point is `index.ts` → `App.tsx`.
- Source code will live in `src/`, following the MVVM layers in [STYLE.md §3–4](STYLE.md#3-mvvm-architecture).
- The same code runs on both platforms. Platform-specific code (`Platform.OS`, `*.ios.tsx` / `*.android.tsx`) is used only when needed and documented in the PR.

## 6. Development Environments

| | Developer 1 | Developer 2 |
|---|---|---|
| OS | Windows 11 | macOS |
| Test target | Android Emulator | iOS Simulator (Xcode) |
| AI coding assistant | Claude Code (told to read `agents/claude.md`) | OpenAI Codex (told to read `agents/codex.md`) |
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
2. Create a feature branch from `dev` ([GIT_WORKFLOW.md](GIT_WORKFLOW.md)).
3. Implement following STYLE.md, with AI assistance as described in §15.
4. Run `npx tsc --noEmit` (and tests, once configured). Test on your platform.
5. Open a pull request into `dev`. The other student reviews it and tests on their platform.
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
- Every commit, branch or PR should reference its Linear issue ID (e.g. `NIT-197`).
- The full identifier list (9 epics, NIT-152 – NIT-160, and 32 user stories, NIT-161 – NIT-192, with titles) is in [SPEC.md §11.2](SPEC.md#112-linear-identifiers-weather-app-project).
- Every requirement is mapped to its epic and user story in [SPEC.md §11](SPEC.md#11-requirement-tracking).

| Epic | Linear ID |
|---|---|
| Epic 1 – Project Setup & Architecture | NIT-152 |
| Epics 2–9 | NIT-153 – NIT-160 (epic titles: see Linear) |

## 11. External API Strategy

- **Weather: Open-Meteo** (SPEC D-05), a free REST/JSON API with no key.
- **Geocoding: SMHI place-search API** (SPEC D-06), permitted by the lab.
  - Before implementing `geocodingService`, verify the endpoint, the response format, the coverage and any terms or key requirements with real requests.
  - Open points: SPEC §13.1 OQ-01 – OQ-04.
- All requests go through `src/services/api/`, and all JSON is parsed in `src/parsers/` (STYLE.md §9–10).
- Respect each provider's terms of use and attribution requirements, and avoid unnecessary request frequency (caching, refresh interval).

## 12. Local Persistence Strategy

Planned, using `@react-native-async-storage/async-storage` (SPEC D-08) behind the `keyValueStorage` wrapper. Not installed yet.

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

> Copy the exact submission requirements and deadlines from the course page here. They are intentionally not guessed.

- [ ] Submission format and deadline: *TBD (from course page)*
- [ ] Oral examination date and format: *TBD (from course page)*
- [ ] Public GitHub repository link: https://github.com/XxNitXZ/Weatherly
- [ ] Documentation in `docs/` is up to date (SPEC, TEST_REPORT, LLM_PROCESS, REFLECTION)
- [ ] Both students can demonstrate the app on Android Emulator and iOS Simulator

## 15. AI Collaboration Workflow

| Tool | Operated by | Role |
|---|---|---|
| Claude Code | Developer 1 (Windows) | Implementation assistance inside the repository |
| OpenAI Codex | Developer 2 (macOS) | Implementation assistance inside the repository |
| ChatGPT | Both | Planning, review, prompt preparation |
| Students | — | Decide, review, test, and explain all code. Write the reflection. |

- **One rule set, two agent files.** [agents/claude.md](../agents/claude.md) (Claude Code) and [agents/codex.md](../agents/codex.md) (Codex) are identical below their introduction. Both point to SPEC.md, STYLE.md and CONTEXT.md as the single source of truth (SPEC D-13).
- **Loading is manual.** Claude Code normally auto-loads only a root `CLAUDE.md`, and Codex normally uses a root `AGENTS.md`. Neither exists in this project, so the files in `agents/` are not guaranteed to load. At the start of every session:
  - Developer 1 tells Claude Code: "Read `agents/claude.md` and follow it."
  - Developer 2 tells Codex: "Read `agents/codex.md` and follow it."
- Change project rules in `docs/`. Edit the two agent files only together, in the same pull request.
- AI sessions follow [SPEC.md §0](SPEC.md#0-ai-meta-instructions) and [STYLE.md §18](STYLE.md#18-ai-collaboration-guidelines).
- Code produced with one assistant is reviewed by the other student, who usually works with the other assistant and platform.
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
- `README.md` is the only Markdown file at the project root. Agent instructions live in `agents/` (`claude.md`, `codex.md`), and all other project documentation lives in `docs/` (SPEC D-11).
- Decided libraries are not installed until their implementation user story.
- See the full decision log in [SPEC.md §13](SPEC.md#13-decision-log).

## 18. Current Project State

Snapshot as of 2026-11-10. Update it when the state changes.

- The Expo SDK 58 TypeScript project is scaffolded (NIT-193). `tsc` and `expo-doctor` pass. The app has **not** yet been run on an emulator or simulator.
- The Git repository is initialised with `.gitignore` and `.gitattributes` (NIT-196, NIT-197).
- The public GitHub repository exists, with `main` and `dev` on the remote. On the Windows machine, local `dev` tracks `origin/dev`.
- Documentation structure created on branch `docs/NIT-164-project-documentation` (NIT-198, NIT-164). Not yet committed; awaiting student review.
- Technical decisions D-05 – D-09 and D-12 are confirmed. The SMHI place-search details are still to be verified.
- No weather functionality is implemented.
