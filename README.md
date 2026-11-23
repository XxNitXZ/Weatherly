# Weatherly

A cross-platform native weather app for Android and iOS, built with React Native, Expo and TypeScript.

Weatherly lets you search for any location by name or coordinates, see current conditions with hourly and seven-day forecasts, keep favourite places one tap away, and keep reading recently loaded weather when the network drops.

> **Status: early development.** The project is scaffolded and documented. **No weather features are implemented yet.** See [Current Development Status](#current-development-status).

---

## Course Context

Weatherly is the team project for **Lab B:2 – Building a Native Weather App** in **KTH HI1033 / CM2023**. It is developed by two students targeting the **higher grading level**, which emphasises clean architecture, deliberate naming, robust error handling and a consistent UI. Both students must be able to explain every design decision.

## Technologies

| | |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 58 · React Native 0.88 · React 19 |
| Language | TypeScript (strict mode) |
| Weather data | [Open-Meteo](https://open-meteo.com) REST API |
| Place search | SMHI place-search API |
| Libraries | React Navigation (native stack) · AsyncStorage (favourites) · Jest + `jest-expo` |
| Platforms | Android (Emulator on Windows) · iOS (Simulator on macOS) |
| Project management | Linear · GitHub |
| AI-assisted development | Claude Code in VS Code (both developers), following one rule set in `CLAUDE.md` |

## Planned Key Features

These features are planned and not yet implemented. Requirement IDs refer to [SPEC.md](SPEC.md).

- Search for locations by place name (geocoding) or by validated coordinates (W-01 – W-03)
- Current weather, hourly forecast for today and a seven-day forecast with day details (W-04 – W-07)
- Favourite locations with a quick-access screen (W-08, W-09)
- Settings for refresh interval and display preferences (W-10 – W-12)
- Local caching with offline fallback (W-16, W-17)
- Clear loading, network-error and API-error states (W-18 – W-20)
- Portrait and landscape layouts (W-22)

## Architecture Overview

Weatherly follows **MVVM** with a thin data layer:

```
View ──▶ ViewModel (hook) ──▶ Repository ──┬──▶ API service   (raw JSON)
                                           ├──▶ Parser        (raw JSON → typed model)
                                           └──▶ Local storage (cache, favourites, settings)
All layers use the typed Models.
```

| Layer | Responsibility | In the repository today |
|---|---|---|
| Views | Render state, forward user actions, own navigation | Folder only (`src/views/`) |
| ViewModels | Screen state (`LoadState<T>`), loading and error handling, user intents | [`src/viewmodels/loadState.ts`](src/viewmodels/loadState.ts) |
| Repositories | Combine service + parser; cache vs. network and offline fallback for weather | Folder only (planned: `locationRepository`, `weatherRepository`, …) |
| API services | HTTP requests only | Folder only (`src/services/api/`) |
| Parsers | Turn raw JSON into typed models | Folder only (`src/parsers/`) |
| Storage | Thin wrapper around AsyncStorage | Folder only (`src/storage/`) |
| Models | Plain TypeScript types | [`AppError`](src/models/AppError.ts), [`Coordinates` / `Location`](src/models/Location.ts) |

Only the three files linked above exist. All other modules are planned, and their contracts are described in [STYLE.md §3.1](STYLE.md#31-layer-contracts). The search-to-forecast data flow and navigation ownership are in [STYLE.md §3.2 – §3.3](STYLE.md#32-search-to-forecast-data-flow). Full rules: [STYLE.md](STYLE.md).

## Documentation

| Document | Purpose |
|---|---|
| [SPEC.md](SPEC.md) | Requirements (W-xx), tracking, decision log, AI rules |
| [STYLE.md](STYLE.md) | Architecture and coding conventions |
| [CONTEXT.md](CONTEXT.md) | Course, environment, workflow and constraints |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Branching, commits and pull requests |
| [TEST_REPORT.md](TEST_REPORT.md) | Unit tests and UX scenario results |
| [LLM_PROCESS.md](LLM_PROCESS.md) | Log of AI-assisted development |
| [REFLECTION.md](REFLECTION.md) | Student reflection |
| [CLAUDE.md](CLAUDE.md) | Agent instructions for Claude Code, loaded automatically; points to the docs above |
| [AGENTS.md](AGENTS.md) | Pointer to `CLAUDE.md` for tools that read `AGENTS.md` |

### AI-Assisted Development

Both developers use Claude Code in VS Code.
- The rules are kept in [CLAUDE.md](CLAUDE.md), which Claude Code loads automatically and which points to SPEC, STYLE and CONTEXT as the single source of truth. [AGENTS.md](AGENTS.md) only points to it.
- Until 2026-11-18, Developer 2 used OpenAI Codex with a copy of the rules in `agents/codex.md` (see D-13 and D-15 in the [SPEC.md decision log](SPEC.md#13-decision-log)).
- Every AI-assisted change is reviewed by the other student and logged in [LLM_PROCESS.md](LLM_PROCESS.md).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) LTS and npm
- [Git](https://git-scm.com)
- **Android:** [Android Studio](https://developer.android.com/studio) with an Android Virtual Device and the `ANDROID_HOME` environment variable set
- **iOS (macOS only):** [Xcode](https://developer.apple.com/xcode/) with an iOS Simulator runtime

### Installation

```bash
git clone https://github.com/XxNitXZ/Weatherly.git
cd Weatherly
npm ci
```

### Running the App

```bash
npm start          # start the Expo dev server
```

#### Android development (Windows, macOS or Linux)

Start an Android Virtual Device in Android Studio, then:

```bash
npm run android
```

#### iOS development (macOS only)

```bash
npm run ios
```

The app has been verified to start on the iOS Simulator (2026-11-18). The Android Emulator run is still pending. Results are recorded in [TEST_REPORT.md §1.1](TEST_REPORT.md#11-startup-smoke-test-us-0101-nit-161).

## Testing

```bash
npx tsc --noEmit   # type check
npx expo-doctor    # Expo project health check
```

Unit tests will use Jest with `jest-expo`, which is not configured yet (see the decision log in [SPEC.md](SPEC.md#13-decision-log)). UX scenarios for both platforms are defined in [TEST_REPORT.md](TEST_REPORT.md#3-ux-interaction-scenarios).

## Git Workflow

- `main`: stable releases
- `dev`: integration
- `feat/NIT-xxx-description`: one branch per Linear issue, created from `dev`

Pull requests target `dev`, and commits follow [Conventional Commits](https://www.conventionalcommits.org). Details: [GIT_WORKFLOW.md](GIT_WORKFLOW.md). One documented exception (direct work on `dev` for NIT-163) is described in [GIT_WORKFLOW.md §16](GIT_WORKFLOW.md#16-documented-exception-direct-work-on-dev-nit-163).

## Current Development Status

| Area | Status |
|---|---|
| Expo + TypeScript scaffold | Done |
| Git, GitHub, branching workflow | Done |
| Project documentation | Merged into `dev` (PR #1); moved to the repository root, not yet committed |
| MVVM architecture & folder structure (NIT-163) | In progress: folders, shared types and contracts created, not yet reviewed or committed |
| Weather features (W-01 – W-23) | Not started |
| Unit tests and UX scenarios | Not started |

Detailed per-requirement status: [SPEC.md §11](SPEC.md#11-requirement-tracking).
