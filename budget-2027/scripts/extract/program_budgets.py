"""Extract programme expenditure from the ministries' programme budget PDFs (52-602-01-71.zip annex).

Usage: python3 -I program_budgets.py <dir with PDFs> <output.json>
Requires `pdftotext` (poppler) on PATH.

Every programme has a standard table "Бюджетна прогноза по ведомствени и администрирани разходни
параграфи на програмата" with six columns: Отчет 2024, Отчет 2025, Закон 2026, Проект 2027,
Прогноза 2028, Прогноза 2029 (хил. €). We take two printed rows of it:
  "Общо разходи по бюджета (І.1+ІІ.)"  – the spending unit's own budget (comparable to its ceiling)
  "Общо разходи (І.+ІІ.+ІІІ.)"          – including other budgets and EU funds
Only rows with all six numbers are kept as complete. The programme code is the last code printed in
the block before the row; the name is taken from where the document prints "<code> Бюджетна програма „…“".
Nothing is summed here: reconciliation with the ceilings happens in TypeScript.
"""
import hashlib
import json
import os
import re
import subprocess
import sys

NUM = re.compile(r"(?<![\d.,])-?\d{1,3}(?: \d{3})*[,.]\d(?!\d)")
CODE = re.compile(r"(\d{4}\.\d{2}\.\d{2})")
TOT = re.compile(r"Общо разходи\s*\((?:І|I)\.\s*\+\s*(?:II|ІІ)\.\s*\+\s*(?:ІІІ|III)\.\)")
BUD = re.compile(r"Общо разходи по бюджета\s*\((?:І|I)\.\s*1\s*\+\s*(?:ІІ|II)\.\)")
YEARS = ["2024", "2025", "2026", "2027", "2028", "2029"]
QUOTED = re.compile(r"[„\"“'”]\s*([^„“”\"]{3,}?)\s*[“”\"]")


def nums(line):
    return [n.replace(" ", "").replace(",", ".") for n in NUM.findall(line or "")]


def names(lines):
    """code → printed programme name (prefer mixed case over ALL CAPS)."""
    found = {}
    for i, l in enumerate(lines):
        for m in CODE.finditer(l):
            code = m.group(1)
            if code.endswith(".00.00"):
                continue
            tail = l[m.end():]
            if not re.search(r"програм", l, re.I):
                # "2500.01.01 Спорт за учащи": a bare heading with the name and no amounts
                bare = re.split(r"\s{3,}", tail.strip())[0]
                if bare and not NUM.search(tail) and re.match(r"^[А-Яа-я„\"]", bare) and code not in found:
                    found[code] = (bare.strip("„“”\" "), True)
                continue
            # the name may wrap; table columns ("Отчет …") are cut off
            text = " ".join([tail] + [re.split(r"\s{3,}", x.strip())[0] for x in lines[i + 1 : i + 3]])
            text = re.split(r"\s{3,}(?:Отчет|Закон|Проект|Прогноза)", text)[0]
            q = QUOTED.search(re.sub(r"\s+", " ", text))
            if not q:
                continue
            name = q.group(1).strip()
            caps = name.upper() == name
            if code not in found or (found[code][1] and not caps):
                found[code] = (name, caps)
    # a name with amounts or a "№" inside is a mis-read of the table layout: drop it
    return {k: v[0].rstrip(".") for k, v in found.items() if not NUM.search(v[0]) and "№" not in v[0] and len(v[0]) >= 8}


def parse(pdf):
    text = subprocess.run(["pdftotext", "-layout", pdf, "-"], check=True, capture_output=True).stdout.decode("utf-8")
    lines = text.split("\n")
    page_of = []
    page = 1
    for l in lines:
        page_of.append(page)
        page += l.count("\f")
    nm = names(lines)
    progs, prev, seen = [], 0, set()
    for i, l in enumerate(lines):
        if not TOT.search(l):
            continue
        block = lines[prev : i + 1]
        start = prev
        prev = i + 1
        code = None
        for bl in block:
            for m in CODE.finditer(bl):
                if not m.group(1).endswith(".00.00"):
                    code = m.group(1)
        bud_idx = next((start + k for k, b in enumerate(block) if BUD.search(b)), None)
        total = nums(l)
        budget = nums(lines[bud_idx]) if bud_idx is not None else []
        if code is None or code in seen:
            continue  # ministry-level summary or a repeated block
        seen.add(code)
        progs.append(
            {
                "code": code,
                "name": nm.get(code),
                "page": page_of[i],
                "complete": len(total) == 6 and len(budget) == 6,
                "total": dict(zip(YEARS, total)) if len(total) == 6 else {},
                "budget": dict(zip(YEARS, budget)) if len(budget) == 6 else {},
                "printed": {"total": l.strip(), "budget": lines[bud_idx].strip() if bud_idx is not None else None},
            }
        )
    return progs


def main(src, dst):
    out = []
    for name in sorted(os.listdir(src)):
        if not re.match(r"^\d{4}.*\.pdf$", name, re.I):
            continue
        path = os.path.join(src, name)
        progs = parse(path)
        out.append({"code": name[:4], "file": name, "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest(), "programs": progs})
        print(f"{name[:4]}: {len(progs)} programmes, {sum(p['complete'] for p in progs)} complete", file=sys.stderr)
    json.dump({"source": "52-602-01-71.zip", "ministries": out}, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
