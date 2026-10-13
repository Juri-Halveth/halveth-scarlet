"""Build the authored ASHBOUND canyon mesh used by the Unreal world pass."""
import math
import os
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
WORK = Path(os.environ.get('ASHBOUND_NATIVE_WORK', REPO / '.local-qa' / 'ashbound-unreal'))
WORK.mkdir(parents=True, exist_ok=True)
OUT = WORK / 'ASHBOUND_Valley.obj'
NX, NY = 144, 144
X0, X1 = -3500.0, 10500.0
Y0, Y1 = -8000.0, 8000.0

def height(x, y):
    side = max(0.0, abs(y) - 1100.0) / 6500.0
    ridge = 2100.0 * side ** 1.35
    shoulder = 380.0 * side * math.sin(x / 980.0 + y / 770.0)
    rocks = 190.0 * side * math.sin(x / 370.0) * math.cos(y / 460.0)
    road = (1.0 - min(1.0, side * 4)) * (12.0 * math.sin(x / 440.0) + 8.0 * math.cos(y / 330.0))
    return ridge + shoulder + rocks + road - 18.0

with open(OUT, 'w', encoding='ascii', newline='\n') as obj:
    obj.write('o ASHBOUND_Valley\n')
    for j in range(NY + 1):
        y = Y0 + (Y1 - Y0) * j / NY
        for i in range(NX + 1):
            x = X0 + (X1 - X0) * i / NX
            obj.write(f'v {x:.4f} {y:.4f} {height(x, y):.4f}\n')
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
