# Agent Instructions – Claude Code

For **Claude Code**, operated by Developer 1 (Windows, Android Emulator). OpenAI Codex reads the same rules from [codex.md](codex.md). Both files must stay identical below this line; change them together in the same pull request.

Weatherly is a React Native + Expo SDK 58 + TypeScript weather app (KTH Lab B:2, higher level), built by two students. Each student uses a different AI assistant, and both assistants follow the same project documentation.

## How this file is loaded

This file is **not loaded automatically**. Claude Code auto-loads a root `CLAUDE.md`, and Codex uses a root `AGENTS.md`, but this project keeps its agent instructions in `agents/` instead. At the start of every session, the developer must tell the assistant explicitly:

- Developer 1 (Claude Code): "Read `agents/claude.md` and follow it."
- Developer 2 (Codex): "Read `agents/codex.md` and follow it."

## Start of every session

After reading this file, read these files before doing any work. They are the source of truth:

1. [docs/SPEC.md](../docs/SPEC.md): requirements (W-xx), AI meta-instructions (§0), decision log
2. [docs/STYLE.md](../docs/STYLE.md): MVVM architecture, naming and coding conventions
3. [docs/CONTEXT.md](../docs/CONTEXT.md): course, environment, workflow and constraints

If a request conflicts with these documents, stop and point out the conflict.

## Rules

1. **Scope:** work only on the Linear user story and task named in the request. Never implement unrelated user stories.
2. **Stack:** React Native, Expo SDK 58, TypeScript in strict mode (no `any`; STYLE.md §2). Add a package only if SPEC.md §13 approves it, using `npx expo install`.
3. **Architecture:** follow MVVM as defined in STYLE.md §3.
   - Networking goes in `services/api`, JSON parsing in `parsers`, state in ViewModel hooks, storage in `repositories` and `storage`, and UI in `views`.
   - Navigation stays out of ViewModels.
4. **Naming:** follow STYLE.md §5.
5. **Simplicity:** no unnecessary libraries or abstractions (STYLE.md §16).
6. **Testing:** follow STYLE.md §13 and SPEC.md §9. Run `npx tsc --noEmit` before handing work back. Record only real results in [docs/TEST_REPORT.md](../docs/TEST_REPORT.md).
7. **Requirements:** never mark a requirement complete or `VERIFIED`. Only the students do that, after verification.
8. **Evidence:** never invent test results. Never claim an Android Emulator or iOS Simulator run without evidence from that run.
9. **Reflection:** never write or edit the students' personal reflection (`docs/REFLECTION.md`).
10. **Git:**
    - Follow [docs/GIT_WORKFLOW.md](../docs/GIT_WORKFLOW.md): work on a branch created from `dev`, and open pull requests into `dev`.
    - Never commit directly to `main` or `dev`, and never force-push.
    - Commit or push only when a student asks.
11. **Explain:** explain important implementation and architecture decisions so the students can defend them.
12. **Language:** source code and documentation are in English.
13. **Docs location:** `README.md` is the only Markdown file at the root. Agent instructions live in `agents/`, and all other documentation goes in `docs/`.
14. **End of session:** remind the students to:
    - log the actual AI interaction in [docs/LLM_PROCESS.md](../docs/LLM_PROCESS.md)
    - complete the checklist in CONTEXT.md §16
