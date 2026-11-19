"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: null });
  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Имейл
        <input name="email" type="email" autoComplete="username" required className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Парола
        <input name="password" type="password" autoComplete="current-password" required className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-ink" />
      </label>
      {state.error && (
        <p role="alert" className="border-l-2 border-adverse px-3 text-sm text-ink">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="min-h-11 rounded-sm bg-ink px-4 text-sm font-medium text-bg disabled:opacity-60">
        {pending ? "Проверка…" : "Вход"}
      </button>
    </form>
  );
}
