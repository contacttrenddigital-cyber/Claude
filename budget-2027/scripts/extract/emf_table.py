"""Rebuild a numeric table from the vector text of an EMF image (Annex 3 of the 2027 bill).

Columns are anchored on the year header runs (e.g. "2025".."2029"); numbers are right-aligned,
so a run belongs to column i when header_x[i] - SLACK <= x < header_x[i+1] - SLACK.
Rows are grouped by baseline y. Output keeps exact printed strings plus coordinates.
Usage: python3 -I emf_table.py <out.json> <label> <file.emf> [<file.emf> ...]
"""
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import emf_text  # noqa: E402

SLACK = 15
NUM = re.compile(r"^-?\d{1,3}( \d{3})*(,\d+)?%?$")


def table(path, page):
    data = open(path, "rb").read()
    runs = emf_text.runs(data)
    years = sorted((r for r in runs if re.fullmatch(r"20\d\d", r["text"].strip())), key=lambda r: r["x"])
    header_y = years[0]["y"] if years else None
    cols = [(int(r["text"].strip()), r["x"]) for r in years if r["y"] == header_y]
    bounds = [x - SLACK for _, x in cols] + [10**9]

    def column_of(x):
        for i, (year, _) in enumerate(cols):
            if bounds[i] <= x < bounds[i + 1]:
                return str(year)
        return None

    # status row ("Отчет", "Очаквано", "Проект", "Прогноза") printed just under the years
    statuses = {}
    for r in runs:
        t = r["text"].strip()
        if header_y is not None and header_y < r["y"] <= header_y + 40 and re.fullmatch(r"[А-Яа-я.]+", t):
            col = column_of(r["x"] + 10)
            if col and t not in ("Показатели",):
                statuses[col] = t
    lines = {}
    for r in runs:
        lines.setdefault(r["y"], []).append(r)
    rows = []
    for y in sorted(lines):
        if header_y is not None and y <= header_y + 40:  # header block (years, status, unit)
            continue
        items = sorted(lines[y], key=lambda r: r["x"])
        label = " ".join(r["text"].strip() for r in items if not NUM.match(r["text"].strip())).strip()
        cells = {}
        for r in items:
            t = r["text"].strip()
            if not NUM.match(t):
                continue
            for i, (year, _) in enumerate(cols):
                if bounds[i] <= r["x"] < bounds[i + 1]:
                    if str(year) in cells:
                        raise SystemExit(f"{path}: two values in column {year} at y={y}")
                    cells[str(year)] = {"text": t, "x": r["x"], "y": y}
        if label or cells:
            rows.append({"page": page, "y": y, "label": label, "cells": cells})
    return {
        "file": Path(path).name,
        "sha256": hashlib.sha256(data).hexdigest(),
        "page": page,
        "columns": [c for c, _ in cols],
        "statuses": statuses,
        "rows": rows,
    }


if __name__ == "__main__":
    out, label, files = sys.argv[1], sys.argv[2], sys.argv[3:]
    pages = [table(f, i + 1) for i, f in enumerate(files)]
    json.dump({"label": label, "pages": pages}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{sum(len(p['rows']) for p in pages)} rows → {out}")
