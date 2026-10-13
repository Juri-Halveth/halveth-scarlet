"""Typeset the existing ASHBOUND book texts into reproducible Unreal page art."""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

if len(sys.argv) != 3:
    raise SystemExit('usage: render_book_pages.py catalog.json output-directory')

catalog_file = Path(sys.argv[1])
output = Path(sys.argv[2])
catalog = json.loads(catalog_file.read_text(encoding='utf-8'))
volumes = catalog['volumes']
if len(volumes) != 3 or any(len(volume['pages']) != 3 for volume in volumes):
    raise ValueError('The native archive expects three source volumes of three pages each')

root = Path(__file__).resolve().parents[1]
paper = Image.open(root / 'art/materials/T_VaultPaper.png').convert('RGB')
font_file = root / 'art/fonts/LibreBaskerville-wght.ttf'
if not font_file.is_file():
    raise FileNotFoundError(font_file)

W, H = 1024, 1536
INK = (55, 38, 29)
FADED = (113, 81, 56)
GOLD = (142, 101, 48)
title_font = ImageFont.truetype(str(font_file), 68)
body_font = ImageFont.truetype(str(font_file), 47)
author_font = ImageFont.truetype(str(font_file), 32)
small_font = ImageFont.truetype(str(font_file), 25)


def wrap(draw, text, font, max_width):
    lines = []
    current = ''
    for word in text.split():
        candidate = f'{current} {word}'.strip()
        if current and draw.textlength(candidate, font=font) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def page_background():
    image = ImageEnhance.Color(paper.resize((W, H), Image.Resampling.LANCZOS)).enhance(0.68)
    draw = ImageDraw.Draw(image)
    draw.rectangle((65, 68, W - 65, H - 67), outline=GOLD, width=3)
    draw.rectangle((80, 84, W - 80, H - 83), outline=(183, 154, 106), width=2)
    for x in (103, W - 103):
        for y in (108, H - 108):
            draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=GOLD)
    return image, draw


output.mkdir(parents=True, exist_ok=True)
result = []
for volume_index, volume in enumerate(volumes):
    for page_index in range(4):
        image, draw = page_background()
        draw.text((117, 108), 'A S H B O U N D   ·   A R C H I V', font=small_font, fill=FADED)
        draw.line((118, 160, 906, 160), fill=GOLD, width=2)
        if page_index == 0:
            y = 360
            for line in wrap(draw, volume['title'], title_font, 770):
                draw.text((126, y), line, font=title_font, fill=INK)
                y += 112
            draw.line((300, y + 20, 724, y + 20), fill=GOLD, width=3)
            for line in wrap(draw, volume['author'], author_font, 750):
                y += 95
                draw.text((126, y), line, font=author_font, fill=FADED)
            draw.text((126, 1240), 'ARCHIVBAND  ·  ' + str(volume_index + 1).zfill(2),
                      font=author_font, fill=FADED)
        else:
            y = 250
            lines = wrap(draw, volume['pages'][page_index - 1], body_font, 760)
            if len(lines) > 17:
                raise ValueError(f'Text does not fit volume {volume_index} page {page_index}: {len(lines)} lines')
            for line in lines:
                draw.text((126, y), line, font=body_font, fill=INK)
                y += 69
            if y > 1400:
                raise ValueError(f'Text overflows volume {volume_index} page {page_index}')
        draw.line((400, 1388, 624, 1388), fill=GOLD, width=2)
        folio = f'{volume_index + 1}  ·  {page_index + 1}'
        width = draw.textlength(folio, font=small_font)
        draw.text(((W - width) / 2, 1406), folio, font=small_font, fill=FADED)
        filename = f'T_BookV{volume_index:02d}P{page_index:02d}.png'
        path = output / filename
        # The Engine/BasicShapes/Cube top-face UV is quarter-turned relative to
        # the book's long X axis. Author the texture in that native UV frame.
        image.transpose(Image.Transpose.ROTATE_270).save(path, optimize=True)
        result.append({'volume': volume['id'], 'page': page_index, 'file': filename,
                       'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})

(output / 'render-receipt.json').write_text(
    json.dumps({'source': str(catalog_file), 'pages': result}, ensure_ascii=False, indent=2),
    encoding='utf-8')
print(f'Rendered {len(result)} pages from {len(volumes)} existing ASHBOUND volumes')
