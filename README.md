# Exam Panic Button

Tell it when your exam is and what you still don't know, and get a calm, hour-by-hour revision plan for tonight.

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY
npm run dev
```

Without an API key the app uses its built-in rule-based planner, so it always works. See `scope.md`, `prd.md`, `spec.md`.

## Optional services
Copy `.env.example` to `.env.local` and fill in what you want:
- `GROQ_API_KEY` (or `ANTHROPIC_API_KEY`): AI plans, flashcards, quizzes and syllabus parsing. Groq wins if both are set
- Supabase keys (run `supabase/schema.sql` first): accounts, saved exams, notes, flashcards, quizzes
- VAPID keys, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`: push reminders
