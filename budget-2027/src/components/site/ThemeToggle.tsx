"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const LABEL: Record<Theme, string> = { light: "Светла", dark: "Тъмна", system: "Системна" };
const NEXT: Record<Theme, Theme> = { system: "dark", dark: "light", light: "system" };

function read(): Theme {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => setTheme(read()), []);

  function apply(t: Theme) {
    setTheme(t);
    try {
      if (t === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch {
      /* storage unavailable: still apply for this page view */
    }
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }

  return (
    <button
      type="button"
      onClick={() => apply(NEXT[theme])}
      className="min-h-11 rounded-sm border border-rule-strong px-3 text-xs text-ink-2 hover:border-ink hover:text-ink"
      aria-label={`Тема: ${LABEL[theme]}. Смени темата.`}
    >
      Тема: {LABEL[theme]}
    </button>
  );
}
