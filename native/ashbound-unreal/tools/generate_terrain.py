"""Build the authored ASHBOUND canyon mesh used by the Unreal world pass."""
import os
from pathlib import Path
from surface_reference import (NX, NY, X0, X1, Y0, Y1, ROAD_NX, ROAD_NY,
                               terrain_vertex, road_vertex)

REPO = Path(__file__).resolve().parents[3]
WORK = Path(os.environ.get('ASHBOUND_NATIVE_WORK', REPO / '.local-qa' / 'ashbound-unreal'))
WORK.mkdir(parents=True, exist_ok=True)
OUT = WORK / 'ASHBOUND_Valley.obj'
ROAD_OUT = WORK / 'ASHBOUND_WornRoad.obj'
with open(OUT, 'w', encoding='ascii', newline='\n') as obj:
    obj.write('o ASHBOUND_Valley\n')
    for j in range(NY + 1):
        y = Y0 + (Y1 - Y0) * j / NY
        for i in range(NX + 1):
            x = X0 + (X1 - X0) * i / NX
            obj.write(f'v {x:.4f} {y:.4f} {terrain_vertex(x, y):.4f}\n')
    for j in range(NY + 1):
        for i in range(NX + 1):
            obj.write(f'vt {i / 7:.6f} {j / 7:.6f}\n')
    def idx(i, j):
        return j * (NX + 1) + i + 1
    for j in range(NY):
        for i in range(NX):
            a, b, c, d = idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)
            obj.write(f'f {a}/{a} {b}/{b} {c}/{c}\n')
            obj.write(f'f {a}/{a} {c}/{c} {d}/{d}\n')
print(OUT, os.path.getsize(OUT))

# The passage is a conforming, slightly rutted mesh. The old 140 x 29 m
# cube had one perfectly flat top and visibly floated above the valley.
with open(ROAD_OUT, 'w', encoding='ascii', newline='\n') as obj:
    obj.write('o ASHBOUND_WornRoad\n')
    for j in range(ROAD_NY + 1):
        for i in range(ROAD_NX + 1):
            x, y, z = road_vertex(i, j)
            obj.write(f'v {x:.4f} {y:.4f} {z:.4f}\n')
    for j in range(ROAD_NY + 1):
        for i in range(ROAD_NX + 1):
            obj.write(f'vt {i / ROAD_NX:.6f} {j / ROAD_NY:.6f}\n')
    def road_idx(i, j):
        return j * (ROAD_NX + 1) + i + 1
    for j in range(ROAD_NY):
        for i in range(ROAD_NX):
            a, b = road_idx(i, j), road_idx(i + 1, j)
            c, d = road_idx(i + 1, j + 1), road_idx(i, j + 1)
            obj.write(f'f {a}/{a} {b}/{b} {c}/{c}\n')
            obj.write(f'f {a}/{a} {c}/{c} {d}/{d}\n')
print(ROAD_OUT, os.path.getsize(ROAD_OUT))
