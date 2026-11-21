"use client";

/**
 * Cited table: every row comes from an official table (TableData) and shows its exact printed values.
 * Optional client-side search. Long tables scroll inside their own box (no page overflow).
 */
import { useMemo, useState } from "react";
import type { TableData } from "@/lib/ingest/snapshot-schema";
import { fmtNum, VINTAGE_SHORT } from "@/lib/format";

type Row = TableData["rows"][number];

interface Props {
  table: TableData;
  columns?: string[];
  sourceUrl: string;
  sourceTitle: string;
  searchable?: boolean;
  maxHeight?: string;
  /** mark rows whose printed text differs between two columns */
  highlightChanges?: [string, string];
  /** row label → link, for drill-down */
  links?: Record<string, string>;
  /** row indexes to show (default: all) */
  only?: number[];
}

function show(c: { value: string | null; text: string } | undefined, unit: string) {
  if (!c) return "";
  if (c.value === null) return c.text || "—";
  const dp = c.value.includes(".") ? c.value.split(".")[1]!.length : 0;
  if (c.text.trim().endsWith("%") || unit === "%") return `${fmtNum(c.value, dp)}%`;
  if (unit === "") return c.text;
  return fmtNum(c.value, Math.max(1, Math.min(2, dp)));
}

export function TableView({ table, columns, sourceUrl, sourceTitle, searchable, maxHeight, highlightChanges, links, only }: Props) {
  const [q, setQ] = useState("");
  const cols = table.columns.filter((c) => !columns || columns.includes(c.key));
  const textCols = table.textColumns.filter((c) => c.key !== "no");
  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const base: Row[] = only ? table.rows.filter((r) => only.includes(r.rowIndex)) : table.rows;
    if (!qq) return base;
    return base.filter(
      (r) => r.kind === "total" || `${r.label} ${r.group ?? ""} ${Object.values(r.texts ?? {}).join(" ")}`.toLowerCase().includes(qq),
    );
  }, [q, table.rows, only]);
  const units = [...new Set(cols.map((c) => c.unit).filter(Boolean))];
  const shown = rows.filter((r) => r.kind !== "group").length;

  return (
    <figure className="flex flex-col gap-2">
      {searchable && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex max-w-sm flex-col gap-1 text-xs text-muted">
            Търси в таблицата
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink"
            />
          </label>
          <p className="num text-xs text-muted" aria-live="polite">
            {shown} реда
          </p>
        </div>
      )}
      <div className="overflow-auto rounded-2xl border border-rule bg-surface" style={{ maxHeight }} tabIndex={0} role="region" aria-label={table.title}>
        <table className="num w-full text-sm">
          <caption className="sr-only">{table.title}</caption>
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-rule-strong text-xs text-muted">
              <th scope="col" className="min-w-[12rem] px-3 py-2 text-left font-normal">
                Показател
              </th>
              {cols.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2 text-right font-normal whitespace-nowrap">
                  {c.label}
                  <span className="block text-[10px]">{VINTAGE_SHORT[c.vintage]}</span>
                </th>
              ))}
              {textCols.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2 text-left font-normal">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              if (r.kind === "group")
                return (
                  <tr key={r.rowIndex} className="bg-surface-2">
                    <th
                      scope="rowgroup"
                      colSpan={cols.length + 1 + textCols.length}
                      className="px-3 py-1.5 text-left text-xs font-semibold tracking-wide text-ink-2 uppercase"
                    >
                      {r.label}
                    </th>
                  </tr>
                );
              const allEmpty = cols.every((c) => !(r.cells[c.key]?.text ?? "").trim());
              if (allEmpty && /:$/.test(r.label))
                return (
                  <tr key={r.rowIndex} className="border-b border-rule">
                    <th scope="row" colSpan={cols.length + 1 + textCols.length} className={`px-3 py-1 text-left text-xs font-normal text-muted ${r.level ? "pl-7" : ""}`}>
                      {r.label}
                    </th>
                  </tr>
                );
              const a = highlightChanges ? (r.cells[highlightChanges[0]]?.text ?? "").replace(/\s+/g, " ").trim() : "";
              const b = highlightChanges ? (r.cells[highlightChanges[1]]?.text ?? "").replace(/\s+/g, " ").trim() : "";
              const changed = !!highlightChanges && b !== "" && a !== b;
              const href = links?.[r.label];
              return (
                <tr key={r.rowIndex} className={`border-b border-rule ${changed ? "bg-warning/10" : ""}`}>
                  <th
                    scope="row"
                    style={r.level > 1 ? { paddingLeft: `${0.75 + r.level}rem` } : undefined}
                    className={`px-3 py-1.5 text-left align-top ${r.level ? "pl-7 font-normal text-ink-2" : "font-normal text-ink"} ${r.kind === "total" ? "font-semibold" : ""}`}
                  >
                    {href ? (
                      <a href={href} className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
                        {r.label}
                      </a>
                    ) : (
                      r.label
                    )}
                    {changed && <span className="ml-2 rounded-sm border border-warning px-1 text-[10px] text-warning">промяна</span>}
                  </th>
                  {cols.map((c) => (
                    <td key={c.key} className={`px-3 py-1.5 text-right align-top whitespace-pre-line ${r.kind === "total" ? "font-semibold" : ""}`}>
                      {show(r.cells[c.key], c.unit)}
                    </td>
                  ))}
                  {textCols.map((c) => (
                    <td key={c.key} className="max-w-[22rem] px-3 py-1.5 text-left align-top text-xs text-ink-2">
                      {r.texts?.[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1 + textCols.length} className="px-3 py-4 text-muted">
                  Няма редове, които отговарят на търсенето.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <figcaption className="text-xs text-muted">
        {units.length > 0 && <>Мерна единица: {units.join(", ")}. </>}
        Източник:{" "}
        <a href={sourceUrl} rel="noreferrer" className="underline underline-offset-2">
          {sourceTitle}
        </a>
        , {table.caption}
        {table.tableIndex >= 0 && (
          <>
            {" "}
            (таблица {table.tableIndex} в {table.file})
          </>
        )}
        . Стойностите са отпечатаните в документа; празна клетка = „—“.{" "}
        <a href={`/api/danni/tablitsi/${table.id}?format=csv`} className="underline underline-offset-2">
          Изтегли CSV
        </a>
      </figcaption>
    </figure>
  );
}
