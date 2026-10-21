import { askClaude } from "./ai";
import { extractJson } from "./validate";

export interface TopicRef {
  name: string;
  subject?: string;
}

export interface CardDraft {
  topic: string;
  front: string;
  back: string;
}

export interface QuestionDraft {
  topic: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function parseTopics(raw: unknown): TopicRef[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 15) return null;
  const out: TopicRef[] = [];
  for (const t of raw) {
    const name = str((t as { name?: unknown })?.name, 80);
    if (!name) return null;
    out.push({ name, subject: str((t as { subject?: unknown }).subject, 40) ?? undefined });
  }
  return out;
}

const list = (topics: TopicRef[]) => topics.map((t) => `- ${t.name}${t.subject ? ` (${t.subject})` : ""}`).join("\n");

export async function generateCards(topics: TopicRef[], perTopic: number): Promise<CardDraft[] | null> {
  const text = await askClaude(
    `You write concise study flashcards. Reply with ONLY JSON: {"cards":[{"topic":string,"front":string,"back":string}]}. ` +
      `Exactly ${perTopic} cards per topic. "topic" must be one of the given topic names. Front is a short question or term, back is a clear answer under 40 words.`,
    `Topics:\n${list(topics)}`,
    4000,
  );
  if (!text) return null;
  const cards = (extractJson(text) as { cards?: unknown[] } | null)?.cards;
  if (!Array.isArray(cards)) return null;
  const names = new Set(topics.map((t) => t.name.toLowerCase()));
  const out: CardDraft[] = [];
  for (const c of cards.slice(0, 80)) {
    const o = c as Record<string, unknown>;
    const topic = str(o?.topic, 80);
    const front = str(o?.front, 300);
    const back = str(o?.back, 500);
    if (topic && front && back && names.has(topic.toLowerCase())) out.push({ topic, front, back });
  }
  return out.length ? out : null;
}

export async function generateQuiz(topics: TopicRef[], perTopic: number): Promise<QuestionDraft[] | null> {
  const text = await askClaude(
    `You write multiple-choice exam practice questions. Reply with ONLY JSON: ` +
      `{"questions":[{"topic":string,"question":string,"options":[string,string,string,string],"answer":number,"explanation":string}]}. ` +
      `Exactly ${perTopic} questions per topic. "topic" must be one of the given topic names. Exactly 4 options, "answer" is the 0-based index of the correct one, ` +
      `explanation is one short sentence.`,
    `Topics:\n${list(topics)}`,
    5000,
  );
  if (!text) return null;
  const qs = (extractJson(text) as { questions?: unknown[] } | null)?.questions;
  if (!Array.isArray(qs)) return null;
  const names = new Set(topics.map((t) => t.name.toLowerCase()));
  const out: QuestionDraft[] = [];
  for (const q of qs.slice(0, 80)) {
    const o = q as Record<string, unknown>;
    const topic = str(o?.topic, 80);
    const question = str(o?.question, 400);
    const opts = Array.isArray(o?.options) ? o.options.map((x) => str(x, 200)) : [];
    const answer = o?.answer;
    if (!topic || !question || opts.length !== 4 || opts.some((x) => !x)) continue;
    if (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) > 3) continue;
    if (!names.has(topic.toLowerCase())) continue;
    out.push({ topic, question, options: opts as string[], answer: answer as number, explanation: str(o.explanation, 300) ?? "" });
  }
  return out.length ? out : null;
}
