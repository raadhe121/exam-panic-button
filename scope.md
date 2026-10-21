# Scope: Exam Panic Button

**Pitch:** Tell it when your exam is and what you still don't know, and it gives you a calm, hour-by-hour revision plan for tonight.

## In scope
- Landing, 3-step flow (Timing, Topics, Generate), plan screen
- Up to 15 topics, each rated Know it / Shaky / No idea, optional star and subject
- Timeline of study, break, long break, final revision and sleep blocks
- "Now" highlight with countdown, per-block checkboxes, progress bar
- Skipped / skim-only topic list when time is short
- AI plan generation via one API route, with a rule-based fallback
- Plan saved in localStorage; dark (default) and light themes; accessible, mobile-first UI

## Out of scope
Accounts/login, multiple exams, notes, flashcards, quizzes, calendar sync, push notifications, database.

## Done when
- Landing to full timed plan in under a minute
- Sleep time is never violated; ordering rules hold
- "Now" and checkboxes work; plan survives refresh
- Plan still produced when the AI call fails
- Good on a phone, basic accessibility checks pass
- Deployed on Vercel from a public GitHub repo with scope.md, prd.md, spec.md
