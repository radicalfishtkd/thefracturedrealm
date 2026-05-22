#!/usr/bin/env python3
"""Sync Royal Road chapter list into thefracturedrealm.net's index.html.

Fetches the public TOC for the fiction, compares to the chapter cards already
in index.html, and adds any missing cards in chapter-number order. Also bumps
sitemap.xml's lastmod when changes are made.

Designed to run from a GitHub Action; idempotent (safe to run repeatedly).

Exit code 0 always — the workflow checks for git diff to decide whether to commit.
"""

from __future__ import annotations

import datetime as _dt
import html
import pathlib
import re
import sys
import urllib.request
from typing import Iterable, NamedTuple

FICTION_ID = 154210
FICTION_SLUG = "half-the-truth"
TOC_URL = f"https://www.royalroad.com/fiction/{FICTION_ID}/{FICTION_SLUG}"
USER_AGENT = (
    "Mozilla/5.0 (HalfTheTruthChapterSync/1.0; "
    "+https://github.com/radicalfishtkd/thefracturedrealm)"
)

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX_PATH = REPO_ROOT / "index.html"
SITEMAP_PATH = REPO_ROOT / "sitemap.xml"

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100,
}

# Manually-curated chapter title overrides for chapters whose titles in this
# repo differ from the Royal Road TOC slug. The script will use the canonical
# title from the TOC when no override exists.
TITLE_OVERRIDES: dict[int, str] = {
    1: "The Noise",
    2: "Open Books",
    3: "The Dark Corner",
    4: "The New Weight",
    5: "The Triangle",
    6: "The Fourth Thread",
}


class Chapter(NamedTuple):
    number: int
    title: str
    url: str


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def words_to_number(words: str) -> int | None:
    """Convert a hyphenated word string ('twenty-eight') to int. Returns None on failure."""
    total = 0
    current = 0
    for w in re.split(r"[\s\-]+", words.lower().strip()):
        if w not in NUMBER_WORDS:
            return None
        v = NUMBER_WORDS[w]
        if v == 100:
            current = max(current, 1) * 100
        elif v >= 20:
            current += v
        else:
            current += v
    return total + current if (total or current) else None


def parse_chapter_links(html_text: str) -> list[tuple[str, str]]:
    """Extract (slug-text, full-href) pairs for chapter links on a TOC page."""
    pattern = re.compile(
        rf'<a[^>]*href="(/fiction/{FICTION_ID}/{FICTION_SLUG}/chapter/(\d+)/([a-z0-9\-]+))"[^>]*>'
        rf'([^<]+)</a>',
        re.IGNORECASE,
    )
    out: list[tuple[str, str]] = []
    for m in pattern.finditer(html_text):
        href = m.group(1)
        text = html.unescape(m.group(4)).strip()
        if not text or text.lower() in {"continue reading", "previous", "next"}:
            continue
        out.append((text, "https://www.royalroad.com" + href))
    return out


def slug_to_number_and_title(slug: str) -> tuple[int | None, str]:
    """Convert URL slug like 'chapter-twenty-eight-kung-pao' to (28, 'Kung Pao').

    Handles slugs without the 'chapter-X' prefix (e.g. 'the-noise', 'he-will-not-be-the-last-one')
    by returning (None, title-cased slug).
    """
    s = slug.lower()
    small = {"a", "the", "of", "in", "on", "to", "and", "for", "is"}

    def _titlecase(parts_iter):
        parts = [w.capitalize() for w in parts_iter]
        for i in range(1, len(parts)):
            if parts[i].lower() in small:
                parts[i] = parts[i].lower()
        return " ".join(parts)

    # Numeric form: 'chapter-32-hello-back' -> (32, 'Hello Back')
    m_num = re.match(r"chapter-(\d+)-(.*)", s)
    if m_num:
        n = int(m_num.group(1))
        return n, _titlecase(m_num.group(2).split("-"))

    # Word form: 'chapter-twenty-eight-kung-pao' -> (28, 'Kung Pao')
    m = re.match(r"chapter-([a-z\-]+?)-(.*)", s)
    if m:
        word_part = m.group(1)
        rest = m.group(2)
        n = words_to_number(word_part)
        if n is not None:
            return n, _titlecase(rest.split("-"))

    # Fallback: no chapter prefix (e.g. 'the-noise', 'he-will-not-be-the-last-one')
    return None, _titlecase(s.split("-"))


