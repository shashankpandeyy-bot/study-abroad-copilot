# OVEREASE

_Formerly "Study Abroad Co-Pilot"._

An AI co-pilot for people applying to study abroad. It asks the right questions first (mostly by tapping options), scores how complete your profile is, shortlists universities that fit, shows strengths, gaps and a cost breakdown for each program, lets you try "what if" changes, writes personalised application drafts you can compare, helps you find scholarships within a range you set, and gives you a checklist, downloads and a share link for your plan. A voice guide, also called OVEREASE, listens and replies in 11 languages on every page. Every price shows in US dollars and Indian rupees together, and risk is a range you set, not a single choice.

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

All three passed in manual runs against the live Gemini API. See [PROGRESS.md](PROGRESS.md) for screenshots, bugs found and fixed, and measured results, and [Known gaps](#known-gaps) for what was and was not re-checked.

## Current workflow → future workflow

**Today (without this tool)**
1. Search many university websites, rankings and forums to guess which programs fit.
2. Pay a consultant, or rely on generic advice that does not reflect your budget, risk appetite or loan.
3. Write one generic Statement of Purpose and reuse it everywhere.
4. Guess your chances. Apply to schools that turn out to be a poor fit.

**With Study Abroad Co-Pilot**
1. Answer a guided form in 6 short steps, mostly by choosing options: education and grades (with a scale picker), course and interests, exams (scores are range-checked), money (a lower-to-upper budget range, funding sources, loan), countries, background.
2. The AI asks follow-up questions if something important is missing or vague.
3. See your **profile strength score** (how complete and well evidenced it is, with the top things that would raise it), a loan calculator, and a shortlist of 6 programs marked Reach / Match / Safe.
4. Open any program for **strengths, gaps with a fix for each, and a cost breakdown** (tuition and living as a range, against your budget, with the loan payment on any gap). Select 3 or 4 to see a **side-by-side cost and fit table**.
5. Move sliders (budget, risk, scholarship need, countries, duration, scores) to see which universities would be **added or dropped**, with a reason for each.
6. Get one personalised draft per selected program, side by side, with chance, blanks to fill and things to check. Choose your favourite.
7. On **Funding**, set the yearly scholarship amount you hope for (lower to upper) and see options that fit, with rough amounts labelled as AI estimates. Save what you like. Look at typical alumni paths too.
8. On **Plan**, tick off a checklist, confirm real dates, download a calendar file (.ics), export drafts to **PDF or Word**, and create a **share link** for a parent or counsellor.
9. Ask the chatbot anything, at any step. If you tell it new facts, it proposes profile updates and you press Apply.

## Architecture: Input → AI → Logic → Action → Output

| Stage | What happens |
|---|---|
| **Input** | A guided form (6 steps), answers to follow-up questions, the program(s) the student picks, what-if slider changes, a scholarship range, dates the student confirms, chat messages |
| **Logic before AI** (plain code) | Check and cap every input, including score ranges (IELTS 0-9, GRE 260-340...) and grade formats. Force follow-up questions if the profile is too thin. Count question rounds (max 2). Work out what changed in a what-if. Decide whether any program may be dropped. Profile strength score. Loan maths |
| **AI** (Gemini, called only from the server) | Follow-up questions, the shortlist, what-if additions and drops with reasons, strengths and gaps with a cost estimate, application drafts and chance estimate, chat replies, scholarships, alumni paths |
| **Logic after AI** (plain code) | Check each reply has the right shape. Reject unusable answers and retry. Check the Reach/Match/Safe mix matches the risk setting. Check every added or dropped program has a reason. Fix reversed ranges. Flag numbers and dramatic wording the student never gave. Build the new shortlist from the AI's list of differences. Work out totals, gaps and loan payments from the cost ranges |
| **Action** (the student) | Answers or skips questions, picks programs, keeps or discards a what-if, applies or dismisses a chat suggestion, chooses a draft, confirms real dates, edits the draft and applies to the university themselves |
| **Output** | Questions, strength score, shortlist cards with "what we assumed", strengths, gaps and cost panels, a compare table, added/dropped list, loan numbers, highlighted drafts, funding and alumni pages, checklist, calendar file, PDF and Word files, a share link |

```
 Browser (state saved in localStorage)
    │  fetch
    ▼
 /api/shortlist  /api/whatif  /api/insight  /api/application  /api/chat  /api/scholarships  /api/alumni
 /api/health  (is the key set?)    /api/facts/search + /api/facts/extract  (grounding, off by default)
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
| Profile strength score and the "what would raise it" tips | **Code** | Fixed, explainable rules (academics 25, exams 20, evidence 25, goals 15, planning 15). It measures completeness, **not** your chance of admission |
| Strengths, gaps, and tuition and living cost ranges for a program | **AI** | Needs judgement and general knowledge. Labelled "AI estimate, not a quote" |
| Totals over the program, gap against your budget, loan payment on the gap, compare table | Code | Arithmetic on the ranges above. The AI never adds up |
| Checklist dates, progress, calendar file, share link, PDF and Word export | Code | Typical dates are labelled "not an official date". Only dates you confirm go in the calendar file |
| Flagging invented numbers and dramatic wording, comparing drafts | Code | Deterministic checks that show instead of hide |
| Chat reply and suggested profile changes | **AI** | Conversation. Code decides which fields a suggestion may touch |
| Scholarships, alumni paths | **AI** | No data source here. Scholarship amounts are rough ranges labelled as AI estimates. Alumni are illustrative |
| Google Search grounding with source links | **AI**, off by default | Built but not live-verified. See Known gaps |

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
| Missing or wrong API key | On your own computer, a clear message naming `.env.local`. On the live site, a friendly "not available right now" with no setup details. `/api/health` tells you whether the key is set. Nothing is sent to the wrong provider |
| A score or grade that cannot exist (IELTS 11, GRE 500) | The form shows a red message and will not move on |
| A budget or scholarship range typed back to front, or saved data from an older version | Fixed on load (`lib/clean.ts`), never a crash. A test covers old saved data |
| A share link that was cut off or edited | A plain "this link could not be opened" page with a way back, no crash |
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
| Programs, scholarships or costs are out of date or wrong | **Not solved.** Every AI figure says it is an estimate from general knowledge and must be verified. Costs and scholarship amounts are ranges, never single "quotes". Scholarship deadlines and links are not generated. Each program has "verify" links that open a Google search for the official page |

## Version 5 additions

- **Risk is a range.** A two-handle slider sets the lowest and highest risk you accept (safer, balanced, ambitious), with presets. The shortlist rules adapt: a range that includes "safer" must include a Safe program, one that reaches "ambitious" must include a Reach, and a Match is always included. Old single-risk data still loads.
- **USD and INR everywhere.** Prices are stored in USD and shown with rupees beside them (for example "USD 35,000 (₹29.4 L)"). The rupee figure uses one **sample rate of ₹84 per USD**, not a live rate, and the app says so.
- **OVEREASE voice guide.** Tap the mic and speak, or type. Replies come back in the chosen language (English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu) and can be read aloud. Listening and speaking use the browser's own speech features, so they depend on the browser and the voices installed on the device. Typed questions work everywhere.
- **New layout.** A sidebar journey (eight stops with a rank that rises as you go), a trip strip across the top, a bottom tab bar on phones, and wider pages. The landing page is a scroll story.
- **Reference-inspired screens.** A boarding-pass country picker with a route arc, a Wise-style conversion card, an intake calendar coloured by time to prepare, city skyline cards, a split-flap board for the shortlist and the next deadlines, and passport stamps for milestones.

## Version 6 additions

- **Full-screen drafts.** Each draft opens in a full-screen workspace with a live **fact check**: it compares the draft with what you told us (the right university, no other university named, your grade, your English test and score, numbers and wording you never gave, blanks, length). Where the right answer is certain (a wrong grade, a wrong score, another university's name) it offers a one-click correction. These checks are plain code, not AI.
- **Write it yourself, with a coach.** A guided mode splits the statement into six parts. For each part the AI asks questions built from your own profile, you answer in the language you think in (speaking or typing), and you can see your words in English with the hard words explained. Then you write the English yourself. The coach points at specific words in your text and asks questions, but never writes or rewrites it. Pasting is switched off, and an originality meter compares your text with the AI draft and warns if you drift toward it.
- **English coach.** Practise a question by typing or speaking and get five scores (grammar, vocabulary, clarity, structure, tone), the exact words to fix with a rule for each, a stronger version to compare with, and one thing to practise next. It keeps a history, a daily streak and a progress line, and its feedback builds on your earlier attempts. The overall number and a cap on the grammar score are worked out in code, so a few real errors cannot still score high. Scores come from your words only. Pronunciation is not judged, and the level shown is a rough guide, not an IELTS or CEFR result.
- **OVEREASE asks your language first,** and when you speak or write in it, shows what you said in English with word meanings.
- **Next best step.** A plain-code workflow reads your whole journey and names the one most useful next action, with the reason, on every page.

## Known gaps

- **The writing coach and English coach are AI judgement.** They are checked in code (quotes must really appear in your text, scores must be in range, the grammar score is capped by the error count), but they can still be wrong or too kind. Treat them as a practice partner, not an examiner.
- **Originality is a word-overlap check,** not plagiarism detection. It only compares your text with this app's AI draft.
- **Translations are AI translations.** Check anything important with someone you trust.

- **Voice is only partly verified.** Typed Hindi and Tamil questions were tested against the live AI and came back in the right script. The microphone itself, and spoken replies, were not tested with real speech, and some browsers (such as Firefox) cannot listen at all. Indian-language voices for reading aloud are missing on some devices.
- **The rupee figures are estimates at a fixed sample rate**, and the typical yearly costs on the country cards are rough ranges for illustration, not quotes.
- **City pictures are drawn illustrations**, not photographs.

- **Facts and costs come from the model's memory.** Programs, requirements, costs and scholarships can be outdated or wrong. This is the biggest risk. The cost ranges and scholarship amounts are labelled estimates, and the verify links point you to the official pages.
- **Google Search grounding is built but switched off.** The two routes (`/api/facts/search`, `/api/facts/extract`) and the code that drops any fact without a real source are in the repo and unit tested, but Google refused the search tool on the free Gemini key I have (error 429), so it has **not** been run against the real service. To try it, enable billing on your key and set `GROUNDING=on`. Until then the app uses the "verify links" fallback instead and never claims a figure was checked.
- **The what-if is an AI judgement**, not a lookup. Reasons are shown so you can disagree.
- **Alumni are illustrative archetypes**, not real people. There is no real alumni community.
- **Chance estimates and the cost ranges have no data behind them.** They are labelled AI estimates. The profile strength score is a completeness score, not an admission prediction.
- **The share link holds your plan inside the link itself.** There is no server copy. Anyone who has the link can read it, so share it only with people you trust. Your name is left out. Very long links drop the chosen draft to stay a sensible length.
- **One browser, one copy.** Your journey is saved in that browser only. Two tabs open at once share one saved copy and the last change wins.
- **The quota is open.** Anyone with the live link can use the API key's quota. The only protection is a spend limit in Google's console, which you set yourself.
- **Free-tier rate limits** can interrupt a demo if many requests are sent at once. The app shows "busy, try again".
- **Verification status.** The plain-code logic has automated tests (`npm test`). The pages and AI steps were checked by hand in a desktop browser against the live API (intake, profile, programs with strengths, gaps, cost and compare, applications, funding with the range slider, plan with checklist, calendar and Word files, share link and a tampered link, and chat), and every page was measured at phone width for sideways scrolling. Not checked: the PDF print window (code only), the calendar file inside a real calendar app, the Word file opened in Word, and real phones.
- On narrow screens the six navigation tabs scroll sideways rather than showing all at once.
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

**Deploying to Vercel:** import the repository, add `GEMINI_API_KEY` as an environment variable, and deploy. The API routes allow up to 60 seconds. Without the key every AI step fails, so after each deploy run the check script against the live address:

```bash
bash scripts/verify-deploy.sh https://your-site.vercel.app
```

It checks the health endpoint (is the key set?), every page, the `/scholarships` to `/funding` redirect, the 404 page, that a bad request is refused, and makes one real AI call. Set `SKIP_AI=1` to skip that last call. It prints PASS or FAIL for each step.

## Project layout

```
app/                  pages: / (intake), /profile, /programs, /applications, /funding, /plan, /plan/shared, /alumni
app/api/              shortlist, whatif, insight, application, chat, scholarships, alumni, health, facts/*
components/           screens and widgets (wizard, strength meter, cost panel, compare tables, checklist, chat dock...)
lib/money.ts          USD and INR display (one sample rate)
lib/risk.ts           risk range helpers
lib/languages.ts      the languages OVEREASE can listen to and answer in
lib/countries.ts      the eight destinations, their themes and sample costs
lib/draftcheck.ts      fact check for a draft, with safe one-click fixes
lib/originality.ts    how much of your text matches the AI draft
lib/coach.ts          English coach scoring maths, streaks and trends
lib/nextAction.ts     the next-best-step workflow
lib/sopSections.ts    the six parts of a statement
lib/ai.ts             the only file that talks to Gemini (retry, errors, structured output)
lib/prompts.ts        what the AI is asked, and the data shapes it must answer in
lib/validate.ts       input cleaning and checks on every AI reply
lib/clean.ts          cleans saved and shared data so old or damaged data cannot crash a page
lib/checks.ts         plain-code checks (thin profile, risk mix, diffs, flags)
lib/strength.ts       profile strength score and tips
lib/cost.ts, loan.ts  cost totals, gap and loan maths
lib/timeline.ts       checklist tasks and typical dates; ics.ts is the calendar file
lib/share.ts          share link encoding and safe decoding
lib/export.ts         Word export and file download helpers
lib/grounding.ts      drops any fact without a real source (used only when grounding is on)
lib/state.tsx         app state saved in the browser
scripts/              run-tests.sh and verify-deploy.sh
tests/                tests for the plain-code logic
```

## Privacy and secrets

- The API key lives only in `.env.local`, which is git-ignored. It is read on the server and never sent to the browser. Only `.env.local.example` (with an empty value) is committed.
- What a student types is sent to Google's Gemini API to generate results. It is saved only in the student's own browser. "Start over" clears it.
- A share link carries the plan inside the link (compressed, not encrypted). The student's name is left out, but everything else in the plan is readable by anyone who has the link.
