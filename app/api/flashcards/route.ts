import { parseLang } from "@/lib/i18n";
import { verifyUser } from "@/lib/serverAuth";
import { generateCards, parseTopics } from "@/lib/study";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!(await verifyUser(req))) return Response.json({ error: "Please sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { topics?: unknown; lang?: unknown } | null;
  const topics = parseTopics(body?.topics);
  if (!topics) return Response.json({ error: "Please add 1 to 15 topics first." }, { status: 400 });
  const cards = await generateCards(topics, 4, parseLang(body?.lang));
  if (!cards) return Response.json({ error: "Couldn't generate these right now. You can add them by hand instead." }, { status: 502 });
  return Response.json({ cards });
}
