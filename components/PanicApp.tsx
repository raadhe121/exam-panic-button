"use client";

import { useCallback, useEffect, useState } from "react";
import { buildLocalPlan } from "@/lib/planner";
import { clearState, loadState, saveState, type AppState, type Stage, type StoredPlan } from "@/lib/storage";
import { checkTiming, defaultTiming } from "@/lib/timing";
import { fromLocalMin, inputToMin, resolveBlocks, roundUp5, toLocalMin } from "@/lib/time";
import type { PlanInput, PlanResponse, PlanResult } from "@/lib/types";
import Landing from "./Landing";
import PlanView from "./PlanView";
import ThemeToggle from "./ThemeToggle";
import TimingStep from "./TimingStep";
import TopicsStep from "./TopicsStep";
import GenerateStep from "./GenerateStep";

function toStored(res: PlanResponse, input: PlanInput, nap: boolean): StoredPlan | null {
  const start = roundUp5(input.startMin);
  const times = resolveBlocks(res.plan.blocks, start);
  if (!times) return null;
  return {
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

  useEffect(() => {
    const saved = loadState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setState(saved ?? { stage: "landing", timing: defaultTiming(toLocalMin(new Date())), topics: [], plan: null });
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const patch = useCallback((p: Partial<AppState>) => setState((s) => (s ? { ...s, ...p } : s)), []);
  const go = useCallback((stage: Stage) => patch({ stage }), [patch]);

  const build = async () => {
    if (!state) return;
    const startMin = inputToMin(state.timing.startAt)!;
    const input: PlanInput = {
      startMin,
      sleepMin: inputToMin(state.timing.sleepAt)!,
      examMin: inputToMin(state.timing.examAt)!,
      topics: state.topics,
    };
    const nap = checkTiming(state.timing, toLocalMin(new Date())).nap;
    setBuilding(true);
    setBuildError("");
    const minWait = new Promise((r) => setTimeout(r, 900));
    let res: PlanResponse | null = null;
    try {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (r.ok) res = (await r.json()) as PlanResponse;
    } catch {
      /* offline or server down: use the local planner below */
    }
    if (!res) {
      const plan: PlanResult = buildLocalPlan(input);
      res = { plan, source: "fallback" };
    }
    await minWait;
    const stored = toStored(res, input, nap);
    setBuilding(false);
    if (!stored) {
      setBuildError("Something went wrong while making your plan. Please try again.");
      return;
    }
    patch({ plan: stored, stage: "plan" });
  };

  const startOver = () => {
    clearState();
    setState({ stage: "landing", timing: defaultTiming(toLocalMin(new Date())), topics: [], plan: null });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:py-10">
      <header className="no-print mb-6 flex items-center justify-between">
        <span className="font-semibold tracking-tight">Exam Panic Button</span>
        <ThemeToggle />
      </header>
      <main id="main" className="flex-1">
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
            onEdit={() => go("topics")}
            onStartOver={startOver}
          />
        ) : (
          <Landing onStart={() => go("timing")} />
        )}
      </main>
    </div>
  );
}
