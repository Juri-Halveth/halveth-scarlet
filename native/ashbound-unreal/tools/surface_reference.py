"""Shared, deterministic ground geometry for the authored ASHBOUND valley.

Positions are Unreal centimetres. Both exported meshes and object placement
sample the same triangulated surfaces; the road occupies a shallow cut in the
valley so the collision terrain cannot hide its ruts.
"""
import math

NX = NY = 144
X0, X1 = -3500.0, 10500.0
Y0, Y1 = -8000.0, 8000.0
ROAD_NX, ROAD_NY = 190, 48
ROAD_HALF_WIDTH = 1450.0


def base_height(x, y):
    side = max(0.0, abs(y) - 1100.0) / 6500.0
    ridge = 2100.0 * side ** 1.35
    shoulder = 380.0 * side * math.sin(x / 980.0 + y / 770.0)
    rocks = 190.0 * side * math.sin(x / 370.0) * math.cos(y / 460.0)
    lowland = (1.0 - min(1.0, side * 4.0)) * (
        12.0 * math.sin(x / 440.0) + 8.0 * math.cos(y / 330.0))
    return ridge + shoulder + rocks + lowland - 18.0


def terrain_vertex(x, y):
    # Keep the walking lane clear of the valley collider, then merge the two
    # surfaces across the outer 450 cm. The centre cut is 20 cm deep.
    cut = 20.0 * max(0.0, min(1.0, (1450.0 - abs(y)) / 450.0))
    return base_height(x, y) - cut


def road_width(x):
    return ROAD_HALF_WIDTH * (0.94 + 0.055 * math.sin(x / 690.0))


def road_vertex(i, j):
    x = X0 + (X1 - X0) * i / ROAD_NX
    transverse = 2.0 * j / ROAD_NY - 1.0
    y = transverse * road_width(x)
    ruts = -5.5 * math.exp(-((abs(y) - 215.0) / 80.0) ** 2)
    rough = (3.0 * math.sin(x / 170.0 + y / 123.0)
             + 2.0 * math.cos(x / 91.0 - y / 205.0))
    edge = 8.0 * abs(transverse) ** 10
    z = base_height(x, y) + 2.0 + ruts + rough * (1.0 - abs(transverse)) - edge
    return x, y, z


def _cell(value, lower, upper, divisions):
    coordinate = min(divisions - 1e-10,
                     max(0.0, (value - lower) * divisions / (upper - lower)))
    index = min(divisions - 1, int(coordinate))
    return index, coordinate - index


def terrain_surface(x, y):
    """Height of the exact a-b-c / a-c-d terrain triangles."""
    i, u = _cell(x, X0, X1, NX)
    j, v = _cell(y, Y0, Y1, NY)
    x0 = X0 + (X1 - X0) * i / NX
    x1 = X0 + (X1 - X0) * (i + 1) / NX
    y0 = Y0 + (Y1 - Y0) * j / NY
    y1 = Y0 + (Y1 - Y0) * (j + 1) / NY
    a = terrain_vertex(x0, y0)
    b = terrain_vertex(x1, y0)
    c = terrain_vertex(x1, y1)
    d = terrain_vertex(x0, y1)
    if v <= u:
        return a + u * (b - a) + v * (c - b)
    return a + u * (c - d) + v * (d - a)


def road_surface(x, y):
    """Height of the exported warped-road triangles, or None off the road."""
    if not X0 <= x <= X1:
        return None
    i, u = _cell(x, X0, X1, ROAD_NX)
    a0 = road_vertex(i, 0)
    b0 = road_vertex(i + 1, 0)
    top_a = road_vertex(i, ROAD_NY)
    top_b = road_vertex(i + 1, ROAD_NY)
    bottom = a0[1] + u * (b0[1] - a0[1])
    top = top_a[1] + u * (top_b[1] - top_a[1])
    if not bottom <= y <= top:
        return None
    j, _ = _cell(y, bottom, top, ROAD_NY)
    a = road_vertex(i, j)
    b = road_vertex(i + 1, j)
    c = road_vertex(i + 1, j + 1)
    d = road_vertex(i, j + 1)
    diagonal_y = a[1] + u * (c[1] - a[1])
    if y <= diagonal_y:
        along = (y - a[1] - u * (b[1] - a[1])) / (c[1] - b[1])
        return a[2] + u * (b[2] - a[2]) + along * (c[2] - b[2])
    along = (y - a[1] - u * (c[1] - a[1])) / (d[1] - a[1])
    return a[2] + u * (c[2] - a[2]) + along * (d[2] - a[2])


def walk_surface(x, y):
    terrain = terrain_surface(x, y)
    road = road_surface(x, y)
    return max(terrain, road) if road is not None else terrain


def support_span(x, y, radius_x=0.0, radius_y=0.0):
    """Nine ground heights under a footprint; useful for seated large props."""
    samples = [walk_surface(x, y)]
    if radius_x or radius_y:
        for ux, uy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                       (.7071, .7071), (.7071, -.7071),
                       (-.7071, .7071), (-.7071, -.7071)):
            samples.append(walk_surface(x + ux * radius_x,
                                        y + uy * radius_y))
    return min(samples), max(samples)
