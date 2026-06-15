#!/usr/bin/env python3
"""Parse the Sakura Study starter PDF into structured JSON.

Usage:
  python3 scripts/parse_pdf.py /path/to/Basic_Tables.pdf

The parser prefers pdfplumber tables and categorizes pages from the known
starter curriculum. It intentionally keeps extracted Japanese text intact while
normalizing control-character artifacts from the PDF.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber


PDF_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    "/Users/home/Downloads/bee74c73-4597-4636-a94f-20048f58c566_Basic_Tables.pdf"
)
OUTPUT_PATH = Path("src/data/curriculum.json")


CATEGORY_BY_PAGE = {
    2: "Countries",
    3: "Countries",
    4: "Countries",
    8: "Jobs",
    9: "Jobs",
    11: "Languages",
    12: "Languages",
    13: "Possession",
    14: "Family",
    15: "Numbers",
    16: "Numbers",
    17: "Age",
    18: "Age",
}

TABLE_CATEGORY_OVERRIDES = {
    (12, 0): "Languages",
    (12, 1): "Possession",
    (12, 2): "Possession",
    (14, 0): "Possession",
    (14, 1): "Family",
    (14, 2): "Family",
    (15, 0): "Family",
    (15, 1): "Numbers",
}


ROMAJI_FIXES = {
    "Berarshi": "Beraruushi",
    "Berug": "Berugii",
    "Denmku": "Denmaaku",
    "Hangar": "Hangarii",
    "Noruw": "Noruwee",
    "Prando": "Poorando",
    "Rmania": "Ruumania",
    "Suwden": "Suweeden",
    "Chgoku": "Chuugoku",
    "Per": "Peruu",
    "sutoraria": "Oosutoraria",
    "Nyjrando": "Nyuujiirando",
    "ginkin": "ginkouin",
    "kmuin": "koumuin",
    "ryrinin": "ryourinin",
    "shgakusei": "shougakusei",
    "shbbshi": "shouboushi",
    "biyshi": "biyoushi",
    "kksei": "koukousei",
    "chgakusei": "chuugakusei",
    "kenkysha": "kenkyuusha",
    "kyshi": "kyoushi",
    "Chgokugo": "Chuugokugo",
    "Hindgo": "Hindiigo",
    "Prandogo": "Poorandogo",
    "Suwdengo": "Suweedengo",
    "Konpytt": "Konpyuutaa",
    "Tech": "Techou",
    "Tburu": "Teeburu",
    "T shatsu": "T shatsu",
}


def clean(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("\x00", "").replace("\n", " ")
    value = re.sub(r"\s+", " ", value).strip()
    value = value.replace("ʼ", "'").replace("⽇", "日").replace("⼈", "人")
    value = value.replace("⾏", "行").replace("⽣", "生").replace("⾼", "高")
    value = value.replace("⼩", "小").replace("⼤", "大").replace("⼿", "手")
    value = value.replace("⾃", "自").replace("⾞", "車").replace("⼦", "子")
    value = value.replace("⽗", "父").replace("⺟", "母").replace("⼀", "一")
    value = value.replace("⼆", "二").replace("⼋", "八").replace("⼗", "十")
    value = value.replace("⼠", "士").replace("⾜", "足").replace("⾔", "言")
    return value


def clean_romaji(value: str) -> str:
    value = clean(value).replace(" ", " ")
    compact = value.replace(" ", "")
    if compact in ROMAJI_FIXES:
        return ROMAJI_FIXES[compact]
    return ROMAJI_FIXES.get(value, value)


def slug(value: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return base or "card"


def add_vocab(rows, category, vocabulary, seen):
    header = [clean(cell).lower() for cell in rows[0]]
    if not ({"japanese", "kana", "english"} <= set(header) or {"kanji", "kana", "english"} <= set(header) or {"hiragana", "english"} <= set(header)):
        return
    if header[:3] == ["question japanese", "question kana", "question romaji"]:
        return
    if "meaning" in header:
        return

    for row in rows[1:]:
        row = [clean(cell) for cell in row]
        if len(row) < 3:
            continue
        if "japanese" in header:
            jp = row[header.index("japanese")]
        elif "kanji" in header:
            jp = row[header.index("kanji")]
        else:
            jp = row[header.index("hiragana")]
        kana = row[header.index("kana")] if "kana" in header else row[header.index("hiragana")]
        romaji = clean_romaji(row[header.index("romaji")]) if "romaji" in header else ""
        english = row[header.index("english")]
        if not jp or not english:
            continue
        key = (jp, kana, english)
        if key in seen:
            continue
        seen.add(key)
        card_id = f"{slug(category)}-{len(vocabulary) + 1:03d}"
        vocabulary.append(
            {
                "id": card_id,
                "japanese": jp,
                "kana": kana,
                "romaji": romaji,
                "english": english,
                "category": category,
            }
        )


def add_grammar(rows, category, grammar):
    header = [clean(cell).lower() for cell in rows[0]]
    if header[:3] != ["meaning", "japanese", "romaji"]:
        return
    for row in rows[1:]:
        row = [clean(cell) for cell in row]
        if len(row) < 3:
            continue
        meaning = re.sub(r"^[^\w〇]+", "", row[0]).strip()
        japanese = row[1]
        if not meaning or not japanese:
            continue
        grammar.append(
            {
                "id": f"grammar-{len(grammar) + 1:03d}",
                "pattern": category,
                "meaning": meaning,
                "exampleJapanese": japanese,
                "exampleEnglish": meaning,
            }
        )


def main() -> None:
    vocabulary = []
    grammar = []
    seen = set()

    with pdfplumber.open(PDF_PATH) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            category = CATEGORY_BY_PAGE.get(page_number)
            if not category:
                continue
            for table_index, table in enumerate(page.extract_tables()):
                if not table:
                    continue
                table_category = TABLE_CATEGORY_OVERRIDES.get((page_number, table_index), category)
                add_vocab(table, table_category, vocabulary, seen)
                add_grammar(table, table_category, grammar)

    self_intro = [
        {
            "id": "self-001",
            "pattern": "Self introduction",
            "meaning": "I am from Spain.",
            "exampleJapanese": "わたしはスペインからきました。",
            "exampleEnglish": "I am from Spain.",
        },
        {
            "id": "self-002",
            "pattern": "Self introduction",
            "meaning": "I am 32 years old.",
            "exampleJapanese": "わたしはさんじゅうにさいです。",
            "exampleEnglish": "I am 32 years old.",
        },
        {
            "id": "self-003",
            "pattern": "Self introduction",
            "meaning": "I live in Warsaw.",
            "exampleJapanese": "ワルシャワにすんでいます。",
            "exampleEnglish": "I live in Warsaw.",
        },
        {
            "id": "self-004",
            "pattern": "Self introduction",
            "meaning": "I am an engineer.",
            "exampleJapanese": "わたしはエンジニアです。",
            "exampleEnglish": "I am an engineer.",
        },
        {
            "id": "self-005",
            "pattern": "Self introduction",
            "meaning": "I am currently studying Japanese.",
            "exampleJapanese": "にほんごはべんきょうちゅうです。",
            "exampleEnglish": "I am currently studying Japanese.",
        },
        {
            "id": "self-006",
            "pattern": "Self introduction",
            "meaning": "My family has two people.",
            "exampleJapanese": "かぞくはふたりです。",
            "exampleEnglish": "My family has two people.",
        },
    ]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(
            {"vocabulary": vocabulary, "grammar": grammar, "selfIntroduction": self_intro},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_PATH} with {len(vocabulary)} vocabulary cards and {len(grammar)} grammar cards.")


if __name__ == "__main__":
    main()
