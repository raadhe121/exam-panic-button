-- Run this once in the Supabase SQL editor.
create extension if not exists "pgcrypto";

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  timing jsonb not null,
  topics jsonb not null,
  plan jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  topic text not null default '',
  body text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  topic text not null default '',
  front text not null,
  back text not null,
  known boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  topic text not null default '',
  question text not null,
  options jsonb not null,
  answer int not null,
  explanation text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  fire_at timestamptz not null,
  title text not null,
  body text not null default '',
  sent boolean not null default false
);
create index if not exists reminders_due on reminders (sent, fire_at);

alter table exams enable row level security;
alter table notes enable row level security;
alter table flashcards enable row level security;
alter table quiz_questions enable row level security;
alter table push_subscriptions enable row level security;
alter table reminders enable row level security;

do $$
declare t text;
begin
  foreach t in array array['exams','notes','flashcards','quiz_questions','push_subscriptions','reminders']
  loop
    execute format('drop policy if exists "own rows" on %I', t);
    execute format('create policy "own rows" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
