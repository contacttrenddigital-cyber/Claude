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

Some spending units (e.g. МОН, Администрация на президента) print no such per-programme table. For them
we read the yearly summary tables instead ("Отчет 2024 г.", …, "Проект за 2027 г.", "Прогноза за 2029 г."):
one row per programme code with the columns "Общо разходи", "По бюджета на ПРБ", "По други бюджети и
сметки за средства от ЕС", … — the first two numbers are taken as total and budget. These rows are
marked "method": "year-tables" and go through the same ceiling reconciliation.
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
BUD_TAIL = re.compile(r"^\s*\((?:І|I)\.\s*1\s*\+\s*(?:ІІ|II)\.\):?")
YEARS = ["2024", "2025", "2026", "2027", "2028", "2029"]
QUOTED = re.compile(r"[„\"“'”]\s*([^„“”\"]{3,}?)\s*[“”\"]")


YEAR_LABEL = re.compile(r"(Отчет|Закон|Проект|Прогноза)\s*(?:за\s*)?(20\d\d)\s*г")
ROW = re.compile(r"^\s*(\d{4}\.\d{2}\.\d{2})\b(.*)$")
# numbers in the yearly tables: "1 191 389,8", "5173.8", "0,0" or a bare "0"
YNUM = re.compile(r"(?<![\d.,])-?\d{1,3}(?:[ \u00a0]\d{3})+(?:[,.]\d+)?(?![\d])|(?<![\d.,])-?\d+(?:[,.]\d+)?(?![\d.,])")


def ynums(text):
    return [n.replace(" ", "").replace("\u00a0", "").replace(",", ".") for n in YNUM.findall(text)]


NUMBERED = re.compile(r"^\s*Програма\s+(\d{1,2})\.(.*)$")
NUMBERED_HEADING = re.compile(r"^\s*Програма\s+(\d{1,2})\s*[„\"“]\s*(.+?)\s*[”“\"]\s*$")


def numbered_programs(lines, page_of):
    """Units that print "Програма 1. …" rows without codes (Народно събрание): {N: {year: (total, budget, page)}}, names."""
    out, year = {}, None
    for i, l in enumerate(lines):
        labels = YEAR_LABEL.findall(l)
        if len(labels) == 1:
            year = labels[0][1]
        elif len(labels) > 1:
            year = None
        if year not in YEARS:
            continue
        m = NUMBERED.match(l)
        if not m:
            continue
        n = ynums(m.group(2))
        if len(n) >= 3:
            out.setdefault(int(m.group(1)), {}).setdefault(year, (n[0], n[1], page_of[i]))
    names = {}
    for i, l in enumerate(lines):
        if not re.match(r"^\s*Програма\s+\d{1,2}\s*[„\"“]", l):
            continue
        # the heading may wrap over up to three lines before the closing quote
        text = l
        for nxt in lines[i + 1 : i + 3]:
            if re.search(r"[”“\"]\s*$", text.strip()):
                break
            text += " " + nxt.strip()
        h = NUMBERED_HEADING.match(re.sub(r"\s+", " ", text))
        if h and int(h.group(1)) not in names:
            names[int(h.group(1))] = h.group(2)
    return out, names


def year_tables(lines, page_of):
    """code → {year: (total, budget)} from the yearly summary tables; only lines inside a year's table."""
    out, year = {}, None
    for i, l in enumerate(lines):
        labels = YEAR_LABEL.findall(l)
        if len(labels) == 1:
            year = labels[0][1]
        elif len(labels) > 1:
            year = None  # a header of a multi-year table: not a yearly summary
        if year is None or year not in YEARS:
            continue
        m = ROW.match(l)
        if not m:
            continue
        # some PDFs print a space after the decimal point: "1 489. 9" → "1 489.9"
        n = ynums(re.sub(r"(\d)\.\s(\d)(?!\d)", r"\1.\2", m.group(2)))
        if len(n) < 3:
            continue
        out.setdefault(m.group(1), {})
        out[m.group(1)].setdefault(year, (n[0], n[1], page_of[i]))
    return out


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


# some PDFs (МВнР) split words in the text layer: "О бщо", "бюдже та", "Прое кт"; only these keywords are re-joined
KEYWORDS = ["Общо", "бюджета", "Отчет", "Проект", "Прогноза", "Закон", "евро"]
KEYWORD_RE = [(re.compile(r"(?<![А-Яа-я])" + r" ?".join(map(re.escape, w)) + r"(?![А-Яа-я])"), w) for w in KEYWORDS]


def norm(line):
    for rx, w in KEYWORD_RE:
        line = rx.sub(w, line)
    return line


