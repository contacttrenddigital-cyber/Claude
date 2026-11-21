"""Performance indicators from the programme budget PDFs (52-602-01-71.zip annex).

Usage: python -I indicators.py <dir with PDFs> <output.json>     (needs pdfplumber: pip install pdfplumber)

Every programme prints a table "Показатели за изпълнение | Мерна единица | <year columns>". We keep each
row as printed: the indicator name, the unit and the text of each year cell ("95 %", "Съгласно приетите
срокове", "4 пъти годишно"). Nothing is converted or computed. A year cell is read from the columns under
its header label; a row whose cells cannot be placed under the year labels is kept with "complete": false.
The programme is the last "XXXX.YY.ZZ" code printed on the page above (or in) the table.
"""
import hashlib
import json
import os
import re
import sys

import pdfplumber

CODE = re.compile(r"(\d{4}\.\d{2}\.\d{2})")
YEAR = re.compile(r"(Отчет|Закон|Проект|Прогноза|Цел|Целева)[^0-9]{0,20}(20\d\d)")


def clean(c):
    return re.sub(r"\s+", " ", (c or "").replace("\n", " ")).strip()


def header_index(rows):
    """Row with the "Мерна единица" column of an indicator table, and the kind of indicators under it."""
    for i, r in enumerate(rows):
        text = " ".join(clean(c) for c in r)
        if "единица" not in text:
            continue
        around = " ".join(clean(c) for rr in rows[max(0, i - 3) : i + 2] for c in rr)
        if re.search(r"Ползи|ефект", text):
            return i, "полза/ефект"
        if re.search(r"[Пп]оказател|ПОКАЗАТЕЛ", around):
            return i, "изпълнение"
    return None, None


def year_columns(rows, h):
    """[(col, year)] from the header row and the next two rows (labels may be split over two rows)."""
    cols = {}
    for r in rows[max(0, h - 2) : h + 3]:
        for j, c in enumerate(r):
            t = clean(c)
            m = YEAR.search(t) or (re.fullmatch(r"(20\d\d)\s*г?\.?", t) and re.match(r"(.*?)(20\d\d)", t))
            if m:
                y = m.group(2)
                if y not in cols.values():
                    cols[j] = y
    return sorted(cols.items())


def parse(pdf_path):
    out = []
    with pdfplumber.open(pdf_path) as pdf:
        last_code = None
        for pno, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            codes = [c for c in CODE.findall(text) if not c.endswith(".00.00")]
            if not codes:
                # Народно събрание: "Програма 3 „…“" headings without codes
                codes = [f"Програма {n}" for n in re.findall(r"Програма\s+(\d{1,2})\s*[„\"“]", text)]
            page_code_before = last_code
            if codes:
                last_code = codes[-1]
            if not re.search(r"[Пп]оказатели|ПОКАЗАТЕЛИ|Ползи", text):
                continue
            for tb in page.extract_tables():
                h, kind = header_index(tb)
                if h is None:
                    continue
                inside = [c for r in tb[:h] for c in CODE.findall(" ".join(clean(x) for x in r)) if not c.endswith(".00.00")]
                prog = inside[-1] if inside else (codes[0] if codes else page_code_before)
                unit_col = next((j for j, c in enumerate(tb[h]) if "единица" in clean(c)), None)
                ycols = year_columns(tb, h)
                if unit_col is None or not ycols:
                    continue
                spans = [(j, (ycols[k + 1][0] if k + 1 < len(ycols) else len(tb[h])), y) for k, (j, y) in enumerate(ycols)]
                y0 = ycols[0][0]
                for r in tb[h + 1 :]:
                    # data cells can sit one column left of their header (merged header cells)
                    cells = [(j, clean(c)) for j, c in enumerate(r) if clean(c)]
                    if not cells:
                        continue
                    # the unit is the cell next to the "Мерна единица" header (±1 column), right of the name
                    cand = [(j, c) for j, c in cells if abs(j - unit_col) <= 1 and j < y0 and j > cells[0][0]]
                    cand.sort(key=lambda jc: (abs(jc[0] - unit_col), jc[0]))
                    unit_j = cand[0][0] if cand else None
                    unit = cand[0][1] if cand else ""
                    stop = unit_j if unit_j is not None else y0 - 1
                    name = " ".join(c for j, c in cells if j < stop)
                    floor = unit_j if unit_j is not None else -1
                    if not name or YEAR.search(name) or re.match(r"(Показатели|Ползи|Мерна)", name):
                        continue
                    vals = {}
                    for j, end, y in spans:
                        hi = max(end - 1, j + 1)
                        vals[y] = next((c for jj, c in cells if j - 1 <= jj < hi and jj > floor), "")
                    # a unit word read into a year cell (shifted layout): move it to the unit, leave the year empty
                    for y, v in list(vals.items()):
                        if re.fullmatch(r"(брой|бр\.?|%|процент.*|лица|срок|брой доброволци)", v, re.I):
                            unit = unit or v
                            vals[y] = ""
                    filled = [v for v in vals.values() if v]
                    if not filled:
                        # a sub-heading row ("Подготвени позиции …, свързани с:")
                        out.append({"program": prog, "page": pno, "heading": name})
                        continue
                    out.append({"program": prog, "page": pno, "kind": kind, "name": name, "unit": unit, "values": vals, "complete": len(filled) == len(vals)})
    return out


def main(src, dst):
    res = []
    for name in sorted(os.listdir(src)):
        if not re.match(r"^\d{4}.*\.pdf$", name, re.I):
            continue
        path = os.path.join(src, name)
        rows = parse(path)
        res.append({"code": name[:4], "file": name, "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest(), "indicators": rows})
        n = sum(1 for r in rows if "name" in r)
        print(f"{name[:4]}: {n} indicators, {sum(1 for r in rows if r.get('complete'))} complete", file=sys.stderr)
    json.dump({"source": "52-602-01-71.zip", "units": res}, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
