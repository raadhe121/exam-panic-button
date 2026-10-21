import { verifyUser } from "@/lib/serverAuth";
import { generateQuiz, parseTopics } from "@/lib/study";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!(await verifyUser(req))) return Response.json({ error: "Please sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { topics?: unknown } | null;
  const topics = parseTopics(body?.topics);
  if (!topics) return Response.json({ error: "Please add 1 to 15 topics first." }, { status: 400 });
  const questions = await generateQuiz(topics, 3);
  if (!questions) return Response.json({ error: "Couldn't generate these right now. You can add them by hand instead." }, { status: 502 });
  return Response.json({ questions });
}
