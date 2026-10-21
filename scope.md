# Scope: Exam Panic Button

**Pitch:** Tell it when your exam is and what you still don't know, and it gives you a calm, hour-by-hour revision plan for tonight.

## In scope
- Landing, 3-step flow (Timing, Topics, Generate), plan screen
- Up to 15 topics, each rated Know it / Shaky / No idea, optional star and subject
- Timeline of study, break, long break, final revision and sleep blocks
- "Now" highlight with countdown, per-block checkboxes, progress bar
- Skipped / skim-only topic list when time is short
- AI plan generation via one API route, with a rule-based fallback
- Guest plan saved in localStorage; dark (default) and light themes; accessible, mobile-first UI

## Added after v1 (originally out of scope, now built)
- Accounts/login (Supabase email and password)
- Multiple saved exams per account ("My exams")
- Notes per exam
- AI-generated or hand-written flashcards and multiple-choice quizzes per exam
- Calendar export (.ics download, works without an account)
- Push reminders before each block (web push, needs sign-in)
- "I'm panicking" 60-second breathing exercise, "I'm behind" re-plan from now, syllabus paste or photo to topics (AI also stars the ones that usually matter most; rule-based fallback for text), "Explain it fast" (5 bullets plus a memory trick), calm coach lines that follow your progress and panic score, morning-of 15-minute checklist
- Exam-day countdown screen, AI quick check after each study block (wrong answers mark the topic shaky and add a 10-minute revisit), study buddy live link, focus mode, and a 1-5 stress score that makes the plan gentler
- Installable PWA with offline app shell, block-start notifications (in-page, plus server push for signed-in users), chime and vibration, and a Settings page
- Past exams (local history with blocks completed), plan share as a picture (native share sheet or download), calendar export with 5-minute alarms, and a 3-card swipe intro with Skip
- Guest mode still works with no account: plan, localStorage, print, .ics

## Still out of scope
Two-way calendar sync (Google/Outlook API), email/SMS reminders, sharing exams between users, teacher/admin features.

## Done when
- Landing to full timed plan in under a minute
- Sleep time is never violated; ordering rules hold
- "Now" and checkboxes work; plan survives refresh
- Plan still produced when the AI call fails
- Good on a phone, basic accessibility checks pass
- Deployed on Vercel from a public GitHub repo with scope.md, prd.md, spec.md
