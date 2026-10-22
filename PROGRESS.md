# Proof of progress

What was built, what broke along the way, and how it was fixed. Everything below was done on 2026-10-22. Screenshots are from the running app. Numbers come from manual runs against the live Gemini API unless marked otherwise.

## Where it stands

| Area | Status |
|---|---|
| Test 1: profile → shortlist → personalised application | Passed in the browser |
| Test 2: personalised application with chance of being shortlisted | Passed in the browser |
| Test 3: asks follow-up questions and uses the answers | Passed in the browser (thin profile, gibberish and "Skip" also checked) |
| Multi-page journey: intake, profile, what-if, 3-4 drafts, chat, scholarships, alumni | Built. Each page was opened and used in a desktop browser |
| **Version 4:** 6-step intake, profile strength score, strengths and gaps, cost breakdown and compare table, funding range slider, plan checklist, calendar file, Word and PDF export, share link | Built. Each was used in a desktop browser against the live AI (see the version 4 screenshots). PDF print, a real calendar app and Word itself were not opened |
| Version 4 on a phone | Every page measured at 375 px wide: no sideways scrolling. Not tested on a real phone |
| Google Search grounding with source links | Code and unit tests only. **Not run for real**: Google refused the search tool on the free key. Off by default, with "verify links" as the fallback |
| Loan and debt calculator | Built, tested against published loan-table values |
| Plain-code tests (`npm test`) | 10 test files, all passing, no key needed (v6 and v7 logic in one file) |
| `tsc`, lint | Clean |
| Deployed prototype | Version 3 is live. **Version 4 is not deployed yet**, and the live site has no AI key set until the owner adds `GEMINI_API_KEY` in Vercel |

## Screenshots

| | |
|---|---|
| **Intake: money, risk, scholarship and loan.** Step 3 of 5 of the guided form. | ![Intake step 3](docs/progress/01-intake-money-and-risk.jpg) |
| **Profile and loan calculator.** Every answer is listed. The loan numbers are plain maths (USD 20,000 at 9% over 7 years is about USD 322 a month, checked independently). | ![Profile and loan](docs/progress/02-profile-and-loan.jpg) |
| **A bug caught on screen.** The what-if rebuilt the whole list, swapped four programs, and one reason contains the AI's own second-guessing ("wait, the prompt says..."). This led to a redesign (see below). | ![What-if bug](docs/progress/03-whatif-bug-caught.jpg) |
| **Draft comparison.** Three programs side by side: chance, statement length, blanks to fill, numbers and wording to check. | ![Applications compare](docs/progress/04-applications-compare.jpg) |
| **One draft opened.** Chance with reasons, and the legend for yellow (blank), orange (number you never gave) and pink (wording you never used). | ![Draft expanded](docs/progress/05-draft-expanded.jpg) |
| **Chatbot.** It suggests a profile change and the student presses Apply. It never changes anything on its own. | ![Chat proposal](docs/progress/06-chat-proposal.jpg) |
| **Scholarships (version 3).** Eligibility match per program, save, and "Ask the AI about this". Version 4 adds rough amount ranges, see below. | ![Scholarships](docs/progress/07-scholarships.jpg) |
| **Alumni paths.** Clearly labelled illustrative, not real people. | ![Alumni](docs/progress/08-alumni.jpg) |

### Version 4

| | |
|---|---|
| **Strengths and gaps for one program.** What helps, and each gap with a fix. | ![Strengths and gaps](docs/progress/09-strengths-and-gaps.jpg) |
| **Cost breakdown.** Tuition and living as ranges, "AI estimate, not a quote", "Over your budget" with the gap and the loan payment on it (worked out by code). | ![Cost breakdown](docs/progress/10-cost-breakdown.jpg) |
| **Compare table** for three selected programs: fit, length, tuition, living, total, against budget, loan payment on any gap. | ![Program compare](docs/progress/11-program-compare.jpg) |
| **Plan checklist.** 16 tasks for Fall 2027. Typical dates say "not an official date". The student ticks tasks and confirms dates, and progress updates. | ![Plan checklist](docs/progress/12-plan-checklist.jpg) |
| **Shared plan opened with no saved data.** Read-only, name left out. | ![Shared plan](docs/progress/13-shared-plan.jpg) |
| **A damaged share link.** A plain message and a way back, no crash. | ![Tampered link](docs/progress/14-tampered-link.jpg) |
| **Funding range slider.** Raising the lower end regrouped the list: 1 within range, 3 outside. Amounts are labelled AI estimates. | ![Funding range](docs/progress/15-funding-range.jpg) |
| **Phone width.** Guided intake at 375 px, with option chips. | ![Phone intake](docs/progress/16-phone-intake.jpg) |

