"""Extract text runs (EMR_EXTTEXTOUTW, type 84) with their reference coordinates from an EMF file.

This is NOT OCR: EMF stores glyph strings as vector records, so the printed text is recovered
exactly. Output: JSON list of {x, y, text}. Usage: python3 -I emf_text.py <file.emf> [out.json]
"""
import json
import struct
import sys


def runs(data):
    off, out = 0, []
    while off + 8 <= len(data):
        rtype, size = struct.unpack_from("<II", data, off)
        if size < 8 or off + size > len(data):
            break
        if rtype == 84:  # EMR_EXTTEXTOUTW
            # header(8) + rclBounds(16) + iGraphicsMode(4) + exScale(4) + eyScale(4) = 36 → EMRTEXT
            ref_x, ref_y, nchars, off_string = struct.unpack_from("<iiII", data, off + 36)
            raw = data[off + off_string : off + off_string + nchars * 2]
            text = raw.decode("utf-16-le", errors="replace")
            if text.strip():
                out.append({"x": ref_x, "y": ref_y, "text": text})
        if rtype == 14:  # EMR_EOF
            break
        off += size
    return out


if __name__ == "__main__":
    r = runs(open(sys.argv[1], "rb").read())
    if len(sys.argv) > 2:
        json.dump(r, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"{len(r)} text runs")
