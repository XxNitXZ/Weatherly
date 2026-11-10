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
| Planned libraries | React Navigation · AsyncStorage · Jest + `jest-expo` *(chosen, not yet installed)* |
| Platforms | Android (Emulator on Windows) · iOS (Simulator on macOS) |
| Project management | Linear · GitHub |
| AI-assisted development | Claude Code (Windows) · OpenAI Codex (macOS), both following one shared rule set |

## Planned Key Features

These features are planned and not yet implemented. Requirement IDs refer to [docs/SPEC.md](docs/SPEC.md).

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
View  ──▶  ViewModel (hooks)  ──▶  Repository  ──▶  API service ──▶ Parser ──▶ Model
                                       └──────▶  Local storage
```

| Layer | Responsibility |
|---|---|
| Views | Render state and forward user actions |
| ViewModels | Screen state, loading and error handling, user intents |
| Repositories | Cache vs. network decisions, offline fallback |
| API services | HTTP requests only |
| Parsers | Turn raw JSON into typed models |
| Models | Plain TypeScript types |

Full rules: [docs/STYLE.md](docs/STYLE.md).

## Documentation

| Document | Purpose |
|---|---|
| [SPEC.md](docs/SPEC.md) | Requirements (W-xx), tracking, decision log, AI rules |
| [STYLE.md](docs/STYLE.md) | Architecture and coding conventions |
| [CONTEXT.md](docs/CONTEXT.md) | Course, environment, workflow and constraints |
| [GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) | Branching, commits and pull requests |
| [TEST_REPORT.md](docs/TEST_REPORT.md) | Unit tests and UX scenario results |
| [LLM_PROCESS.md](docs/LLM_PROCESS.md) | Log of AI-assisted development |
| [REFLECTION.md](docs/REFLECTION.md) | Student reflection |
| [agents/claude.md](agents/claude.md) · [agents/codex.md](agents/codex.md) | Identical instructions for Claude Code and OpenAI Codex that point to the docs above |

### AI-Assisted Development

The two developers use different AI coding assistants: Claude Code on Windows and OpenAI Codex on macOS.
- Both follow the same rules, kept in [agents/claude.md](agents/claude.md) and [agents/codex.md](agents/codex.md), which point to `docs/` as the single source of truth.
- These files are **not** loaded automatically: each developer tells their assistant to read its file at the start of every session.
- Every AI-assisted change is reviewed by the other student and logged in [LLM_PROCESS.md](docs/LLM_PROCESS.md).

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

The app has not yet been verified on either emulator or simulator. Results will be recorded in [TEST_REPORT.md](docs/TEST_REPORT.md).

## Testing

```bash
npx tsc --noEmit   # type check
npx expo-doctor    # Expo project health check
```

Unit tests will use Jest with `jest-expo`, which is not configured yet (see the decision log in [SPEC.md](docs/SPEC.md#13-decision-log)). UX scenarios for both platforms are defined in [TEST_REPORT.md](docs/TEST_REPORT.md#3-ux-interaction-scenarios).

## Git Workflow

- `main`: stable releases
- `dev`: integration
- `feat/NIT-xxx-description`: one branch per Linear issue, created from `dev`

Pull requests target `dev`, and commits follow [Conventional Commits](https://www.conventionalcommits.org). Details: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md).

## Current Development Status

| Area | Status |
|---|---|
| Expo + TypeScript scaffold | Done |
| Git, GitHub, branching workflow | Done |
| Project documentation | In review |
| Weather features (W-01 – W-23) | Not started |
| Unit tests and UX scenarios | Not started |

Detailed per-requirement status: [SPEC.md §11](docs/SPEC.md#11-requirement-tracking).
