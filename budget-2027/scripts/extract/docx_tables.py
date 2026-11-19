"""Extract every table of a DOCX into JSON with coordinates (table index, row, column).

Usage: python3 -I docx_tables.py <input.docx> <output.json> [<original file>]
When the DOCX was converted from another format (e.g. the RTF bills, via LibreOffice), pass the
original file: `file` and `sha256` then identify the original, and `via` records the conversion.
Output records keep the exact printed cell text; normalisation happens in TypeScript.
Each table also records the nearest preceding heading/paragraph text as `caption`,
so a value can be cited as "<document>, таблица <n> (<caption>), ред <r>, колона <c>".
"""
import hashlib
import json
import sys

import docx
from docx.table import Table
from docx.text.paragraph import Paragraph


def iter_blocks(doc):
    body = doc.element.body
    for child in body.iterchildren():
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            yield Paragraph(child, doc)
        elif tag == "tbl":
            yield Table(child, doc)


def main(src, out, original=None):
    data = open(original or src, "rb").read()
    doc = docx.Document(src)
    tables, prev_texts, paragraphs = [], [], []
    for block in iter_blocks(doc):
        if isinstance(block, Paragraph):
            t = block.text.strip()
            if t:
                prev_texts = (prev_texts + [t])[-3:]
                paragraphs.append({"index": len(paragraphs), "afterTable": len(tables) - 1, "text": t})
            continue
        rows = []
        for r in block.rows:
            cells, seen = [], set()
            for c in r.cells:
                # merged cells repeat the same object; keep position but mark duplicates
                key = id(c._tc)
                cells.append("" if key in seen else c.text.strip())
                seen.add(key)
            rows.append(cells)
        tables.append({"index": len(tables), "context": prev_texts[:], "rows": rows})
    json.dump(
        {
            "file": (original or src).rsplit("/", 1)[-1],
            "sha256": hashlib.sha256(data).hexdigest(),
            **({"via": "LibreOffice → DOCX"} if original else {}),
            "tables": tables,
            "paragraphs": paragraphs,
        },
        open(out, "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=1,
    )
    print(f"{len(tables)} tables, {len(paragraphs)} paragraphs → {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
