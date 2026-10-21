"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { buildLocalPlan } from "@/lib/planner";
import { clearState, loadState, saveState, type AppState, type Stage, type StoredPlan } from "@/lib/storage";
import { checkTiming, defaultTiming } from "@/lib/timing";
import { fromLocalMin, inputToMin, resolveBlocks, roundUp5, toLocalMin } from "@/lib/time";
import { remainingTopics } from "@/lib/replan";
import type { PlanInput, PlanResponse, PlanResult } from "@/lib/types";
import Landing from "./Landing";
import PlanActions from "./PlanActions";
import PlanView from "./PlanView";
import TimingStep from "./TimingStep";
import TopicsStep from "./TopicsStep";
import GenerateStep from "./GenerateStep";

function toStored(res: PlanResponse, input: PlanInput, nap: boolean): StoredPlan | null {
  const start = roundUp5(input.startMin);
  const times = resolveBlocks(res.plan.blocks, start);
  if (!times) return null;
  return {
    examMs: fromLocalMin(input.examMin).getTime(),
    summary: res.plan.summary,
    skipped: res.plan.skipped,
    source: res.source,
    nap,
    studyWindowMin: input.sleepMin - start,
    done: {},
    blocks: res.plan.blocks.map((b, i) => ({
      ...b,
      startMs: fromLocalMin(times[i].startMin).getTime(),
      endMs: fromLocalMin(times[i].endMin).getTime(),
    })),
  };
}

export default function PanicApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("new") ? "new" : params.get("open") ? "open" : null;
  const [replanning, setReplanning] = useState(false);
  const [replanMsg, setReplanMsg] = useState("");

  useEffect(() => {
    const saved = loadState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setState(saved ?? { stage: "landing", timing: defaultTiming(toLocalMin(new Date())), topics: [], plan: null });
  }, []);

  // "My exams" navigates here with ?new=1 or ?open=1. Next can keep this page's old state alive,
  // so react to the intent explicitly instead of relying on a fresh mount.
  useEffect(() => {
    if (!intent) return;
    if (intent === "new") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to a blank exam
      setState({ stage: "timing", timing: defaultTiming(toLocalMin(new Date())), topics: [], plan: null, examId: null });
    } else {
      const saved = loadState();
      if (saved) setState(saved);
    }
    router.replace("/");
  }, [intent, router]);

  useEffect(() => {
    if (state && !intent) saveState(state);
  }, [state, intent]);

  const patch = useCallback((p: Partial<AppState>) => setState((s) => (s ? { ...s, ...p } : s)), []);
  const go = useCallback((stage: Stage) => patch({ stage }), [patch]);

  const generate = async (input: PlanInput, nap: boolean): Promise<StoredPlan | null> => {
    let res: PlanResponse | null = null;
    try {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, nap }),
      });
      if (r.ok) res = (await r.json()) as PlanResponse;
    } catch {
      /* offline or server down: use the local planner below */
    }
    if (!res) {
      const plan: PlanResult = buildLocalPlan({ ...input, nap });
      res = { plan, source: "fallback" };
    }
    return toStored(res, input, nap);
  };

  const timingInput = (topics = state!.topics): PlanInput => ({
    startMin: inputToMin(state!.timing.startAt)!,
    sleepMin: inputToMin(state!.timing.sleepAt)!,
    examMin: inputToMin(state!.timing.examAt)!,
    topics,
  });

  const build = async () => {
    if (!state) return;
    const input = timingInput();
    const nap = checkTiming(state.timing, toLocalMin(new Date())).nap;
    setBuilding(true);
    setBuildError("");
    const minWait = new Promise((r) => setTimeout(r, 900));
    const stored = await generate(input, nap);
    await minWait;
    setBuilding(false);
    if (!stored) {
      setBuildError("Something went wrong while making your plan. Please try again.");
      return;
    }
    patch({ plan: stored, stage: "plan" });
  };

  const replan = async () => {
    if (!state?.plan) return;
    const nowMin = roundUp5(toLocalMin(new Date()));
    const base = timingInput();
    setReplanMsg("");
    if (base.sleepMin - nowMin < 20) {
      setReplanMsg("There's hardly any time left before sleep. Do your final quick revision, then rest. That's the best use of tonight.");
      return;
    }
    const left = remainingTopics(state.topics, state.plan.blocks, state.plan.done);
    if (!left.length) {
      setReplanMsg("You've finished every topic. Nice work. Do the final quick revision, then rest.");
      return;
    }
    setReplanning(true);
    const stored = await generate({ ...base, startMin: nowMin, topics: left }, state.plan.nap);
    setReplanning(false);
    if (!stored) {
      setReplanMsg("Something went wrong while re-planning. Please try again.");
      return;
    }
    stored.replannedAt = Date.now();
    patch({ plan: stored });
  };

  const startOver = () => {
    clearState();
    setState({ stage: "landing", timing: defaultTiming(toLocalMin(new Date())), topics: [], plan: null, examId: null });
  };

  return (
    <div className={state?.stage === "plan" && state.plan ? "w-full" : "mx-auto w-full max-w-2xl"}>
        {!state ? (
          <p className="text-muted" role="status">Loading...</p>
        ) : state.stage === "landing" ? (
          <Landing onStart={() => patch({ stage: "timing", timing: state.plan ? state.timing : defaultTiming(toLocalMin(new Date())) })} />
        ) : state.stage === "timing" ? (
          <TimingStep
            timing={state.timing}
            onChange={(timing) => patch({ timing })}
            onNext={() => go("topics")}
          />
        ) : state.stage === "topics" ? (
          <TopicsStep
            topics={state.topics}
            onChange={(topics) => patch({ topics })}
            onBack={() => go("timing")}
            onNext={() => go("generate")}
          />
        ) : state.stage === "generate" ? (
          <GenerateStep
            state={state}
            building={building}
            error={buildError}
            onBack={() => go("topics")}
            onBuild={build}
          />
        ) : state.plan ? (
          <PlanView
            plan={state.plan}
            onToggle={(i) =>
              setState((s) =>
                s && s.plan ? { ...s, plan: { ...s.plan, done: { ...s.plan.done, [i]: !s.plan.done[i] } } } : s,
              )
            }
            extra={<PlanActions state={state} onSaved={(examId, examName) => patch({ examId, examName })} />}
            onReplan={replan}
            replanning={replanning}
            replanMsg={replanMsg}
            onToggleMorning={(i) =>
              setState((s) =>
                s && s.plan ? { ...s, plan: { ...s.plan, morningDone: { ...s.plan.morningDone, [i]: !s.plan.morningDone?.[i] } } } : s,
              )
            }
            onEdit={() => go("topics")}
            onStartOver={startOver}
          />
        ) : (
          <Landing onStart={() => go("timing")} />
        )}
    </div>
  );
}
