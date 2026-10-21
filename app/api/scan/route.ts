import { askVision } from "@/lib/ai";
import { normalizeTopics } from "@/lib/syllabus";
import { extractJson } from "@/lib/validate";

export const maxDuration = 45;

const SYSTEM = `You read a photo of a syllabus, textbook contents page, notes or whiteboard and turn it into a short list of study topics.
Reply with ONLY JSON: {"topics":[{"name":string,"subject":string,"important":boolean}]}.
Rules: at most 15 topics; merge tiny items and ignore page numbers, dates, marks and instructions; each name under 60 characters; "subject" is the course name if clear, else "".
Set "important": true for at most 3 topics that exams usually weight most, false for the rest. If the image has no readable study content, reply {"topics":[]}.`;

const IMAGE = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { image?: unknown } | null;
  const image = typeof body?.image === "string" ? body.image : "";
  if (!IMAGE.test(image) || image.length > 3_500_000) {
    return Response.json({ error: "That photo couldn't be read. Try a clearer, smaller picture." }, { status: 400 });
  }
  const reply = await askVision(SYSTEM, "Extract the study topics from this photo.", image, 1500);
  if (reply === null) {
    return Response.json({ error: "Couldn't read the photo right now. You can type or paste the topics instead." }, { status: 502 });
  }
  const topics = normalizeTopics((extractJson(reply) as { topics?: unknown } | null)?.topics);
  if (!topics) return Response.json({ error: "We couldn't find any topics in that photo. Try a closer, brighter shot." }, { status: 422 });
  return Response.json({ topics });
}
