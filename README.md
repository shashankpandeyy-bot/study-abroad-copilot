# Study Abroad Co-Pilot

An AI co-pilot for people applying to study abroad. It asks the right questions first, shortlists universities that fit, lets you try "what if" changes, writes personalised application drafts you can compare, and suggests scholarships and typical alumni paths. A chatbot is available on every page.

Built for a hackathon with Next.js and the Google Gemini API.

## The job to be done

> When **any student or person applies to study abroad**, I want to **build an AI automation that helps make a personalised application for a selected university**, so I can **help those students save a lot of time and money**.

**User:** someone who is applying to study abroad.
**Out of scope:** accommodation, visa, and everything that happens after the application.

## The 3 tests

| # | The product must... | Where you see it |
|---|---|---|
| 1 | Take a student profile, give a shortlist of universities, and carry on into a personalised application | Intake → Profile (shortlist) → Applications |
| 2 | Produce a personalised application and the chance of being shortlisted | Applications page: chance band and range with reasons, and a draft built from the student's own facts |
| 3 | Ask more questions to understand the candidate better, using the student's own answers | Intake follow-up questions (max 2 rounds, "Skip" always available), plus the chat on every page |

All three passed in manual runs against the live Gemini API. See [Known gaps](#known-gaps) for what was and was not re-checked.

## Current workflow → future workflow

**Today (without this tool)**
1. Search many university websites, rankings and forums to guess which programs fit.
2. Pay a consultant, or rely on generic advice that does not reflect your budget, risk appetite or loan.
3. Write one generic Statement of Purpose and reuse it everywhere.
4. Guess your chances. Apply to schools that turn out to be a poor fit.

**With Study Abroad Co-Pilot**
1. Answer a short guided form: course, duration, exams and scores, budget, risk appetite, scholarship need, loan and repayment years, countries, background.
2. The AI asks follow-up questions if something important is missing or vague.
3. See your profile, a loan and debt calculator, and a shortlist of 6 programs marked Reach / Match / Safe.
4. Move sliders (budget, risk, scholarship need, countries, duration, scores) to see which universities would be **added or dropped**, with a reason for each.
5. Pick 3 or 4 programs. Get one personalised draft per program, side by side, with chance, blanks to fill and things to check. Choose your favourite.
6. Look at scholarships and typical alumni paths for each program. Save what you like.
7. Ask the chatbot anything, at any step. If you tell it new facts, it proposes profile updates and you press Apply.

## Architecture: Input → AI → Logic → Action → Output

| Stage | What happens |
|---|---|
| **Input** | A guided form (5 steps), answers to follow-up questions, the program(s) the student picks, what-if slider changes, chat messages |
| **Logic before AI** (plain code) | Check and cap every input. Force follow-up questions if the profile is too thin. Count question rounds (max 2). Work out what changed in a what-if. Decide whether any program may be dropped. Loan maths |
| **AI** (Gemini, called only from the server) | Follow-up questions, the shortlist, what-if additions and drops with reasons, application drafts and chance estimate, chat replies, scholarships, alumni paths |
| **Logic after AI** (plain code) | Check each reply has the right shape. Reject unusable answers and retry. Check the Reach/Match/Safe mix matches the risk setting. Check every added or dropped program has a reason. Flag numbers and dramatic wording the student never gave. Build the new shortlist from the AI's list of differences |
| **Action** (the student) | Answers or skips questions, picks programs, keeps or discards a what-if, applies or dismisses a chat suggestion, chooses a draft, edits it and applies to the university themselves |
| **Output** | Questions, shortlist cards with "what we assumed", added/dropped list, loan numbers, draft comparison table, highlighted drafts, scholarship and alumni pages |

```
 Browser (state saved in localStorage)
    │  fetch
    ▼
 /api/shortlist  /api/whatif  /api/application  /api/chat  /api/scholarships  /api/alumni
    │  validate input (lib/validate.ts)  →  build prompt (lib/prompts.ts)
    ▼
 lib/ai.ts  →  Gemini (forced function call = structured JSON)  →  checks + retry  →  JSON back to the browser
```

## Where AI is used, what stays human, and what is plain code

| Step | AI or code | Why |
|---|---|---|
| Form, validation, size caps, step navigation, saving in the browser | Code | Fixed rules with a clear right answer |
| "Is this profile too thin?" | Code | Counting filled fields is enough, and it makes the follow-up questions reliable |
| What is missing or vague, and what to ask | **AI** | Needs judgement about free text such as "somewhere cheap" |
| Choosing 6 real programs that fit | **AI** | There is no university database in this MVP, so it relies on the model's general knowledge |
| What-if: which programs a change adds | **AI** | Needs judgement about what a change unlocks |
| What-if: the new list, the added/dropped diff, whether drops are allowed | Code | The AI only names differences. Code builds the list, so unaffected programs cannot change |
| Application draft and chance estimate | **AI** | Personalised writing. A template would be generic |
| Loan payment, total repaid, interest | **Code** | A formula. The AI never does the arithmetic |
| Flagging invented numbers and dramatic wording, comparing drafts | Code | Deterministic checks that show instead of hide |
| Chat reply and suggested profile changes | **AI** | Conversation. Code decides which fields a suggestion may touch |
| Scholarships, alumni paths | **AI** | No data source in the MVP. Both are clearly labelled as AI recall / illustrative |

**What stays human**
- Telling the truth about themselves, and answering or skipping questions.
- Choosing programs, and deciding whether to keep a what-if or apply a chat suggestion.
- Replacing every yellow blank in a draft with real details, and checking every orange and pink highlight.
- Verifying program facts, scholarships and costs on the official websites.
- Submitting the application. The app never submits anything for the student.

## Why these tools

- **Next.js (App Router), TypeScript, Tailwind** give the screens and the secret server code in one project. It deploys to Vercel with one import.
- **Google Gemini API** (`@google/genai`). The original plan used the Claude API. It was switched to Gemini because a Gemini key was the one available. All AI calls go through one file, `lib/ai.ts`, so changing provider means rewriting that file and the tool format in `lib/prompts.ts`.
- **Forced function calling** makes the AI answer in a fixed data shape, not free text, so the code can check it.
- **`gemini-flash-lite-latest`** (a "latest" alias, so no model version is hard-coded). In my runs the full `gemini-flash-latest` took **30 to 104 seconds** per call, past Vercel's 60 second limit. The lite model usually takes **3 to 20 seconds**, sometimes longer when Google is slow. The trade-off is slightly weaker judgement, which is why the checks below exist.
- **Browser storage (localStorage)** instead of a database and accounts: less to build and less personal data stored anywhere. The cost is that your journey lives in one browser.
- **Plain Node scripts for tests** of the non-AI logic, so they need no key and no network.

## Failure cases

Real problems found while building, and what the app does about them.

| What can go wrong | What the app does |
|---|---|
| Google says "busy" (503) | Retries automatically up to 2 times, then shows a friendly message |
| Google rate limit (429), seen when many requests were sent at once | Shows "Too many requests, wait a moment". Application cards have a "Try again" button |
| Missing or wrong API key | A clear message naming `.env.local`. Nothing is sent to the wrong provider |
| AI answer cut off (its "thinking" used up the token budget) | Thinking set to LOW, larger limit, and a retry |
| AI puts a wrong value in a field (once: the country was "Safe") | Rejected and retried automatically |
| AI changes the shortlist without a reason, or writes its own second-guessing into a reason ("wait, the prompt says...") | Rejected and retried |
| What-if reshuffles many programs, or drops one after the budget went up | The AI only names additions and drops. Code only allows drops when something that can rule a program out changed (lower budget, new countries or duration, stricter scholarship need, lower risk, changed scores) |
| Shortlist ignores the risk setting | Code checks the Reach/Match/Safe mix and retries |
| Draft invents numbers | Orange highlight and a count in the comparison table |
| Draft adds dramatic wording the student never used ("witnessed firsthand", "lifelong") | Prompt rule, plus a pink highlight as a backstop |
| Draft invents facts it cannot know | Told to use `[PLACEHOLDER: ...]`, shown in yellow |
| Draft too short | Under 400 words is rejected and retried |
| Too little information, or gibberish | Follow-up questions are forced. The AI is told never to shortlist from nonsense |
| Retries piling up past the hosting time limit | No retry starts after 25 seconds |
| Browser storage blocked | The app still works in memory. A refresh then starts over |
| Programs, scholarships or costs are out of date or wrong | **Not solved.** Every AI list says it is from general knowledge and must be verified. Scholarship amounts are not shown at all, and no links or deadlines are generated |

## Known gaps

- **Facts come from the model's memory.** Programs, requirements and scholarships can be outdated or wrong. This is the biggest risk. There is no live data source.
- **The what-if is an AI judgement**, not a lookup. Reasons are shown so you can disagree.
- **Alumni are illustrative archetypes**, not real people. There is no real alumni community.
- **Chance estimates have no data behind them.** They are labelled AI estimates.
- **Not deployed yet.** Set the key in Vercel, and set a spend limit in Google's console, because anyone with the link can use your quota.
- **Free-tier rate limits** can interrupt a demo if many requests are sent at once.
- **Verification status.** The plain-code logic has automated tests (`npm test`). AI behaviour was checked by hand against the live API. The last change to the what-if (drop gating and the reasoning filter) is covered by unit tests, but I did not re-run it against the live AI before this commit. The new pages were checked in a desktop browser, not on a phone.
- On narrow screens the floating chat panel can cover part of the page. Use its Close button.
- No end-to-end browser tests.

## How to run it locally

You need **Node.js 22.18 or newer** (tested on Node 26), **npm**, **git**, and a **Gemini API key** from Google AI Studio.

```bash
git clone <this repo's URL>
cd study-abroad-copilot
npm install
cp .env.local.example .env.local
```

Open `.env.local` and put your key after the equals sign, with no spaces or quotes:

```
GEMINI_API_KEY=your-key-here
```

Then start it:

```bash
npm run dev
```

Open http://localhost:3000. Add `?demo=1` to the address to show "Sample profile" and "Thin profile" buttons that fill the form for you.

Other commands:

```bash
npm test         # plain-code tests, no key needed
npm run lint
npm run build
```

> Do not run `npm run build` while `npm run dev` is running. It disturbs the dev server and the page can get stuck on "Loading...". Stop the dev server first, or restart it afterwards.

**Deploying to Vercel:** import the repository, add `GEMINI_API_KEY` as an environment variable, and deploy. The API routes allow up to 60 seconds.

## Project layout

```
app/                  pages: / (intake), /profile, /applications, /scholarships, /alumni
app/api/              shortlist, whatif, application, chat, scholarships, alumni
components/           screens and widgets (wizard, what-if panel, chat dock, compare table...)
lib/ai.ts             the only file that talks to Gemini (retry, errors, structured output)
lib/prompts.ts        what the AI is asked, and the data shapes it must answer in
lib/validate.ts       input cleaning and checks on every AI reply
lib/checks.ts         plain-code checks (thin profile, risk mix, diffs, flags)
lib/loan.ts           loan maths
lib/state.tsx         app state saved in the browser
tests/                tests for the plain-code logic
```

## Privacy and secrets

- The API key lives only in `.env.local`, which is git-ignored. It is read on the server and never sent to the browser. Only `.env.local.example` (with an empty value) is committed.
- What a student types is sent to Google's Gemini API to generate results. It is saved only in the student's own browser. "Start over" clears it.
