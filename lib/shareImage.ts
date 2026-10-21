import type { StoredPlan } from "./storage";

const COLORS = { study: "#5eead4", break: "#6b7686", revision: "#fdba74", sleep: "#a5b4fc" } as const;

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws a shareable 1080 x 1350 picture of the plan and returns it as a PNG blob. */
export async function renderPlanImage(plan: StoredPlan, name: string): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (px: number, weight = 500) => `${weight} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0e13");
  bg.addColorStop(1, "#141a2b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, c] of [[W, 0, "rgba(94,234,212,0.28)"], [0, H, "rgba(167,139,250,0.25)"]] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 700);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const pad = 72;
  ctx.fillStyle = "#5eead4";
  ctx.font = font(28, 700);
  ctx.fillText("EXAM PANIC BUTTON", pad, 110);
  ctx.fillStyle = "#eef2f7";
  ctx.font = font(76, 800);
  ctx.fillText("Tonight's plan", pad, 205);
  ctx.fillStyle = "#9ba7b8";
  ctx.font = font(34);
  const exam = plan.examMs ? new Date(plan.examMs).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "";
  ctx.fillText(`${name || "My exam"}${exam ? `  ·  Exam ${exam}` : ""}`.slice(0, 60), pad, 258);

  // Rows
  const rows = plan.blocks.filter((b) => b.type !== "break" || b.endMs - b.startMs >= 20 * 60000);
  const max = 10;
  const shown = rows.slice(0, max);
  let y = 330;
  const rowH = 90;
  for (const b of shown) {
    const mins = Math.round((b.endMs - b.startMs) / 60000);
    const label =
      b.type === "sleep" ? `Sleep until ${b.end}` : b.type === "break" ? "Break" : (b.topic ?? "Study").replace(/ \((?!revisit)[^)]*\)$/, "");
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    round(ctx, pad, y, W - 2 * pad, rowH - 12, 22);
    ctx.fill();
    ctx.fillStyle = COLORS[b.type];
    ctx.beginPath();
    ctx.arc(pad + 36, y + (rowH - 12) / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9ba7b8";
    ctx.font = `500 30px ui-monospace, Menlo, monospace`;
    ctx.fillText(b.start, pad + 70, y + 51);
    ctx.fillStyle = b.type === "sleep" ? "#b4bffd" : "#eef2f7";
    ctx.font = font(34, 700);
    ctx.fillText(label.slice(0, 26), pad + 220, y + 51);
    ctx.fillStyle = "#9ba7b8";
    ctx.font = font(28);
    const dur = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}` : `${mins}m`;
    ctx.textAlign = "right";
    ctx.fillText(dur, W - pad - 28, y + 50);
    ctx.textAlign = "left";
    y += rowH;
  }
  if (rows.length > max) {
    ctx.fillStyle = "#9ba7b8";
    ctx.font = font(28);
    ctx.fillText(`+ ${rows.length - max} more blocks`, pad + 6, y + 30);
  }

  // Footer
  const study = Math.round(plan.summary.studyMinutes / 60 * 10) / 10;
  ctx.fillStyle = "#eef2f7";
  ctx.font = font(36, 700);
  ctx.fillText(`${study}h study  ·  ${plan.summary.topicsCovered} topics  ·  sleep protected`, pad, H - 120);
  ctx.fillStyle = "#9ba7b8";
  ctx.font = font(28);
  ctx.fillText("You've got this.", pad, H - 70);

  return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("render failed"))), "image/png"));
}

/** Opens the phone's share sheet with the picture, or downloads it where sharing files isn't supported. */
export async function sharePlanImage(plan: StoredPlan, name: string): Promise<"shared" | "downloaded"> {
  const blob = await renderPlanImage(plan, name);
  const file = new File([blob], "my-exam-plan.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My exam plan", text: "My plan for tonight, made with Exam Panic Button." });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-exam-plan.png";
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
