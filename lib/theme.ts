export type Theme = "dark" | "light";

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("epb:theme", t);
  } catch {
    /* ignore */
  }
}
