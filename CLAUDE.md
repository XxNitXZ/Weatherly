# Agent Instructions – Claude Code

For **Claude Code in VS Code**, used by both developers: Developer 1 (Windows, Android Emulator) and Developer 2 (macOS, iOS Simulator). [AGENTS.md](AGENTS.md) only points to this file; this file is the single agent rule set (SPEC D-15).

Weatherly is a React Native + Expo SDK 58 + TypeScript weather app (KTH Lab B:2, higher level), built by two students. Both students use the same AI assistant and follow the same project documentation.

## How this file is loaded

Claude Code loads a root `CLAUDE.md` automatically at the start of every session. No explicit "read this file" instruction is needed, but a developer may still ask Claude to re-read it.

History: until 2026-11-18 the agent instructions lived in `agents/claude.md` (Claude Code) and `agents/codex.md` (OpenAI Codex) and had to be read explicitly (SPEC D-11, D-13, both superseded).

## Start of every session

Read these files before doing any work. They are the source of truth:

1. [SPEC.md](SPEC.md): requirements (W-xx), AI meta-instructions (§0), decision log
2. [STYLE.md](STYLE.md): MVVM architecture, naming and coding conventions
3. [CONTEXT.md](CONTEXT.md): course, environment, workflow and constraints

If a request conflicts with these documents, stop and point out the conflict.

## Rules

1. **Scope:** work only on the Linear user story and task named in the request. Never implement unrelated user stories.
2. **Stack:** React Native, Expo SDK 58, TypeScript in strict mode (no `any`; STYLE.md §2). Add a package only if SPEC.md §13 approves it, using `npx expo install`.
3. **Architecture:** follow MVVM as defined in STYLE.md §3.
   - Networking goes in `services/api`, JSON parsing in `parsers`, state in ViewModel hooks, storage in `repositories` and `storage`, and UI in `views`.
   - Navigation stays out of ViewModels.
4. **Naming:** follow STYLE.md §5.
5. **Simplicity:** no unnecessary libraries or abstractions (STYLE.md §16).
6. **Testing:** follow STYLE.md §13 and SPEC.md §9. Run `npx tsc --noEmit` before handing work back. Record only real results in [TEST_REPORT.md](TEST_REPORT.md).
7. **Requirements:** never mark a requirement complete or `VERIFIED`. Only the students do that, after verification.
8. **Evidence:** never invent test results. Never claim an Android Emulator or iOS Simulator run without evidence from that run.
9. **Reflection:** never write or edit the students' personal reflection ([REFLECTION.md](REFLECTION.md)).
10. **Git:**
    - Follow [GIT_WORKFLOW.md](GIT_WORKFLOW.md): work on a branch created from `dev`, and open pull requests into `dev`.
    - Never commit directly to `main` or `dev`, and never force-push. The only exception is the one-off direct-on-`dev` step documented in [GIT_WORKFLOW.md §16](GIT_WORKFLOW.md#16-documented-exception-direct-work-on-dev-nit-163); it does not extend to any other work.
    - Commit or push only when a student asks.
11. **Explain:** explain important implementation and architecture decisions so the students can defend them.
12. **Language:** source code and documentation are in English.
13. **Docs location:** all project Markdown files live at the repository root (SPEC D-14). Do not create a `docs/` or `agents/` folder.
14. **End of session:**
    - Write the session entry in [LLM_PROCESS.md](LLM_PROCESS.md) (SPEC D-21). Number it sequentially and follow the template in LLM_PROCESS.md §3.
      - Base it only on what actually happened in the session.
      - Leave a field empty if you cannot know its value, such as "Read and understood line by line".
      - Do not add a note about who wrote the entry.
    - Remind the students to complete the checklist in CONTEXT.md §16.
