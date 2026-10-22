# Proof of progress

What was built, what broke along the way, and how it was fixed. Everything below was done on 2026-10-22. Screenshots are from the running app. Numbers come from manual runs against the live Gemini API unless marked otherwise.

## Where it stands

| Area | Status |
|---|---|
| Test 1: profile → shortlist → personalised application | Passed in the browser |
| Test 2: personalised application with chance of being shortlisted | Passed in the browser |
| Test 3: asks follow-up questions and uses the answers | Passed in the browser (thin profile, gibberish and "Skip" also checked) |
| Multi-page journey: intake, profile, what-if, 3-4 drafts, chat, scholarships, alumni | Built. Each page was opened and used in a desktop browser |
| Loan and debt calculator | Built, tested against published loan-table values |
| Plain-code tests (`npm test`) | 5 test files, all passing, no key needed |
| `tsc`, lint, production build | Clean |
| Deployed prototype | **Not yet.** Needs a Vercel login and the API key added there |

## Screenshots

| | |
|---|---|
| **Intake: money, risk, scholarship and loan.** Step 3 of 5 of the guided form. | ![Intake step 3](docs/progress/01-intake-money-and-risk.jpg) |
| **Profile and loan calculator.** Every answer is listed. The loan numbers are plain maths (USD 20,000 at 9% over 7 years is about USD 322 a month, checked independently). | ![Profile and loan](docs/progress/02-profile-and-loan.jpg) |
| **A bug caught on screen.** The what-if rebuilt the whole list, swapped four programs, and one reason contains the AI's own second-guessing ("wait, the prompt says..."). This led to a redesign (see below). | ![What-if bug](docs/progress/03-whatif-bug-caught.jpg) |
| **Draft comparison.** Three programs side by side: chance, statement length, blanks to fill, numbers and wording to check. | ![Applications compare](docs/progress/04-applications-compare.jpg) |
| **One draft opened.** Chance with reasons, and the legend for yellow (blank), orange (number you never gave) and pink (wording you never used). | ![Draft expanded](docs/progress/05-draft-expanded.jpg) |
| **Chatbot.** It suggests a profile change and the student presses Apply. It never changes anything on its own. | ![Chat proposal](docs/progress/06-chat-proposal.jpg) |
| **Scholarships.** Eligibility match per program, save, and "Ask the AI about this". No amounts or deadlines are shown. | ![Scholarships](docs/progress/07-scholarships.jpg) |
| **Alumni paths.** Clearly labelled illustrative, not real people. | ![Alumni](docs/progress/08-alumni.jpg) |

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

## What is not proven yet

- The latest what-if change (drop gating and the leaked-reasoning filter) is covered by unit tests, but it was not re-run against the live AI before the first commit.
- Facts about programs and scholarships come from the AI's memory and are not verified.
- No phone-size check of the new pages, and no automated browser tests.
- Not deployed. See the README for the Vercel steps.
