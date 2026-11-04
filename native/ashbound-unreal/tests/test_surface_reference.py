"""Check contact sampling against the actual OBJ triangles exported for Unreal."""
import os
from pathlib import Path
import random
import subprocess
import sys
import tempfile
import unittest

TOOLS = Path(__file__).resolve().parents[1] / 'tools'
sys.path.insert(0, str(TOOLS))
import surface_reference as surface


def vertices(path):
    with path.open(encoding='ascii') as source:
        return [tuple(map(float, row.split()[1:])) for row in source
                if row.startswith('v ')]


def triangle_height(point, a, b, c):
    x, y = point
    denominator = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
    u = ((x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1])) / denominator
    v = ((b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1])) / denominator
    if min(u, v, 1 - u - v) < -1e-5:
        return None
    return a[2] + u * (b[2] - a[2]) + v * (c[2] - a[2])


class SurfaceReferenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        env = dict(os.environ, ASHBOUND_NATIVE_WORK=cls.temp.name)
        subprocess.run([sys.executable, str(TOOLS / 'generate_terrain.py')],
                       env=env, check=True, capture_output=True, text=True)
        root = Path(cls.temp.name)
        cls.terrain = vertices(root / 'ASHBOUND_Valley.obj')
        cls.road = vertices(root / 'ASHBOUND_WornRoad.obj')

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_exported_terrain_triangles_are_placement_reference(self):
        rng = random.Random(1942)
        stride = surface.NX + 1
        for _ in range(80):
            i = rng.randrange(surface.NX)
            j = rng.randrange(surface.NY)
            x = surface.X0 + (i + rng.random()) * (surface.X1 - surface.X0) / surface.NX
            y = surface.Y0 + (j + rng.random()) * (surface.Y1 - surface.Y0) / surface.NY
            a, b = self.terrain[j * stride + i], self.terrain[j * stride + i + 1]
            c, d = self.terrain[(j + 1) * stride + i + 1], self.terrain[(j + 1) * stride + i]
            actual = next((z for z in (triangle_height((x, y), a, b, c),
                                       triangle_height((x, y), a, c, d)) if z is not None), None)
            self.assertIsNotNone(actual)
            self.assertAlmostEqual(surface.terrain_surface(x, y), actual, delta=.002)

    def test_exported_road_triangles_are_placement_reference(self):
        rng = random.Random(1988)
        stride = surface.ROAD_NX + 1
        for _ in range(80):
            i = rng.randrange(surface.ROAD_NX)
            j = rng.randrange(surface.ROAD_NY)
            a, b = self.road[j * stride + i], self.road[j * stride + i + 1]
            c, d = self.road[(j + 1) * stride + i + 1], self.road[(j + 1) * stride + i]
            u, v = rng.uniform(.1, .9), rng.uniform(.1, .9)
            if v <= u:
                point = (a[0] + u * (b[0] - a[0]) + v * (c[0] - b[0]),
                         a[1] + u * (b[1] - a[1]) + v * (c[1] - b[1]))
                expected = triangle_height(point, a, b, c)
            else:
                point = (a[0] + u * (c[0] - d[0]) + v * (d[0] - a[0]),
                         a[1] + u * (c[1] - d[1]) + v * (d[1] - a[1]))
                expected = triangle_height(point, a, c, d)
            self.assertIsNotNone(expected)
            self.assertAlmostEqual(surface.road_surface(*point), expected, delta=.002)

    def test_playable_road_ruts_clear_underlying_terrain(self):
        for i in range(101):
            x = -3000 + i * 130
            for y in (-950, -600, -300, -215, 0, 215, 300, 600, 950):
                self.assertGreater(surface.road_surface(x, y) -
                                   surface.terrain_surface(x, y), 10.0)

    def test_outer_road_merges_into_valley(self):
        for x in (0, 2290, 6450, 9000):
            self.assertIsNone(surface.road_surface(x, 1700))
            self.assertEqual(surface.walk_surface(x, 1700),
                             surface.terrain_surface(x, 1700))


if __name__ == '__main__':
    unittest.main()
