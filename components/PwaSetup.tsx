"use client";

import { useEffect, useState } from "react";
import { initInstallPrompt } from "@/lib/pwa";

/** Registers the service worker (production only) and shows a calm banner when the connection drops. */
export default function PwaSetup() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    initInstallPrompt();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <p role="status" className="no-print fixed bottom-4 left-1/2 z-40 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border border-line bg-surface px-4 py-3 text-center shadow-lg">
      You&apos;re offline. Your plan still works.
    </p>
  );
}
