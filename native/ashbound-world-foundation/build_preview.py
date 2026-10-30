"""Generate review artifacts for the independent world-foundation prototype.

Usage: python build_preview.py OUTPUT_DIRECTORY
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont

from foundation import BEDROCK_TOP, Foundation, WORLD_HALF
from meshing import mesh_chunk, mesh_stats


def font(size: int):
    for path in (r'C:\Windows\Fonts\segoeui.ttf',
                 '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_preview(world: Foundation, path: Path) -> None:
    canvas = Image.new('RGB', (1600, 900), '#10191b')
    pen = ImageDraw.Draw(canvas)
    title = font(33)
    label = font(19)
    small = font(15)
    pen.text((48, 25), 'ASHBOUND  /  WELTFUNDAMENT', fill='#e8e2d4', font=title)
    pen.text((49, 70), '5 km × 5 km Koordinatenraum  ·  lokal gesampelte 3D-Substanz',
             fill='#a8bbb0', font=label)
    pen.text((50, 123), 'HÖHENRELIEF  /  GESAMTGEBIET', fill='#bfe5ac', font=label)
    pen.text((818, 123), 'QUERSCHNITT  /  64 m am Grabungsort', fill='#bfe5ac', font=label)

    left, top, side = 50, 168, 680
    map_image = Image.new('RGB', (251, 251))
    pixels = map_image.load()
    elevations = []
    for iy in range(251):
        y = -WORLD_HALF + iy * 20
        for ix in range(251):
            x = -WORLD_HALF + ix * 20
            h = world.height(x, y)
            elevations.append(h)
            moisture = max(-1, min(1, (h - 55) / 90))
            if h < 32:
                color = (73, 105, 99)
            elif h < 105:
                color = (71 + int(moisture * 15), 104 + int(moisture * 12), 66)
            else:
                color = (132 + int(moisture * 18), 128 + int(moisture * 13), 106)
            pixels[ix, 250 - iy] = color
    map_image = map_image.resize((side, side), Image.Resampling.BILINEAR)
    canvas.paste(map_image, (left, top))
    pen = ImageDraw.Draw(canvas)
    pen.rectangle((left, top, left + side, top + side), outline='#8daa8b', width=2)
    pen.line((left + side // 2 - 10, top + side // 2,
              left + side // 2 + 10, top + side // 2), fill='#f0b56e', width=2)
    pen.line((left + side // 2, top + side // 2 - 10,
              left + side // 2, top + side // 2 + 10), fill='#f0b56e', width=2)
    pen.text((left + 17, top + 17), 'N', fill='white', font=label)
    pen.text((left + 16, top + side - 31), '0', fill='white', font=small)
    pen.text((left + side - 100, top + side - 31), '5 000 m', fill='white', font=small)

    x0, x1, y0, y1 = 818, 1550, 168, 808
    pen.rectangle((x0, y0, x1, y1), fill='#324752', outline='#8daa8b', width=2)
    # Local section at y=16 m: the inside is solid down to the protected floor.
    # Show surface layers at useful visual scale rather than flattening 160 m
    # of stone into a single pixel row.
    left_m, right_m = -16.0, 48.0
    z_low, z_high = 17.0, 105.0
    material_colors = {'turf': '#679347', 'topsoil': '#765137',
                       'subsoil': '#8a674a', 'rock': '#666b6a',
                       'bedrock': '#30383b'}
    columns = x1 - x0 - 2
    heights = [world.height(left_m + (right_m - left_m) * i / columns, 16)
               for i in range(columns + 1)]
    for px in range(x0 + 1, x1):
        ix = px - x0 - 1
        x = left_m + (right_m - left_m) * ix / columns
        h = heights[ix]
        for py in range(y0 + 1, y1):
            z = z_high - (z_high - z_low) * (py - y0) / (y1 - y0)
            if world.density(x, 16, z) > 0:
                depth = h - z
                material = ('turf' if depth < 0.45 else 'topsoil' if depth < 3
                            else 'subsoil' if depth < 10 else 'rock')
                pen.point((px, py), fill=material_colors[material])
    # The bedrock marker refers to the true protected lower level, well below
    # this detailed upper slice. It is not a second invented ground surface.
    pen.rectangle((x0 + 18, y1 - 82, x0 + 338, y1 - 17), fill='#172328')
    pen.text((x0 + 30, y1 - 73), 'Festes Grundgestein bei -152 m',
             fill='#e0e8df', font=small)
    pen.text((x0 + 30, y1 - 47), 'unter der gezeigten Schichtprobe',
             fill='#a9bcbd', font=small)
    pen.text((x0 + 18, y0 + 14), 'Luft', fill='white', font=small)
    pen.text((x1 - 160, y1 - 50), 'Grabung 10 m', fill='#efc282', font=small)

    stats = f'Höhe im Gesamtgebiet: {min(elevations):.0f}–{max(elevations):.0f} m'
    pen.text((817, 823), stats, fill='#b8c8c3', font=small)
    pen.text((48, 863), 'Forschungsprobe · keine Integration in die laufende EXE',
             fill='#80989a', font=small)
    canvas.save(path)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python build_preview.py OUTPUT_DIRECTORY')
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    world = Foundation()
    z = world.height(16, 16) - 8
    changed = world.excavate(16, 16, z, 10)
    mesh = mesh_chunk(world, 39, 39, world._z_key(z), 2)
    mesh.save_obj(out / 'ground-and-excavation.obj')
    world.save(out / 'world-edits.json')
    draw_preview(world, out / 'foundation-preview.png')
    manifest = {'extentMetres': [5000, 5000], 'areaKm2': 25,
                'chunkMetres': 64, 'sampledChunk': [39, 39, world._z_key(z)],
                'sampleSpacingMetres': 2, 'changedChunkCount': len(changed),
                'localVegetationCount': len(world.vegetation(39, 39)),
                'mesh': mesh_stats(mesh), 'engineIntegrated': False}
    (out / 'preview-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n',
                                                encoding='utf-8')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
