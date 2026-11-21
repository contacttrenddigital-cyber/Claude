"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type Theme = "light" | "dark" | "system";
const LABEL: Record<Theme, string> = { light: "Светла", dark: "Тъмна", system: "Системна" };
const NEXT: Record<Theme, Theme> = { dark: "light", light: "system", system: "dark" };

function read(): Theme {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" || t === "system" ? t : "dark";
  } catch {
    return "dark";
  }
}

export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => setTheme(read()), []);

  function apply(t: Theme) {
    setTheme(t);
    try {
      localStorage.setItem("theme", t);
    } catch {
      /* storage unavailable: still apply for this page view */
    }
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }

  const icon = theme === "dark" ? "moon" : theme === "light" ? "sun" : "monitor";
  if (variant === "full")
    return (
      <button
        type="button"
        onClick={() => apply(NEXT[theme])}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule-strong px-4 text-sm text-ink-2 hover:border-ink hover:text-ink"
        aria-label={`Тема: ${LABEL[theme]}. Смени темата.`}
      >
        <Icon name={icon} className="h-4 w-4" />
        Тема: {LABEL[theme]}
      </button>
    );
  return (
    <button
      type="button"
      onClick={() => apply(NEXT[theme])}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
      aria-label={`Тема: ${LABEL[theme]}. Смени темата.`}
      title={`Тема: ${LABEL[theme]}`}
    >
      <Icon name={icon} className="h-5 w-5" />
    </button>
  );
}