## Timeline

1. **Plan, then build.** Wrote a plan first (user journey, files, where AI is used, how each test is checked). Built a one-screen MVP: form → follow-up questions → shortlist → one application.
2. **First real AI run.** Blocked at first because the key saved was an OpenRouter key, not a Gemini key. It was caught by checking the key's format (never printed), and was never sent to the wrong service. The provider was switched from Claude to Gemini by the user's choice.
3. **Test review found a failure.** Test 3 and Test 2 passed. Test 1 failed: with the full sample profile the shortlist ran 104 seconds and was cut off. Root causes: the AI's "thinking" used up the output budget, and the full model was slow (30 to 104 seconds per call).
4. **Fixes.** Thinking turned down and the limit raised. The AI is now told today's date (it had suggested past intake years). A rule that facts about universities are worded as "typically... confirm on the official page". Automatic retries on Google "busy" errors. A check that rejects a nonsense field (once the country came back as "Safe").
5. **Switched to the lite model.** Same shortlist: 3 to 4 seconds in a first test against 40 to 104 seconds. All three tests then passed in the browser. Two quality slips from the faster model were caught and fixed: a very selective school labelled "Safe", and statements under the 500-word target.
6. **Version 3 (this repo).** A multi-page journey: guided intake, profile with what-if sliders, 3 or 4 drafts to compare, a chatbot on every page, scholarships, alumni paths, and the loan calculator.
7. **Bugs found by testing the new version, and fixed.**
   - The chat said "I've updated your budget" when nothing had changed yet. Now it only suggests, and the student must press Apply.
   - Scholarships quoted specific amounts that may be outdated. Amounts are no longer allowed, and the badge now says "Eligibility", so it is not read as "likely to win".
   - A saved duration of "2 years" showed as blank in a dropdown that did not list it.
   - What-if answers sometimes came without a reason for the dropped program (3 of 4 runs). Now every added or dropped program must have a reason, or the answer is rejected and retried.
   - What-if rebuilt the whole list and reshuffled programs, and one reason contradicted itself. Redesigned: the AI only names additions and drops, and the code builds the new list. Drops are only allowed when something that can rule a program out has changed. Reasons that look like leaked reasoning are rejected.
   - The shortlist could ignore the risk setting. Code now checks the Reach/Match/Safe mix and retries.
   - AI drafts sometimes added dramatic wording the student never used ("witnessed firsthand"). Added a prompt rule and a pink highlight as a backstop.
   - A retry loop could run past the 60 second hosting limit. No retry now starts after 25 seconds.
   - Running `npm run build` while the dev server was running made pages hang on "Loading...". Documented in the README.
8. **Submitted, then found the live link had no key.** The Vercel project had no `GEMINI_API_KEY`, so every AI step on the submitted link failed with a message that named `.env.local`. The message is now friendly in production, and `/api/health` and `scripts/verify-deploy.sh` make the problem visible in one command.
9. **Version 4.** A richer intake (6 steps, mostly option chips, ranges, score and grade checks), a profile strength score, strengths and gaps, a cost breakdown and compare table, funding ranges, a plan page with checklist, calendar file, PDF and Word export and a share link, and a design and phone pass. Plan first, approved, then built.
10. **Bugs found while testing version 4, and fixed.**
    - The profile page crashed when opening data saved by version 3 (a list field was missing). Saved and shared data now go through one cleaning step, with a regression test.
    - The chat did not know the new pages, and described the Plan page as the shortlist page. The prompt now says what each page is for. Re-asked after the fix, it described the checklist, downloads, calendar file and share link correctly.
    - The chat button appeared on a shared plan, for a stranger with an empty profile. It is hidden there, and the wording on a shared plan no longer says "your profile".
    - Two open tabs share one saved copy, and a fresh tab with nothing saved overwrote it. This is a limit of having no accounts, now listed in the README.
    - Grounding could not be tested: Google refused the search tool on the free key (error 429). Built the "verify links" fallback and left grounding off rather than claim something unverified.

11. **Version 5: OVEREASE.** Renamed, redesigned and extended after the live link was submitted.
    - Risk became a range (two handles, presets, shortlist rules for a spread). Old single-risk data converts on load, and the what-if only allows drops when the top of the range comes down.
    - Every price shows in USD and INR, with the sample rate stated.
    - The chat became the OVEREASE voice guide with 11 languages.
    - A sidebar journey with ranks, a trip strip, a phone tab bar, and a rebuilt landing, profile, programs, applications and plan.
