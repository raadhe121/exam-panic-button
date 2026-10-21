import { Suspense } from "react";
import PanicApp from "@/components/PanicApp";

export default function Home() {
  return (
    <Suspense fallback={<p className="text-muted" role="status">Loading...</p>}>
      <PanicApp />
    </Suspense>
  );
}
