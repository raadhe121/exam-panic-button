import type { StoredBlock } from "./storage";

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Builds an .ics calendar (works with Google, Apple and Outlook) from the plan blocks. */
export function buildIcs(blocks: StoredBlock[], examName: string): string {
  const now = stamp(Date.now());
  const events = blocks.map((b, i) => {
    const label = b.type === "break" ? "Break" : (b.topic ?? b.type);
    return [
      "BEGIN:VEVENT",
      `UID:${b.startMs}-${i}@exam-panic-button`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(b.startMs)}`,
      `DTEND:${stamp(b.endMs)}`,
      `SUMMARY:${esc(b.type === "study" ? `Study: ${label}` : label)}`,
      `DESCRIPTION:${esc(`${examName}. ${b.tip}`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT5M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(`Up next: ${label}`)}`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Exam Panic Button//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
}

export function downloadIcs(blocks: StoredBlock[], examName: string) {
  const url = URL.createObjectURL(new Blob([buildIcs(blocks, examName)], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "exam-plan.ics";
  a.click();
  URL.revokeObjectURL(url);
}