def fetch_all_chapters() -> list[Chapter]:
    """Fetch all chapters across paginated TOC, in chapter-number order."""
    chapters: dict[int, Chapter] = {}
    page = 1
    seen_urls: set[str] = set()
    while page <= 10:  # safety cap
        url = TOC_URL if page == 1 else f"{TOC_URL}?page={page}"
        try:
            html_text = fetch(url)
        except Exception as e:
            print(f"[warn] failed to fetch page {page}: {e}", file=sys.stderr)
            break
        new_links = [(t, h) for t, h in parse_chapter_links(html_text) if h not in seen_urls]
        if not new_links:
            break
        for text, href in new_links:
            seen_urls.add(href)
            slug_match = re.search(r"/chapter/\d+/([^/?#]+)", href)
            slug = slug_match.group(1) if slug_match else ""
            num, slug_title = slug_to_number_and_title(slug)

            # Try to derive number from the displayed text if slug didn't yield one
            if num is None:
                # Numeric form: 'Chapter 32: Hello Back'
                tm_num = re.match(r"chapter\s+(\d+)\s*:?\s*(.+)", text, re.IGNORECASE)
                if tm_num:
                    num = int(tm_num.group(1))
                    slug_title = tm_num.group(2).strip()
                else:
                    # Word form: 'Chapter Twenty-Eight: Kung Pao'
                    tm = re.match(r"chapter\s+([a-z\-]+):?\s+(.+)", text, re.IGNORECASE)
                    if tm:
                        n = words_to_number(tm.group(1))
                        if n is not None:
                            num = n
                            slug_title = tm.group(2).strip()

            if num is None:
                # Bare title — match against early manually-known titles
                normalised = re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()
                for n, t in TITLE_OVERRIDES.items():
                    if re.sub(r"[^a-z0-9 ]", "", t.lower()).strip() == normalised:
                        num = n
                        break

            if num is None:
                # Last-resort: handle Ch 31's "He Will Not Be the Last One" pattern
                # by looking at the text directly (no chapter word).
                # Keep skipping if we still can't derive — these are usually metadata links
                continue

            title = TITLE_OVERRIDES.get(num) or slug_title
            chapters[num] = Chapter(num, title, href)
        page += 1
    return [chapters[n] for n in sorted(chapters)]


CARD_TEMPLATE = (
    '      <a class="chapter-card" href="{url}" target="_blank" rel="noopener">\n'
    '        <span class="chapter-num">{num:02d}</span>\n'
    '        <div class="chapter-info"><h3>{title}</h3></div>\n'
    '        <span class="chapter-status">Read</span>\n'
    '      </a>'
)


def build_card(c: Chapter) -> str:
    return CARD_TEMPLATE.format(url=c.url, num=c.number, title=html.escape(c.title))


def existing_chapter_numbers(index_html: str) -> set[int]:
    nums = re.findall(r'<span class="chapter-num">(\d+)</span>', index_html)
    return {int(n) for n in nums}


def insert_chapter_cards(index_html: str, chapters: Iterable[Chapter]) -> str:
    """Insert new chapter cards before the closing </div> of the chapters-grid block."""
    new = list(chapters)
    if not new:
        return index_html
    # Locate the end of the chapters-grid div. Anchor on the chapters-more block.
    anchor_pattern = re.compile(r'(\s*</div>\s*<div class="chapters-more">)', re.MULTILINE)
    insertion = "".join("\n" + build_card(c) for c in new)
    new_html, count = anchor_pattern.subn(insertion + r"\1", index_html, count=1)
    if count == 0:
        # Anchor missing — append inside the chapters-grid div as a fallback.
        grid_close = re.compile(r'(<div class="chapters-grid">.*?)(</div>)', re.DOTALL)
        new_html, count = grid_close.subn(r"\1" + insertion + r"\n    \2", index_html, count=1)
    if count == 0:
        raise RuntimeError("could not locate chapters-grid in index.html")
    return new_html


def update_sitemap_lastmod(today: str) -> bool:
    if not SITEMAP_PATH.exists():
        return False
    txt = SITEMAP_PATH.read_text(encoding="utf-8")
    new_txt = re.sub(r"<lastmod>[^<]+</lastmod>", f"<lastmod>{today}</lastmod>", txt, count=1)
    if new_txt == txt:
        return False
    SITEMAP_PATH.write_text(new_txt, encoding="utf-8")
    return True


def main() -> int:
    chapters = fetch_all_chapters()
    if not chapters:
        print("[error] no chapters returned from RR — refusing to modify HTML", file=sys.stderr)
        return 0  # exit clean so workflow does not commit anything
    print(f"Royal Road chapters: {len(chapters)} (latest: Ch {chapters[-1].number} — {chapters[-1].title})")

    index_html = INDEX_PATH.read_text(encoding="utf-8")
    existing = existing_chapter_numbers(index_html)
    missing = [c for c in chapters if c.number not in existing]
    if not missing:
        print("Website already up to date.")
        return 0
    print(f"Adding {len(missing)} new chapter card(s): {[c.number for c in missing]}")

    new_index_html = insert_chapter_cards(index_html, missing)
    INDEX_PATH.write_text(new_index_html, encoding="utf-8")

    today = _dt.date.today().isoformat()
    if update_sitemap_lastmod(today):
        print(f"Sitemap lastmod updated to {today}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
