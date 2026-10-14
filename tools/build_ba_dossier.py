"""Build the public Bruehl BA dossier from its reviewable Markdown source.

Uses ReportLab from the Codex PDF runtime. No private case file is read.
"""

from __future__ import annotations

import re
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "forschung" / "ba-uebergangsraum" / "DOSSIER-QUELLTEXT.md"
OUTPUT = ROOT / "forschung" / "ba-uebergangsraum" / "JURI_DOSSIER_BA_BRUEHL_2026-10-14.pdf"

pdfmetrics.registerFont(TTFont("Segoe", r"C:\Windows\Fonts\segoeui.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-Bold", r"C:\Windows\Fonts\segoeuib.ttf"))
pdfmetrics.registerFontFamily("Segoe", normal="Segoe", bold="Segoe-Bold")

NAVY = colors.HexColor("#081521")
INK = colors.HexColor("#e9f5f5")
MUTED = colors.HexColor("#b8d0d4")
CYAN = colors.HexColor("#82ead4")
GOLD = colors.HexColor("#f1ce85")
LINE = colors.HexColor("#345061")

STYLES = {
    "cover_title": ParagraphStyle(
        "cover_title", fontName="Segoe-Bold", fontSize=36, leading=43,
        textColor=INK, spaceAfter=23, splitLongWords=0,
    ),
    "title": ParagraphStyle(
        "title", fontName="Segoe-Bold", fontSize=28, leading=34,
        textColor=INK, spaceAfter=24, splitLongWords=0,
    ),
    "body": ParagraphStyle(
        "body", fontName="Segoe", fontSize=12.2, leading=21,
        textColor=INK, spaceAfter=16, alignment=TA_LEFT,
        splitLongWords=0,
    ),
    "bullet": ParagraphStyle(
        "bullet", fontName="Segoe", fontSize=11.8, leading=19,
        textColor=INK, leftIndent=14, firstLineIndent=-11,
        spaceAfter=9, splitLongWords=0,
    ),
    "source": ParagraphStyle(
        "source", fontName="Segoe", fontSize=10.5, leading=17,
        textColor=MUTED, spaceAfter=15, splitLongWords=0,
    ),
    "kicker": ParagraphStyle(
        "kicker", fontName="Segoe-Bold", fontSize=9, leading=13,
        textColor=GOLD, spaceAfter=22,
    ),
}


def inline(text: str) -> str:
    """Render limited Markdown emphasis without allowing raw HTML."""
    clean = escape(text).replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")
    clean = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", clean)
    return re.sub(
        r"https://[^\s<]+",
        lambda match: f'<link href="{match.group(0)}" color="#82ead4">{match.group(0)}</link>',
        clean,
    )


def source_paragraph(block: str) -> Paragraph:
    match = re.match(r"^(\[Q\d+\])\s+(.+?):\s+(https://\S+)$", block)
    if not match:
        raise ValueError(f"Invalid source line: {block}")
    number, label, url = match.groups()
    display = url.replace("https://", "")
    if len(display) > 65:
        display = display[:62] + "..."
    html = (
        f'<b><font color="#f1ce85">{escape(number)}</font></b> '
        f'{escape(label)}<br/>'
        f'<link href="{escape(url, quote=True)}" color="#82ead4">'
        f'Quelle öffnen: {escape(display)}</link>'
    )
    return Paragraph(html, STYLES["source"])


def parse_page(text: str, cover: bool) -> list:
    flow = []
    for raw in re.split(r"\n\s*\n", text.strip()):
        block = " ".join(line.strip() for line in raw.splitlines()).strip()
        if not block:
            continue
        if block.startswith("# "):
            flow.append(Paragraph(inline(block[2:]), STYLES["cover_title" if cover else "title"]))
        elif block.startswith("[Q"):
            flow.append(source_paragraph(block))
        elif block.startswith("- "):
            for line in raw.splitlines():
                if line.strip():
                    flow.append(Paragraph("• " + inline(line.strip()[2:]), STYLES["bullet"]))
        elif re.match(r"^\d+\. ", block):
            for line in raw.splitlines():
                item = line.strip()
                if item:
                    flow.append(Paragraph(inline(item), STYLES["bullet"]))
        else:
            flow.append(Paragraph(inline(block), STYLES["body"]))
    return flow


def draw_page(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.7)
    canvas.line(55, height - 49, width - 55, height - 49)
    canvas.line(55, 47, width - 55, 47)
    canvas.setFont("Segoe-Bold", 8)
    canvas.setFillColor(CYAN)
    canvas.drawString(55, height - 38, "HALVETH  /  JURI  /  BRÜHL")
    canvas.setFont("Segoe", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 55, height - 38, "PERSÖNLICHER VORSCHLAG · 14.10.2026")
    canvas.drawString(55, 31, "Ein neuer Arbeitsweg für Brühl")
    canvas.drawRightString(width - 55, 31, f"{doc.page:02d}")
    if doc.page == 1:
        canvas.setFillColor(colors.HexColor("#163b46"))
        canvas.circle(width - 56, height - 249, 120, stroke=0, fill=1)
        canvas.setStrokeColor(CYAN)
        canvas.setLineWidth(3)
        canvas.circle(width - 57, height - 249, 90, stroke=1, fill=0)
    canvas.restoreState()


def build() -> None:
    pages = SOURCE.read_text(encoding="utf-8").split("---page---")
    if len(pages) != 19:
        raise ValueError(f"Expected 19 source pages, got {len(pages)}")
    story = []
    for index, page in enumerate(pages):
        if index:
            story.append(PageBreak())
        if index == 0:
            story.append(Spacer(1, 122))
            story.append(Paragraph("JURI  /  MENSCHEN  /  ARBEIT  /  BRÜHL", STYLES["kicker"]))
        story.extend(parse_page(page, cover=index == 0))
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4, leftMargin=55, rightMargin=55,
        topMargin=72, bottomMargin=65, title="Juri - Hier bleiben und etwas bewegen",
        author="Juri", subject="Oeffentliches BA-Bruehl-Forschungsdossier",
        pageCompression=1,
    )
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(OUTPUT)


if __name__ == "__main__":
    build()
