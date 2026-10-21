import { dateLocale, translate, type Lang } from "./i18n";
import { loadSettings } from "./settings";
import { DAY, inputToMin, minToInput, roundUp5 } from "./time";
import { MIN_GOOD_SLEEP_MINUTES, NAP_MODE_MINUTES } from "./types";
import type { TimingInputs } from "./storage";

export interface TimingCheck {
  errors: { exam?: string; start?: string; sleep?: string };
  warnings: string[];
  nap: boolean;
  ok: boolean;
}

export function defaultSleep(examMin: number, startMin: number) {
  const full = examMin - loadSettings().sleepHours * 60;
  return examMin - startMin < NAP_MODE_MINUTES ? examMin - 40 : full;
}

export function defaultTiming(nowMin: number): TimingInputs {
  const start = roundUp5(nowMin);
  const day = Math.floor(nowMin / 1440) * 1440;
  let exam = day + 9 * 60;
  while (exam <= start + 60) exam += 1440;
  return {
    startAt: minToInput(start),
    examAt: minToInput(exam),
    sleepAt: minToInput(defaultSleep(exam, start)),
    sleepTouched: false,
    stress: 3,
  };
}

export function checkTiming(t: TimingInputs, nowMin: number): TimingCheck {
  const exam = inputToMin(t.examAt);
  const start = inputToMin(t.startAt);
  const sleep = inputToMin(t.sleepAt);
  const errors: TimingCheck["errors"] = {};
  const warnings: string[] = [];
  if (exam === null) errors.exam = "Please enter your exam date and time.";
  if (start === null) errors.start = "Please enter when you can start studying.";
  if (sleep === null) errors.sleep = "Please enter when you want to sleep.";
  if (exam === null || start === null || sleep === null) return { errors, warnings, nap: false, ok: false };

  const nap = exam - start < NAP_MODE_MINUTES;
  if (exam <= nowMin) errors.exam = "Exam time must be in the future.";
  else if (exam <= start) errors.exam = "Exam time must be after your start time.";
  else if (exam - start < 20) errors.exam = "Your exam is almost here. Take a breath and skim your notes.";
  if (!errors.exam && sleep <= start) errors.sleep = "Sleep time must be after your start time.";
  else if (!errors.exam && sleep >= exam) errors.sleep = "Sleep time must be before your exam.";

  if (!errors.exam && !errors.sleep) {
    if (nap) {
      warnings.push("Your exam is less than 7 hours away, so the plan ends with a short nap instead of full sleep.");
    } else if (exam - sleep < MIN_GOOD_SLEEP_MINUTES) {
      warnings.push("That's under 6 hours of sleep. Sleep helps you remember, so try sleeping a bit earlier if you can.");
    }
    if (sleep - start < 60) warnings.push("You have less than an hour to study. We'll still make you a short, useful plan.");
  }
  return { errors, warnings, nap, ok: !errors.exam && !errors.start && !errors.sleep };
}

const utc = (min: number) => new Date(min * 60000);

/** "Thu 22 Oct" for a local-epoch minute. */
export function shortDate(min: number, lang: Lang = "en") {
  return utc(min)
    .toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(",", "");
}

export function weekday(min: number, lang: Lang = "en") {
  return utc(min).toLocaleDateString(dateLocale(lang), { weekday: "long", timeZone: "UTC" });
}

/** "Today", "Tomorrow", or a short date. With `night`, evening/early-morning times within a day read "Tonight". */
export function dayLabel(min: number, nowMin: number, night = false, lang: Lang = "en") {
  const hour = Math.floor(mod24(min) / 60);
  if (night && min - nowMin < DAY && min >= nowMin && (hour >= 18 || hour < 6)) return translate(lang, "Tonight");
  const diff = Math.floor(min / DAY) - Math.floor(nowMin / DAY);
  if (diff === 0) return translate(lang, "Today");
  if (diff === 1) return translate(lang, "Tomorrow");
  return shortDate(min, lang);
}

const mod24 = (m: number) => ((m % DAY) + DAY) % DAY;

export function clockOf(min: number) {
  const d = mod24(min);
  return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
}

/** First moment after `startMin` whose wall-clock time is `hhmm`. */
export function nextClock(startMin: number, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  let c = Math.floor(startMin / DAY) * DAY + h * 60 + m;
  if (c <= startMin) c += DAY;
  return c;
}