def parse(pdf):
    text = subprocess.run(["pdftotext", "-layout", pdf, "-"], check=True, capture_output=True).stdout.decode("utf-8")
    lines = [norm(l) for l in text.split("\n")]
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
        # amounts are read after the row label (the label itself has digits: "(І.1+ІІ.)")
        total = ynums(l[TOT.search(l).end():])
        budget = ynums(lines[bud_idx][BUD.search(lines[bud_idx]).end():]) if bud_idx is not None else []
        if bud_idx is None:
            # the label can wrap: "Общо разходи по бюджета" / "(І.1+ІІ.):   98 602,6 …"
            for k in range(len(block) - 1):
                if re.search(r"Общо разходи по бюджета\s*$", block[k]):
                    m2 = BUD_TAIL.match(block[k + 1])
                    if m2:
                        bud_idx = start + k + 1
                        budget = ynums(block[k + 1][m2.end():])
                        break
                    # or: label / amounts / "(І.1+ІІ.):" (Сметна палата)
                    if k + 2 < len(block) and BUD_TAIL.match(block[k + 2]) and len(ynums(block[k + 1])) == 6:
                        bud_idx = start + k + 1
                        budget = ynums(block[k + 1])
                        break
        if code is None or code in seen:
            continue  # ministry-level summary or a repeated block
        seen.add(code)
        progs.append(
            {
                "code": code,
                "name": nm.get(code),
                "page": page_of[i],
                # the reconciled column is "по бюджета"; a cut "Общо разходи (І.+ІІ.+ІІІ.)" row stays empty
                "complete": len(budget) == 6,
                "total": dict(zip(YEARS, total)) if len(total) == 6 else {},
                "budget": dict(zip(YEARS, budget)) if len(budget) == 6 else {},
                "printed": {"total": l.strip(), "budget": lines[bud_idx].strip() if bud_idx is not None else None},
            }
        )
    # second reading from the yearly summary tables (used for units without the per-programme table, for
    # programmes it could not read, and — in TypeScript — when the first reading does not match the ceiling)
    yt = year_tables(lines, page_of)

    # a programme is a leaf code: "XXXX.YY.ZZ", or "XXXX.YY.00" when nothing is printed under it
    # (e.g. "1700.03.00 Бюджетна програма „Администрация“"); "XXXX.00.00" is the unit total
    def leaf(c):
        u, a, b = c.split(".")
        if a == "00":
            return False
        # children are matched by the middle number only: МИДТ prints the programmes of 7400.02.00 as 7500.02.xx
        return b != "00" or not any(o != c and o.split(".")[1] == a and o.split(".")[2] != "00" for o in yt)

    by_code = {p["code"]: p for p in progs}

    def from_tables(c):
        ys = yt[c]
        return {
            "code": c,
            "name": (by_code.get(c) or {}).get("name") or nm.get(c),
            "page": ys["2027"][2],
            "complete": True,
            "method": "year-tables",
            "total": {y: v[0] for y, v in sorted(ys.items())},
            "budget": {y: v[1] for y, v in sorted(ys.items())},
            "printed": {"total": None, "budget": None},
        }

    alt = [from_tables(c) for c in yt if leaf(c) and "2027" in yt[c]]
    if not progs and not alt:
        nums_, nm2 = numbered_programs(lines, page_of)
        progs = [
            {
                "code": f"Програма {k}",
                "name": nm2.get(k),
                "page": v["2027"][2],
                "complete": True,
                "method": "year-tables",
                "total": {y: t[0] for y, t in sorted(v.items())},
                "budget": {y: t[1] for y, t in sorted(v.items())},
                "printed": {"total": None, "budget": None},
            }
            for k, v in sorted(nums_.items())
            if "2027" in v
        ]
    if alt and (not progs or not all(p["complete"] for p in progs)):
        # mixed: keep what the per-programme tables read completely, fill the rest from the yearly tables
        progs = [by_code[a["code"]] if by_code.get(a["code"], {}).get("complete") else a for a in alt]
        alt = []
    return progs, alt


def main(src, dst):
    out = []
    for name in sorted(os.listdir(src)):
        if not re.match(r"^\d{4}.*\.pdf$", name, re.I):
            continue
        path = os.path.join(src, name)
        progs, alt = parse(path)
        entry = {"code": name[:4], "file": name, "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest(), "programs": progs}
        if alt:
            entry["alt"] = alt
        out.append(entry)
        print(f"{name[:4]}: {len(progs)} programmes, {sum(p['complete'] for p in progs)} complete", file=sys.stderr)
    json.dump({"source": "52-602-01-71.zip", "ministries": out}, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
