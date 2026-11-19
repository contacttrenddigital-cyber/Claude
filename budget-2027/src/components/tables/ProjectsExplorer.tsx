"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import type { TableData } from "@/lib/ingest/snapshot-schema";
import { fmtNum } from "@/lib/format";

/** Priority investment projects (Приложение към чл. 107): filter by institution, search, sort. */
export function ProjectsExplorer({ table, sourceUrl }: { table: TableData; sourceUrl: string }) {
  const rows = table.rows.filter((r) => r.kind === "data");
  const institutions = [...new Set(rows.map((r) => r.texts?.institution ?? "").filter(Boolean))].sort((a, b) => a.localeCompare(b, "bg"));
  const [inst, setInst] = useState("всички");
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows
      .filter((r) => (inst === "всички" || r.texts?.institution === inst) && (!qq || `${r.label} ${r.texts?.indicator ?? ""}`.toLowerCase().includes(qq)))
      .sort((a, b) => new Decimal(b.cells["2027"]?.value ?? "0").comparedTo(new Decimal(a.cells["2027"]?.value ?? "0")));
  }, [rows, inst, q]);
  const sum = (k: string) => visible.reduce((s, r) => s.plus(r.cells[k]?.value ?? "0"), new Decimal(0));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Отговорна институция
          <select value={inst} onChange={(e) => setInst(e.target.value)} className="min-h-11 max-w-[20rem] rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink">
            <option value="всички">всички ({institutions.length})</option>
            {institutions.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Търси проект
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-11 w-60 max-w-full rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink" />
        </label>
        <p className="num ml-auto text-sm text-ink-2" aria-live="polite">
          {visible.length} проекта · 2027: <strong className="text-ink">{fmtNum(sum("2027").toFixed(1))} хил. €</strong>
        </p>
      </div>
      <ol className="flex flex-col">
        {visible.map((r) => (
          <li key={r.rowIndex} className="grid grid-cols-1 gap-1 border-b border-rule py-2 sm:grid-cols-[minmax(0,1fr)_16rem]">
            <div>
              <p className="text-sm text-ink">{r.label}</p>
              <p className="text-xs text-muted">
                {r.texts?.institution}
                {r.texts?.indicator && r.texts.indicator !== "-" && <> · Индикатор: {r.texts.indicator.slice(0, 200)}</>}
              </p>
            </div>
            <p className="num text-right text-sm">
              <span className="font-semibold text-ink">{r.cells["2027"]?.value ? fmtNum(r.cells["2027"].value) : "—"}</span>
              <span className="block text-xs text-muted">
                2028: {r.cells["2028"]?.value ? fmtNum(r.cells["2028"].value) : "—"} · 2029: {r.cells["2029"]?.value ? fmtNum(r.cells["2029"].value) : "—"}
              </span>
            </p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted">
        хил. €, капиталови разходи по проекта; 2027 — проект, 2028–2029 — прогноза. Източник:{" "}
        <a href={sourceUrl} rel="noreferrer" className="underline underline-offset-2">
          законопроект, приложение към чл. 107, ал. 1
        </a>
        . Сумата в бюджета не означава, че проектът ще бъде изпълнен.
      </p>
    </div>
  );
}
