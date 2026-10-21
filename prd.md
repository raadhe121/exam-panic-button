# PRD: Exam Panic Button

## Problem
The night before an exam, students panic: they jump between topics, skip breaks, stay up all night, and spend time on things they already know. They need one clear plan, fast.

## Users
School and college students the night before an exam.

## Goals
1. One calm, specific plan in under a minute.
2. Protect sleep.
3. Spend time where it helps most (weakest and most important topics first).

## User stories
- As a student, I enter my exam time, when I can start and when I want to sleep, so the plan fits my night.
- As a student, I list topics and rate how well I know them, so the plan focuses on what I don't know.
- As a student, I see what to do right now and tick blocks off, so I stay on track.
- As a student with too little time, I'm told honestly what is skipped, without being scared.
- As a student, I can refresh the page and keep my plan.

## Requirements
See the planning rules and flow in spec.md. Key rules: never study after sleep time; No idea and starred topics first, then Shaky, then Know it; breaks after every block; final quick revision before sleep; drop or shorten Know it first when time is short.

## Design principles
Calm tone, dark mode first, large text (16px+), AA contrast, 44px targets, labels as well as colour, full keyboard access.

## Success measures
- Time from landing to plan under 60 seconds.
- Plan always generated, even with no API key or an AI failure.