12. **Bugs found while building version 5, and fixed.**
    - Making risk a range broke three existing tests. The old tests only changed the single `risk` field while the range still applied, so I updated them to change the whole range, and added tests for the new rules.
    - Describing a risk change produced three lines for one change. It now reads as one line.
    - A Hindi sentence about a risk range came back as a single "high" instead of a range. The prompt now says when to use the range fields, and the same sentence then produced a correct lowest and highest pair.
    - shadcn added an unvetted package called `cn`. I replaced it with `clsx` and `tailwind-merge`.
    - On phones the OVEREASE button covered the "Get my application drafts" button. It now floats above the action bar.

13. **Version 6: your own words, and the English coach.**
    - Drafts open full screen with a fact check. Write-it-yourself mode asks personal questions, takes speech or writing in 11 languages, translates to English with word meanings, and coaches without rewriting. Pasting is off and an originality meter watches for drift toward the AI draft.
    - An English coach scores five skills, keeps history and a streak, and adapts to earlier attempts.
    - OVEREASE asks the student's language first and shows an English version of what they said.
    - A next-best-step workflow names the one most useful action on every page.
14. **Bugs found while building version 6, and fixed.**
    - The writing coach sometimes wrote Hindi in Roman letters. The prompt now insists on native script, and 3 of 3 re-runs came back in Devanagari.
    - The English coach was too kind: four real errors in 53 words still scored grammar 70. A code rule now caps grammar by error count, with tests.
    - My first originality test expected a light paraphrase to pass. The code was right to flag it (26% of 4-word runs matched), so the test was wrong and was corrected.
    - The write screen was 1,128 px wide on a phone because a scrolling row stretched its grid. Fixed with `min-w-0`, and a stamp animation that starts oversized is now clipped inside its card.
    - The typical yearly costs on the country cards were too low for several countries against tuition plus the living-cost proofs they require. Canada, the UK, Australia, Ireland, the Netherlands and Singapore were raised. These are rough ranges from general knowledge, not live data.

15. **Version 7: black theme and six AI upgrades.** The look changed to a Spotify-style black theme. The six upgrades were a requirements gap check, application automation (kit and deadline planning), a mock interview, a whole-plan what-if, funding eligibility reasoning, and a progress coach with a weekly plan. Voice mode was added to OVEREASE.
16. **Bugs found while building version 7, and fixed.**
    - **The AI got currency arithmetic wrong.** "My budget falls by 8 lakh rupees" cut the budget by USD 20,000 instead of about 9,500. The design was wrong, not the prompt: the AI now reports only the currency, amount and direction, and code converts and sums. A test covers it, and the same sentence now gives 25,500.
    - **The AI wrote "UK" where the app says "United Kingdom".** Country names are now normalised in code.
    - **The interviewer assumed details the student never gave** (it asked about "GPS data"). The prompt now forbids assuming technical details.
    - My simulated microphone replayed its script when stopped, which made the first interview test look broken. The app was fine, and the simulation was fixed.
    - Auto-planned dates in the past are not shown as the past. They become today and are marked tight, and a test pins this.
    - Passport stamps overlapped in the narrow side column and were resized.
    - Charts with a single score drew nothing, so the latest score is now drawn as a dot.

## Measured results (manual runs, live API)

