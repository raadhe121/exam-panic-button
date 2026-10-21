# Technical spec

## Stack
Next.js (App Router) + React + Tailwind CSS v4, deployed on Vercel. Guests need no database. Accounts and saved data use Supabase (Postgres + Auth + row level security).

## Flow / state
`components/PanicApp.tsx` holds the state: `stage` (landing, timing, topics, generate, plan), timing inputs, topics, and the stored plan (blocks with absolute timestamps and a `done` map). All of it is saved to localStorage (`epb:v1`); theme is stored in `epb:theme`.

## Times
Datetime inputs are converted to "local epoch minutes" (wall-clock minutes since 1970). The server never needs the user's timezone. Plan blocks use `HH:MM`; `resolveBlocks` walks forward from the start time to get absolute times (handles crossing midnight).

## API: `POST /api/plan`
Request: `{ startMin, sleepMin, examMin, topics: [{ id, name, subject, rating, starred }] }`
Response: `{ plan, source: "ai" | "fallback" }` where `plan` is:
```json
{
  "summary": { "studyMinutes": 0, "topicsCovered": 0, "message": "" },
  "blocks": [{ "type": "study|break|revision|sleep", "topic": null, "start": "HH:MM", "end": "HH:MM", "tip": "" }],
  "skipped": [{ "topic": "", "reason": "" }]
}
```
1. `lib/ai.ts#askAI` calls Groq (OpenAI-compatible chat completions, JSON mode, `GROQ_API_KEY`, optional `GROQ_MODEL`, default `openai/gpt-oss-120b`) or, if no Groq key, the Anthropic Messages API (`ANTHROPIC_API_KEY`). Server only, JSON only, 25 s timeout.
2. `lib/validate.ts` checks shape and rules: 5-minute rounding, contiguous blocks, starts at the start time, one final sleep block starting at the sleep time, no block running past it, revision block last before sleep, known topics, ordering, sane lengths. Summary is recomputed.
3. On any failure (no key, network, bad JSON, rule violation) `lib/planner.ts` builds the plan locally. The client also falls back to the local planner if the API is unreachable.

## Local planner rules (`lib/planner.ts`)
- Order: starred No idea, No idea, other starred, Shaky, Know it.
- Lengths: No idea 50 (60 starred), Shaky 35 (40 starred), Know it 10 (15 starred); shortened to 45 / 30 / 10 when tight.
- Break after each study block: 5 min (10 after blocks over 35 min); 25 min long break once ~110 min of study have passed since the last one.
- Final 25 min (20 if the window is short) before sleep: "Quick revision of everything".
- Too little time: shorten then drop tier by tier (Know it, starred Know it, Shaky, starred Shaky, No idea, starred No idea). Dropped topics go to `skipped`.
- Spare time: up to two extra passes over non-Know-it topics, then a free-time break.
- Exam less than 7 hours away: sleep block becomes a 30 minute nap, and the sleep input is treated as nap time.

## Validation (UI)
Exam in the future; exam after start; sleep after start and before exam; 1 to 15 topics; warning under 6 hours of sleep; gentle note if under 1 hour to study.

## Accessibility
Labelled inputs, radio groups for ratings with text labels, `aria-current` on the Now block, progressbar role, live regions for status and errors, visible focus rings, reduced-motion respected.

## Extras
- Breathing: `BreathingDialog` (native dialog, 60 s, 4 s in / 4 s out, then scrolls back to the Now block).
- Re-plan: `lib/replan.ts` finds topics whose first block isn't ticked; the plan is rebuilt from now to the original sleep time with the original sleep/nap mode (`PlanInput.nap`). Sleep stays protected and lower-priority topics are dropped first.
- Syllabus: `POST /api/topics` asks the AI for a topic list and flags up to 3 likely-important topics (starred on import), falling back to `lib/syllabus.ts` line splitting. No login needed.
- Photo: `POST /api/scan` sends a downscaled JPEG to a vision model (`GROQ_VISION_MODEL`, default `qwen/qwen3.8-27b`; Claude if only an Anthropic key is set) and returns the same topic list. No fallback: the UI asks the student to type instead.
- Explain it fast: `POST /api/explain` returns 5 bullets and a memory trick for one topic.
- Calm coach: `lib/coach.ts` picks a short line from progress and the panic score. No AI call, so it works offline.
- Plan generation repairs sloppy model times (`repairPlan` in `lib/validate.ts`) before validating, retries once, and retries Groq once on a 429.
- Morning-of: `MorningChecklist` appears automatically after the sleep block ends (and on demand from a button).

