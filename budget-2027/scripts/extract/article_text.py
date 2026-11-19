"""Extract metadata and body text from a saved news article (for analysis only, never published).

Usage: python3 -I article_text.py <file.html>  → JSON on stdout
Body = <p> elements inside <article> (or the whole page if absent), in order.
"""
import hashlib
import json
import re
import sys
from html.parser import HTMLParser


class P(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta, self.paras, self.title = {}, [], ""
        self._in_p = self._in_title = 0
        self._skip = 0
        self._buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style", "noscript"):
            self._skip += 1
        if tag == "meta":
            k = a.get("property") or a.get("name") or a.get("itemprop")
            if k and a.get("content"):
                self.meta.setdefault(k, a["content"])
        if tag == "title":
            self._in_title = 1
        if tag in ("p", "h2", "blockquote", "li") and not self._skip:
            self._in_p += 1
            self._buf = []

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self._skip = max(0, self._skip - 1)
        if tag == "title":
            self._in_title = 0
        if tag in ("p", "h2", "blockquote", "li") and self._in_p:
            self._in_p -= 1
            t = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            if len(t) > 40:
                self.paras.append(t)
            self._buf = []

    def handle_data(self, d):
        if self._skip:
            return
        if self._in_title:
            self.title += d
        if self._in_p:
            self._buf.append(d)


raw = open(sys.argv[1], "rb").read()
html = raw.decode("utf-8", errors="replace")
m = re.search(r"<article[\s\S]*?</article>", html)
p = P()
p.feed(m.group(0) if m and len(m.group(0)) > 2000 else html)
meta = P()
meta.feed(html)
json.dump(
    {
        "sha256": hashlib.sha256(raw).hexdigest(),
        "title": (meta.meta.get("og:title") or meta.title).strip(),
        "published": meta.meta.get("article:published_time") or meta.meta.get("datePublished") or meta.meta.get("pubdate"),
        "author": meta.meta.get("author") or meta.meta.get("article:author"),
        "url": meta.meta.get("og:url"),
        "paragraphs": p.paras,
    },
    sys.stdout,
    ensure_ascii=False,
    indent=1,
)
