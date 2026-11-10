# Weatherly – Git Workflow

> Team Git, commit and pull-request conventions. Created in NIT-198 (US-01.02, NIT-162).

Repository: **https://github.com/XxNitXZ/Weatherly** (public)

## 1. Branch Model

| Branch | Purpose | Updated by |
|---|---|---|
| `main` | Stable, demonstrable version. Every commit on `main` has been verified on Android and iOS. | PR from `dev` only |
| `dev` | Integration branch. It builds and type-checks at all times. | PRs from work branches |
| `feat/*` and other work branches | One Linear issue (task or small story) per branch | The developer who owns it |

```
main ─────────────●──────────────────●──────▶   (releases from dev)
                 ╱                  ╱
dev  ──●───●────●───●────●────────●─────────▶   (integration)
        ╲     ╱      ╲      ╱
feat/…   ●──●         ●──●                      (one issue each)
```

## 2. First-Time Setup (clone)

Windows (PowerShell or Git Bash) and macOS (Terminal) use the same commands:

```bash
git clone https://github.com/XxNitXZ/Weatherly.git
cd Weatherly
git switch dev          # creates local dev tracking origin/dev
npm ci                  # clean install exactly as in package-lock.json
npx tsc --noEmit        # sanity check
```

Use `npm ci` rather than `npm install`. It installs exactly the locked versions and never changes `package-lock.json`.

Check your Git identity once per machine:

```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

> The repository is public, so commit author emails are public. To keep your address private, use your GitHub *noreply* address (GitHub → Settings → Emails).

## 3. Working on Windows and macOS

- **Line endings:** `.gitattributes` stores all text files with LF and checks them out with LF on both systems. No per-machine `core.autocrlf` changes are needed. Do not commit line-ending-only changes. If `git status` shows unexpected modified files after cloning, run `git add --renormalize .` and ask your teammate before committing.
- **Paths:** use forward slashes in code and imports. File names are case-sensitive on CI and macOS but not on Windows, so never rename a file by changing only its case without `git mv`.
- **Platform testing:** the Windows developer tests on the Android Emulator and the macOS developer on the iOS Simulator. A PR states which platform it was tested on.
- **Generated folders:** `android/`, `ios/`, `node_modules/` and `.expo/` are git-ignored. Never commit them.

## 4. Branch Naming

```
<type>/<linear-id>-<short-kebab-description>
```

| Type | Use for | Example |
|---|---|---|
| `feat/` | New functionality | `feat/NIT-xxx-place-name-search` |
| `fix/` | Bug fixes | `fix/NIT-xxx-offline-banner-overlap` |
| `docs/` | Documentation only | `docs/NIT-164-project-documentation` |
| `chore/` | Tooling, config, dependencies | `chore/NIT-xxx-add-jest` |
| `test/` | Tests only | `test/NIT-xxx-parser-tests` |

`feat/*` is the default. Use the other prefixes only when the change is purely of that type. Replace `NIT-xxx` with the real Linear issue ID.

## 5. Starting Work

```bash
git switch dev
git pull --ff-only                          # make sure dev is up to date
git switch -c feat/NIT-xxx-short-description
```

Keep branches short-lived (a few days at most) and focused on one Linear issue.

## 6. Commit Messages (Conventional Commits)

```
<type>(<optional scope>): <imperative summary, max ~72 chars>

<optional body: what and why>

Refs: NIT-xxx
```

**Types:** `feat`, `fix`, `docs`, `style` (formatting only), `refactor`, `test`, `chore`, `build`, `ci`, `perf`.
**Scopes (optional):** `search`, `weather`, `favorites`, `settings`, `api`, `parser`, `cache`, `ui`, `docs`.

Examples:

```
chore: initialize Weatherly Expo project
chore: configure cross-platform Git line endings
docs: add SPEC, STYLE and CONTEXT documentation
feat(search): add place-name search view model
feat(parser): parse Open-Meteo daily forecast into DailyForecast
fix(cache): fall back to cached report when request times out
test(parser): cover missing temperature field
refactor(api): extract shared getJson helper
```

Rules:
- Use the imperative mood ("add", not "added"), lowercase type, no trailing period.
- One logical change per commit. Formatting-only changes go in separate commits.
- Never commit code that fails `npx tsc --noEmit`.

## 7. Pushing a Work Branch

```bash
git push -u origin feat/NIT-xxx-short-description   # first push, sets upstream
git push                                            # later pushes
```

## 8. Pull Requests

**Target:** always `dev`. The only PR into `main` is a release PR from `dev` (see §10).

**Title:** Conventional Commit style, e.g. `feat(search): place-name search (NIT-xxx)`.

**Description template** (copy into every PR):

```markdown
## What
Short description of the change.

## Why
Linear: NIT-xxx · Requirements: W-xx, W-yy

## How tested
- [ ] `npx tsc --noEmit`
- [ ] Unit tests (if configured)
- [ ] Android Emulator (Windows) – scenarios: UX-xx
- [ ] iOS Simulator (macOS) – scenarios: UX-xx

## AI usage
Assistant: Claude Code / OpenAI Codex / none · LLM_PROCESS entry: LLM-xxx

## Docs
- [ ] SPEC.md status/decisions updated
- [ ] TEST_REPORT.md updated with actual results
- [ ] LLM_PROCESS.md entry added (if AI was used)

## Notes for reviewer
Anything non-obvious, open questions, screenshots (real ones only).
```

## 9. Review and Merge

1. The **other** student reviews the PR using the checklist in [STYLE.md §17](STYLE.md#17-code-review--documentation-rules).
2. The reviewer checks out the branch and runs it on their own platform when the change affects the UI or behaviour:
   ```bash
   git fetch origin
   git switch feat/NIT-xxx-short-description
   npm ci            # only if package-lock.json changed
   ```
3. The reviewer leaves comments. The author pushes fixes as new commits (no force-push).
4. When the review is approved and checks pass, merge into `dev` with **Squash and merge**, giving one clean Conventional Commit per issue on `dev`.
5. Delete the remote branch after merging (GitHub button), and locally:
   ```bash
   git switch dev
   git pull --ff-only
   git branch -d feat/NIT-xxx-short-description
   ```

## 10. Keeping `main` Stable (Releases)

- Open a PR from `dev` → `main` only when every requirement merged since the last release has been verified on **both** the Android Emulator and the iOS Simulator.
- Merge `dev` → `main` with **Create a merge commit**, so `dev` and `main` keep a shared history.
- Never commit directly to `main`.

## 11. Updating Your Branch

Bring the latest `dev` into your work branch, preferably by merging so no force-push is needed:

```bash
git switch dev
git pull --ff-only
git switch feat/NIT-xxx-short-description
git merge dev
```

## 12. Handling Merge Conflicts

1. Git lists the conflicted files after `git merge dev`. Open each one and look for `<<<<<<<`, `=======` and `>>>>>>>`.
2. Decide the correct combined result, ideally together with your teammate if it touches their code.
3. Remove the markers, then:
   ```bash
   npx tsc --noEmit
   git add <file>
   git commit            # completes the merge
   ```
4. For conflicts in `package-lock.json`, take the `dev` version, re-apply your dependency change with `npx expo install <pkg>`, and commit the regenerated lockfile.
5. If unsure, abort with `git merge --abort` and ask.

## 13. Forbidden and Risky Operations

- **No force-pushes** (`git push --force` / `-f`) to `main` or `dev`, ever. Avoid force-pushing shared work branches too. Prefer new commits over rewriting history.
- No `git reset --hard` or `git rebase` on commits that are already pushed and shared.
- No committing directly to `main` or `dev`.
- No deleting other people's branches without asking.

## 14. Secrets and the Public Repository

The repository is **public**. Anything committed is visible forever, even after deletion.

- Never commit API keys, tokens, passwords, keystores (`*.jks`), certificates (`*.p8`, `*.p12`, `*.pem`, `*.key`) or `.env` files. These are git-ignored, but always review `git status` and `git diff --staged` before committing.
- Open-Meteo needs no key. Whether the SMHI place search needs one is still unverified (SPEC OQ-04). If a key is needed, use an ignored `.env` file and document the variable names (not their values) in CONTEXT.md.
- If a secret is committed, **revoke it immediately** at the provider and tell your teammate. Rewriting history does not make a leaked secret safe again.
- Do not commit personal machine paths, editor settings with personal data, or local logs.

## 15. AI Assistants and Git

Developer 1 uses Claude Code and Developer 2 uses OpenAI Codex. Both assistants follow this workflow through the shared rules in `agents/claude.md` and `agents/codex.md`. Each developer tells their assistant to read its file at the start of every session.

- Assistants work on the current work branch only. They never commit to `main` or `dev` and never force-push.
- Assistants commit or push only when the operating student asks. The student reviews `git diff` before every commit.
- The PR description names the assistant used and links the LLM_PROCESS.md entry.
- `agents/claude.md` and `agents/codex.md` are changed together in the same PR, so the two rule sets never diverge.
- Assistant-specific local files (personal settings, caches, credentials) are never committed.
