# Weatherly – Submission and Oral Exam Preparation

> Preparation material for US-09.04 (NIT-192), drafted by the AI assistant (SPEC D-51) for the students to check and use.
>
> It is **not** the reflection. The lab says the AI must not write `REFLECTION.md`, not even if asked, and may only suggest questions (Lab-B2-Weather.pdf, appendix §5). The questions in §3 are therefore questions only.
>
> Every checkbox stays open until a student confirms it.

Source of the requirements below: `Lab-B2-Weather.pdf` (the course's Lab B:2 instructions, read 2026-11-26), p. 1 "General", the "Detailed requirements", "Grading criteria" and the appendix "Using .md Context Files". The PDF is not in the repository.

## 1. What is submitted (from the lab instructions)

- [ ] **One document**: the reflection report (about half a page) with **four appendices, A–D**. The code is not submitted separately; it is reviewed at the oral presentation.
- [ ] **Submitted at least one day before** the scheduled presentation. Date of the presentation: *student fills in*. Submission date: *student fills in*.
- [ ] The final app uses the **real API**, not the KTH test server (Weatherly uses Open-Meteo directly).

| Part | Lab requirement | Our file | State on 2026-11-26 | Student action |
|---|---|---|---|---|
| Reflection report | ~half a page: one thing that surprised you when building a networked app with AI assistance, and one thing you would do differently next time | [REFLECTION.md](REFLECTION.md) | Template only; no text | Write it yourselves (§3) |
| Appendix A – Test report | Which logic was tested, which test cases, the results; attach the test files; testing on a physical device or the official simulator/emulator (a browser preview does not count); at least 20 UX scenarios with starting state, action and expected result | [TEST_REPORT.md](TEST_REPORT.md) and the `tests/` folder | Short summary in §0; 775 unit tests passing (Windows, 2026-11-26); 34 UX scenarios defined with step-by-step run instructions for both platforms (§3.0); iOS Simulator results for some by report; **Android Emulator: none run** | Re-run `npm run check` yourselves; run the UX scenarios on both platforms and record what you saw (§3.2 and §3.3 of the report) |
| Appendix B – README.md | How the code is structured: main files, their responsibilities, how the layers connect | [README.md](README.md) | Rewritten in this session from the actual code | Read it and correct anything you would explain differently |
| Appendix C – SPEC.md | Requirement IDs, AI meta-instructions at the top, end-of-session update log | [SPEC.md](SPEC.md) | IDs W-01–W-34, §0 meta-instructions, §14 change log, §12 oral exam map | Check the statuses; only you may set `VERIFIED` |
| Appendix D – LLM_PROCESS.md | Per session: the task given to the AI, what it produced, what you kept or changed, where it helped or fell short | [LLM_PROCESS.md](LLM_PROCESS.md) | Entries LLM-001 – LLM-017 written by the AI as source material (SPEC D-21); **who-wrote-what table empty** | See the note below |

**Note on Appendix D (decision needed: SPEC OQ-09).** The lab's appendix says: *"The AI must NEVER write this file for the student"*. It asks for:
- the tools and context files used per session
- a who-wrote-what table
- 3–5 representative prompts, with why each was chosen
- AI mistakes and how you handled them
- a one-line work log per session

In LLM-003 the team kept the AI-written entries as a source and decided that the students write the final hand-in version. Before submitting, the students must:
- [ ] write or rewrite the submitted LLM_PROCESS.md themselves, using the AI entries only as notes
- [ ] fill in the who-wrote-what table
- [ ] choose the 3–5 prompts

**Other points to mention in the submission:**
- [ ] All Markdown files are at the repository root, not in `docs/` as the lab's example suggests (SPEC D-14).
- [ ] Place search uses Open-Meteo Geocoding instead of the lab's SMHI or geocode.maps.co. The SMHI URL returned 404, and maps.co requires a key that would end up in the app (SPEC D-24). Tell the teacher.
- [ ] Network state is detected from failed requests (`AppError` `network`/`timeout`), not with `@react-native-community/netinfo`. The lab lists NetInfo as a tip for React Native; the team decided against it in Epic 7 (SPEC D-48, LLM-016). Be ready to explain why.

## 2. Before the presentation

- [ ] `npm ci`, then `npm run check` passes on the branch you will demo, and `npx expo-doctor` shows 20/20.
- [ ] The app runs on the **Android Emulator** (Windows) and the **iOS Simulator** (Mac), in portrait **and** landscape (lab: "check portrait and landscape").
- [ ] Each of you can open SPEC.md, read the AI meta-instructions (§0) and follow one requirement to its code and test. **Q26 is always the first question.**
- [ ] Each of you can explain any line of code, whoever wrote it.
- [ ] The demo device has network, and you know how to turn it off (for the offline part).
- [ ] Clear the app's data once, so the first-launch screen can be shown.

## 3. Reflection: questions to think about (questions only)

The lab's reflection report asks for **one thing that surprised you** when building a networked app with AI assistance, and **one thing you would do differently** next time. The lab's appendix suggests these questions; the answers must be your own:

- What was difficult, and why?
- Which part of the code are you most satisfied with, and why?
- What did you learn about working with AI, both what worked and what did not?
- What would you do differently if you started over?
- Which code can you explain in detail today?

Your own raw material is in the "AI mistakes or limitations observed" and "Changes reviewed or modified by students" fields of LLM_PROCESS.md, your Linear history and your commit messages. The lab suggests keeping private running notes at the top of REFLECTION.md and deleting them before submission.

**Outline for you to copy into REFLECTION.md and write yourselves.** These are structure and prompts only, taken from the lab; no answer is suggested. Aim for about half a page in total.

1. *One thing that surprised us when building a networked app with AI assistance*: what it was, when it happened, and why it surprised you.
2. *One thing we would do differently next time*: what, and what you expect would change.
3. *(Optional, if space allows)* one of the lab's questions above, answered from your own experience.
4. *The appendices*: A TEST_REPORT.md, B README.md, C SPEC.md, D LLM_PROCESS.md, attached or referenced as the lab asks.

## 4. Demo walkthrough (running app, then code)

The lab asks you to demonstrate the running app first. A suggested order follows, with the code to open for each step. The code paths are the real ones.

| # | Show in the app | Then open |
|---|---|---|
| 1 | **First launch:** welcome panel, no permission prompt | `src/views/components/WelcomePanel.tsx`; `HomeScreen` shows it while `location === null` |
| 2 | **Search** "Lund": results with region and country | `LocationSearchSheet.tsx` → `useSearchViewModel.search` → `locationRepository.searchLocations` → `geocodingService.fetchLocations` → `httpClient.getJson` → `geocodingParser.parseGeocodingResponse` |
| 3 | **Choose a result:** hero, rest of today, seven days | `HomeScreen.handleSelectLocation` → `useWeatherViewModel.load` → `weatherRepository.getReport` → `weatherParser.parseWeatherResponse`; then `forecastForState` → `selectForecast` (one report feeds all three sections, SPEC D-32) |
| 4 | **Coordinates** `59,33` / `18,07`, then `95` (rejected) | `coordinateValidation.validateCoordinates` (strict format, SPEC D-25); no request is sent for invalid input |
| 5 | **Tap a day:** detail screen, back | `HomeScreen.handleSelectDay` → `navigation.navigate('DayDetail', …)`; route types in `src/navigation/routes.ts` (the screen navigates, not the ViewModel) |
| 6 | **Star, Favourites,** choose a favourite | `useFavoritesViewModel` → `favoritesRepository` → `keyValueStorage.writeJson`; return with `navigation.popTo('Home', { selectedLocation })` |
| 7 | **Settings:** °F and km/h, back | `SettingsProvider` / `useSettingsViewModel`; conversion only when formatting (`src/utils/units.ts`, SPEC D-46) |
| 8 | **Offline:** turn the network off, pull to refresh | `useWeatherViewModel.refresh` → `refreshFailed` state; the notice text from `describeRefreshNotice` ("No connection. Showing the weather from …") |
| 9 | **Close and reopen the app offline** | `restoreLastReport` → `weatherRepository.loadLastReport` → `weatherCacheParser`; the stored cache is the parsed model (SPEC D-47, D-48) |
| 10 | **Rotate to landscape** | `screenLayoutFor(useWindowDimensions())` in `HomeScreen` and `DayDetailScreen` (SPEC D-49); `app.json` `orientation: "default"` |

**The four questions the examiners will most likely dig into.** Prepare each in your own words, with the code open:

1. **Why MVVM here?**
   - Look at what each layer must not do (STYLE.md §3).
   - Look at which rules are therefore testable without a device (the 41 test suites).
   - What would break if `HomeScreen` called `fetch` itself?
2. **How is the data cached and restored?**
   - One cache entry, the parsed model with its fetch time (D-47). When is it written, when is it read, and how is "stale" decided (`refreshPolicy`, D-45)?
   - How does the screen avoid showing cached weather as if it were live (`refreshFailed`, `describeRefreshNotice`)?
3. **How is concurrency guarded?**
   - `createLatestRequestGuard` in the weather, search and favourites ViewModels: what happens when "Lund" answers after "Kiruna" (Q12)?
   - Why do repositories queue reads and writes of one key (`runInOrder`)?
4. **How are failures handled?**
   - `AppError` kinds, created in `httpClient` and the parsers.
   - Messages chosen in the views from `kind`; "Try again" on Home and Favourites.
   - Damaged favourites are kept, not overwritten (D-38). What does the user see in each case (TEST_REPORT §1.11, §1.12; error texts in §1.18)?

**Questions only you can answer:**
- **Q25:** a function the AI helped write, explained line by line.
- **Q27:** where you pushed back on the AI. Examples are recorded in LLM_PROCESS.md, e.g. LLM-003's rejected items and LLM-009, where reverse geocoding was proposed and not implemented.
- **Q29:** your most effective prompt.
- **Q30:** what you would do differently.

Choose these from your own experience; the log only helps you remember.

### 4.1 The 30 oral exam questions: where each is prepared

All 30 are in [SPEC.md §12](SPEC.md#12-oral-examination-mapping), with a code location and a short answer drafted from the code. The drafts are reminders of where to look; you must be able to explain them in your own words.

| Group | Questions | State on 2026-11-26 |
|---|---|---|
| Data & networking | Q1 – Q6 | Code location and draft answer for each |
| State management | Q7 – Q12 | Code location and draft answer for each |
| Error handling | Q13 – Q18 | Code location and draft answer for each |
| Architecture | Q19 – Q24 | Code location and draft answer for each; Q23 uses W-03 as the example (choose your own) |
| AI & LLM usage | Q25 – Q30 | Q26 and Q28 prepared. **Q25, Q27, Q29, Q30 are personal and left empty for you** |

Open the app, SPEC.md and the code side by side when you practise: the lab says you must be able to find the relevant code and explain how it works.

## 5. Open items for the students

- [ ] Run TEST_REPORT §3 on the Android Emulator (none run yet) and finish the iOS Simulator runs, including landscape (UX-21, UX-22, UX-26, UX-33) and the new UX-30 – UX-34.
- [ ] Record what you observed, with the date and tester; use `NOT RUN` for anything not done. An iPhone with Expo Go is useful extra evidence, but record it as "Expo Go on iPhone", not as the iOS Simulator.
- [ ] Decide SPEC OQ-09 (who writes the submitted LLM_PROCESS.md and the test results) and act on it.
- [ ] Write REFLECTION.md yourselves.
- [ ] Fill in the empty oral exam answers that are personal (SPEC §12: Q25, Q27, Q29, Q30), or prepare them orally.
- [ ] Assemble the single submission document and submit it at least one day before the presentation.
- [ ] Set `VERIFIED` in SPEC §11 only for requirements you have checked on both platforms.