| Check | Result |
|---|---|
| What-if: raise budget to USD 60,000 and set risk to High, 4 runs | All 4 gave at least 2 Reach programs, one or two additions, and a reason for each. About 3 seconds each |
| What-if: an irrelevant change, 4 runs | 0 programs added or dropped in all 4 |
| What-if: cut the budget to USD 15,000 | Expensive US and Canadian programs dropped and German ones added, with reasons. Two of four runs were stopped by Google's rate limit, which the app reports in plain words |
| 6 application drafts requested at once | All finished within 24 seconds. Statements were 492 to 590 words. No invented numbers. One flagged wording ("firsthand") |
| Scholarships, 3 runs | No specific amounts in any run |
| Alumni, 2 runs | No names, quotes, salaries or statistics |
| Chat: new fact / general question / "what if" question / instruction hijack | Suggested a change only for the new fact. No change for the others. The system prompt was not revealed |
| Version 4, sample profile (local, live API) | Profile strength 85 of 100 (21/15/19/15/15), matching a hand calculation in the tests. IELTS 11 refused with a red message |
| Version 4, strengths, gaps and cost for one program | About 10 seconds. Cost shown as a range with the gap and loan payment worked out by code |
| Version 4, compare table for 3 programs | Two programs analysed in one click, about 10 seconds |
| Version 4, three application drafts | All three written. 565, 548 and 530 words. One blank each, 0 to 1 pieces of wording to check |
| Version 4, funding lookup for one program | About 25 seconds. Slider change regrouped the list instantly without another AI call |
| Version 4, share link with a chosen draft | 6,266 characters. Opened with no saved data, read-only, name left out. A damaged copy showed the "could not be opened" page |
| Version 4, exports | Calendar file valid (one confirmed date, one event). Word file is a real .docx with 1 yellow highlight, matching the 1 blank in that draft |
| `scripts/verify-deploy.sh` against the local server | 14 of 14 checks passed |
| Version 7, requirements check for TUM (sample student) | 7 requirements: met, partly and missing correctly separated from the profile. GRE and recommendation letters flagged missing, ECTS credits partial, IELTS met |
| Version 7, application kit | 7 documents with lead times and 3 emails, placeholders in square brackets, no flagged numbers |
| Version 7, plan from deadline (2027-02-01) | 13 tasks moved, 4 marked tight because the ideal dates had passed |
| Version 7, mock interview, hands-free, simulated speech | 5 answers, 9 spoken lines, final report. The consistency cap lowered the score because of two numbers not in the application |
| Version 7, plain-sentence what-if | "budget falls by 8 lakh rupees, IELTS drops to 6.5" gave budget 25,500 and IELTS 6.5. Hindi "+5 lakh" gave 41,000 |
| Version 7, whole-plan impact | TUM went from "fits your budget" to "over your budget", with a loan payment of USD 290 (about 24,300 rupees) a month |
| Version 7, funding criteria | Three scholarships, each with 3 to 4 conditions checked against the student's facts, "not sure" where the profile was silent |
| Version 7, weekly plan in Hindi | 5-day plan in Devanagari, with tasks specific to this app |
| Version 7, voice mode in Hindi, Tamil, Bengali and Telugu (simulated speech) | Listened in hi-IN, ta-IN, bn-IN and te-IN. Spoke each reply with the matching language. Read the English aloud in en-IN when asked. Paused after two silent turns |
| Version 6, writing coach questions in Hindi | Three questions per section, built from the student's real project, in Devanagari |
| Version 6, writing coach feedback | Flagged a cliché and a vague sentence by quoting the student's own words. Did not rewrite anything |
| Version 6, translation Hindi to English | Faithful translation, a Hindi explanation, and four useful words with meanings |
| Version 6, English coach on a 53-word answer with 4 real errors | Grammar held at 57 by the code cap, overall 73, four exact corrections, each quoting words the student wrote |
| Version 6, fact check on a draft | 5 of 7 checks passed. It flagged the AI's "firsthand" and one blank to fill |
| Version 6, paste into the editor | Blocked, with a message. The text was unchanged |
| OVEREASE, typed question in Hindi and Tamil | Both answered in the right script. A made-up language name safely fell back to English |
| OVEREASE, a Hindi sentence stating a budget | Proposed `budgetUsd` 50000 as a number. Applying is still the student's choice |
| OVEREASE, a Hindi sentence naming a risk range | Proposed lowest `balanced` and highest `high` after the prompt fix |
| Version 5, 390 px wide | No sideways scrolling on the ten pages measured |

## What is not proven yet

- **A real microphone and real device voices.** Voice mode was verified with a simulated speech engine.
- **Google Search grounding,** which would let the requirements check read official pages.

- **Speech.** The microphone and spoken replies were not tested with real speech. Only typed questions were tested.
- **Lighthouse above 90** has not been measured.
- **The new design on a real phone**, and with a screen reader, has not been checked.

- **Grounding with source links** has not run against the real service (see above). Nothing in the app claims a figure was checked.
- **Version 4 is not deployed**, and the live site cannot make AI calls until `GEMINI_API_KEY` is added in Vercel. After that, `scripts/verify-deploy.sh <live address>` is the test.
- The PDF print window, the calendar file inside a real calendar app, the Word file opened in Word, and a real phone were not checked.
- Facts, costs and scholarship amounts come from the AI's memory and are estimates. Strengths and gaps, and the chance estimate, are AI judgement.
- The what-if change (drop gating and the leaked-reasoning filter) is covered by unit tests and was exercised in earlier live runs, but not re-run in version 4.
- The quota is open: anyone with the live link can use the key. A spend limit in Google's console is the protection.
- No automated browser tests.
