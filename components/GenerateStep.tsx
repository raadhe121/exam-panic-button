import type { AppState } from "@/lib/storage";
import Stepper from "./Stepper";

export default function GenerateStep({
  state,
  building,
  error,
  onBack,
  onBuild,
}: {
  state: AppState;
  building: boolean;
  error: string;
  onBack: () => void;
  onBuild: () => void;
}) {
  const fmt = (v: string) => v.replace("T", " at ");
  return (
    <section>
      <Stepper step={3} />
      <h1 className="mb-1 text-3xl font-bold">Ready when you are.</h1>
      <p className="mb-6 text-muted">One click and your plan is done.</p>
      <dl className="card mb-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted">Exam</dt>
        <dd>{fmt(state.timing.examAt)}</dd>
        <dt className="text-muted">Start studying</dt>
        <dd>{fmt(state.timing.startAt)}</dd>
        <dt className="text-muted">Sleep</dt>
        <dd>{fmt(state.timing.sleepAt)}</dd>
        <dt className="text-muted">Topics</dt>
        <dd>{state.topics.length}</dd>
      </dl>
      <div aria-live="polite" className="mb-3 min-h-6">
        {building && <p role="status" className="font-semibold">Making your plan...</p>}
        {error && <p role="alert" className="text-danger">{error}</p>}
      </div>
      <div className="flex justify-between gap-3">
        <button type="button" className="btn" onClick={onBack} disabled={building}>Back</button>
        <button type="button" className="btn btn-primary" onClick={onBuild} disabled={building}>
          {building ? "Making your plan..." : "Build my plan"}
        </button>
      </div>
    </section>
  );
}