## Adaptive and social features
- Panic score: `TimingInputs.stress` (1 to 5, asked on step 1). At 4 or 5 the planner is "gentle": shorter blocks (No idea 40, Shaky 30, Know it 10), a 10-minute break after every block, long break after 80 minutes, and an easy topic first. Normal ordering rules otherwise; the validator skips the ordering check in gentle mode.
- Focus mode: `FocusOverlay` shows only the topic and a timer. `visibilitychange` pauses it; on return it asks "Back to <topic>?".
- Quick check: after ticking a study block, `QuickCheckDialog` calls `POST /api/quickcheck` (AI, 2 questions). A wrong answer marks a "Know it" topic as Shaky and `lib/revisit.ts` carves a 10-minute revisit out of the next break of 20+ minutes (done-flags are shifted).
- Countdown: `/countdown` reads the plan from localStorage, shows time to exam, sleep left and topics left, supports full screen and a screen wake lock.
- Study buddy: table `shared_plans` plus RPC `get_shared_plan(code)` (security definer) in `supabase/schema.sql`. The owner (signed in) creates a random code; `PanicApp` pushes plan and ticks to the row on every change; `/buddy/[code]` polls every 3 seconds and shows a read-only live view. Needs the latest schema.sql to be run.

## App feel (PWA, alerts, settings)
- `app/manifest.ts` + `public/icons/*`: installable (standalone, themed splash). `/settings` shows an Install button where the browser offers `beforeinstallprompt`, and Add-to-Home-Screen steps on iOS.
- `public/sw.js` (registered in production only by `PwaSetup`): pages are network-first with a cached fallback (home shell when offline); scripts, styles and images are stale-while-revalidate; `/api/*` is never cached. Plans live in localStorage and the local planner runs in the browser, so a made plan works with no connection. An offline banner appears when the connection drops.
- Alerts (`lib/alerts.ts`): when a new block starts, `PlanView` plays a Web Audio chime and vibrates (each switchable), and shows a notification if enabled and the tab is hidden. Permission is requested from a button once the plan has started. Browsers pause timers in background tabs on phones, so for reliable background pings signed-in users should also use the server push reminders.
- Settings (`lib/settings.ts`, key `epb:settings`): theme, default sleep hours (feeds the default bedtime), sound, vibration, notifications.

## History, sharing, onboarding
- `lib/history.ts` (key `epb:history`, max 50): `PanicApp` upserts an entry (id, name, exam time, topics, blocks done / total) whenever the plan changes; `/history` lists them with progress bars. Works for guests; "Start over" keeps history.
- `lib/ics.ts`: one event per block with a 5-minute alarm. `lib/shareImage.ts`: draws a 1080 x 1350 PNG on a canvas and passes it to `navigator.share({ files })`, or downloads it when file sharing isn't supported.
- `Onboarding`: three scroll-snap cards in a dialog on the very first visit (and only when there's no plan yet); Skip or Get started sets `epb:onboarded`.

## Accounts and saved data (optional layer)
- `lib/supabase.ts`: browser client, null when env vars are missing (the app then runs as a guest-only app).
- `supabase/schema.sql`: tables `exams`, `notes`, `flashcards`, `quiz_questions`, `push_subscriptions`, `reminders`; every table has a row level security policy so users only see their own rows.
- Login: email and password on `/login` (session kept by supabase-js in the browser).
- `/exams`: list, open, delete, new exam. `/exams/[id]`: tabs for Notes, Flashcards, Quiz.
- `POST /api/flashcards` and `POST /api/quiz`: require a Bearer token (verified with Supabase), call Claude, validate JSON, return drafts that the browser saves.
- Calendar: `lib/ics.ts` builds an .ics file from plan blocks (one-way export).
- Push: `public/sw.js` shows notifications; `lib/push.ts` subscribes the browser; `lib/exams.ts#scheduleReminders` stores one reminder per upcoming block (5 min before); `GET /api/push/send` (Vercel Cron, `CRON_SECRET`) sends due reminders with `web-push`. Vercel Hobby only runs crons once a day, so use Pro (hourly in `vercel.json`) for timely reminders.

## Deploy
Push to GitHub, import in Vercel, then set the variables in `.env.example` (all optional; features turn on as their variables are added). Run `supabase/schema.sql` in the Supabase SQL editor.

## Languages (English, Hindi, Hinglish)

- `lib/i18n.ts` holds the `Lang` type, `useT()` and `translate()`. The English text itself is the key; `lib/i18n/hi.ts` (Devanagari) and `lib/i18n/hinglish.ts` (Hindi in Roman letters) map it to translations. A missing entry falls back to English, so a gap never breaks a screen. `{name}` placeholders are filled from a `vars` object.
- The choice is stored in `epb:settings` (`lang`) and switched from the header or Settings. `<html lang>` follows it (`LangSync`).
- The rule-based planner and its validators stay English. Stored plans, tips and error strings are translated when they are shown, so switching language also updates a plan you already built.
- AI routes (`/api/plan`, `quickcheck`, `explain`, `flashcards`, `quiz`) take a `lang` field. `aiLanguageNote()` adds an instruction to the prompt. Topic names and fixed labels are kept as given so validation and matching keep working. AI-written text is stored in the language it was generated in.
- Dates use `hi-IN` for Hindi; weekday names stay English for Hinglish.
