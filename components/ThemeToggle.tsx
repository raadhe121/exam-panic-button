"use client";

import { useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("epb:theme", next);
        } catch {
          /* ignore */
        }
        setTheme(next);
      }}
    >
      {next === "light" ? "Light mode" : "Dark mode"}
    </button>
  );
}
