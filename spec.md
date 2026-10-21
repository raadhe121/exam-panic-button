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
- Syllabus: `POST /api/topics` asks Claude for a topic list, falling back to `lib/syllabus.ts` line splitting. No login needed.
- Morning-of: `MorningChecklist` appears automatically after the sleep block ends (and on demand from a button).

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
