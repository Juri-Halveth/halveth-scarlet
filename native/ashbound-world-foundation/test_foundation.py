"""Checks for a continuous, locally editable solid foundation."""

from pathlib import Path
from collections import Counter
import tempfile
import unittest

import numpy as np

from foundation import BEDROCK_TOP, Foundation, WORLD_HALF
from meshing import mesh_chunk


class FoundationTests(unittest.TestCase):
    def setUp(self):
        self.world = Foundation(seed=2718)

    def test_extent_and_continuity(self):
        self.world.height(-WORLD_HALF, -WORLD_HALF)
        self.world.height(WORLD_HALF, WORLD_HALF)
        with self.assertRaises(ValueError):
            self.world.height(WORLD_HALF + 0.01, 0)
        x = 12.75
        self.assertAlmostEqual(self.world.height(x - 0.0001, 14),
                               self.world.height(x + 0.0001, 14), places=3)

    def test_ground_is_solid_above_bedrock_and_air_above_surface(self):
        height = self.world.height(0, 0)
        self.assertGreater(self.world.density(0, 0, height - 20), 0)
        self.assertLess(self.world.density(0, 0, height + 20), 0)
        self.assertEqual(self.world.material(0, 0, height), 'turf')
        self.assertEqual(self.world.material(0, 0, height - 1), 'topsoil')
        self.assertEqual(self.world.material(0, 0, height - 6), 'subsoil')
        self.assertEqual(self.world.material(0, 0, height - 20), 'rock')
        self.assertEqual(self.world.material(0, 0, BEDROCK_TOP), 'bedrock')
        self.assertGreater(self.world.density(0, 0, -1000), 0)
        with self.assertRaises(ValueError):
            self.world.density(WORLD_HALF + 1, 0, 0)

    def test_fall_lands_on_ground_or_excavated_floor(self):
        surface = self.world.height(16, 16)
        landing = self.world.drop_to_ground(16, 16, surface + 20)
        self.assertAlmostEqual(landing, surface, delta=0.01)
        self.world.excavate(16, 16, surface - 8, 10)
        dug_landing = self.world.drop_to_ground(16, 16, surface + 20)
        self.assertLess(dug_landing, surface - 10)
        self.assertGreater(dug_landing, BEDROCK_TOP)

    def test_shared_chunk_boundary_is_identical(self):
        a_axes, a_density = self.world.sample_chunk(39, 39, 3, 4)
        b_axes, b_density = self.world.sample_chunk(40, 39, 3, 4)
        self.assertEqual(a_axes[0][-1], b_axes[0][0])
        np.testing.assert_array_equal(a_axes[1], b_axes[1])
        np.testing.assert_array_equal(a_axes[2], b_axes[2])
        np.testing.assert_array_equal(a_density[-1, :, :], b_density[0, :, :])

    def test_excavation_crosses_seam_and_survives_save_load(self):
        seam = self.world.bounds(39, 39, 3)[0][1]
        z = min(self.world.height(seam, 20) - 4, 78)
        before = self.world.density(seam, 20, z)
        keys = self.world.excavate(seam, 20, z, 8)
        self.assertIn((39, 39, 3), keys)
        self.assertIn((40, 39, 3), keys)
        self.assertGreater(before, 0)
        self.assertLess(self.world.density(seam, 20, z), 0)
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'world.json'
            self.world.save(path)
            restored = Foundation.load(path)
        self.assertEqual(restored.density(seam, 20, z), self.world.density(seam, 20, z))

    def test_bedrock_is_protected(self):
        with self.assertRaises(ValueError):
            self.world.excavate(0, 0, BEDROCK_TOP + 3, 5)
        self.world.excavate(0, 0, BEDROCK_TOP + 10, 8)
        self.assertGreater(self.world.density(0, 0, BEDROCK_TOP), 0)

    def test_vegetation_is_repeatable_and_on_surface(self):
        one = self.world.vegetation(39, 39)
        self.assertEqual(one, Foundation(seed=2718).vegetation(39, 39))
        for item in one:
            self.assertIn(item['kind'], ('tree', 'grass'))
            self.assertLess(abs(item['z'] - self.world.height(item['x'], item['y'])), 0.03)
        if one:
            plant = one[0]
            surface = self.world.height(plant['x'], plant['y'])
            self.world.excavate(plant['x'], plant['y'], surface - 2, 5)
            self.assertFalse(any(item['x'] == plant['x'] and item['y'] == plant['y']
                                 for item in self.world.vegetation(39, 39)))

    def test_mesh_contains_real_excavated_inner_surface(self):
        surface = self.world.height(16, 16)
        self.world.excavate(16, 16, surface - 8, 10)
        mesh = mesh_chunk(self.world, 39, 39,
                          self.world._z_key(surface - 8), 4)
        self.assertGreater(len(mesh.faces), 100)
        self.assertIn('rock', mesh.materials)
        self.assertTrue(all(1 <= k <= len(mesh.vertices)
                            for face in mesh.faces for k in face))
        self.assertTrue(all(len(set(face)) == 3 for face in mesh.faces))
        edge_uses = Counter(tuple(sorted((a, b))) for face in mesh.faces
                            for a, b in ((face[0], face[1]),
                                         (face[1], face[2]),
                                         (face[2], face[0])))
        self.assertFalse(any(count > 2 for count in edge_uses.values()))


if __name__ == '__main__':
    unittest.main()
