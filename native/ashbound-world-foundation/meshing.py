"""Extract the boundary of solid 3D samples, including excavated cavities.

The result is a local chunk mesh, not a 5 km allocation or an Unreal import.
Neighbour chunks sample identical world-space edges. Chunk faces are deliberately
open: the neighbouring solid continues there rather than becoming a fake wall.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from foundation import Foundation


CORNERS = ((0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0),
           (0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1))
TETRAHEDRA = ((0, 5, 1, 6), (0, 1, 2, 6), (0, 2, 3, 6),
              (0, 3, 7, 6), (0, 7, 4, 6), (0, 4, 5, 6))


@dataclass
class Mesh:
    vertices: list[tuple[float, float, float]]
    faces: list[tuple[int, int, int]]
    materials: list[str]

    def save_obj(self, path: Path) -> None:
        """Write an inspectable Wavefront mesh with per-face layer materials."""
        colors = {'turf': '0.24 0.43 0.15', 'topsoil': '0.35 0.22 0.12',
                  'subsoil': '0.43 0.31 0.20', 'rock': '0.48 0.48 0.45',
                  'bedrock': '0.17 0.19 0.22'}
        path.parent.mkdir(parents=True, exist_ok=True)
        mtl = path.with_suffix('.mtl')
        mtl.write_text(''.join(f'newmtl {name}\nKd {rgb}\nKa 0.03 0.03 0.03\n\n'
                               for name, rgb in colors.items()).rstrip() + '\n',
                       encoding='utf-8')
        with path.open('w', encoding='utf-8', newline='\n') as out:
            out.write(f'# ASHBOUND 3D solid boundary; local chunk\nmtllib {mtl.name}\n')
            for x, y, z in self.vertices:
                out.write(f'v {x:.5f} {y:.5f} {z:.5f}\n')
            current = None
            for face, material in zip(self.faces, self.materials):
                if material != current:
                    out.write(f'usemtl {material}\n')
                    current = material
                out.write(f'f {face[0]} {face[1]} {face[2]}\n')


def mesh_chunk(world: Foundation, ix: int, iy: int, iz: int, spacing: float = 2.0) -> Mesh:
    axes, density = world.sample_chunk(ix, iy, iz, spacing)
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int]] = []
    materials: list[str] = []
    edge_vertices: dict[tuple, int] = {}
    nx, ny, nz = (len(axis) - 1 for axis in axes)

    def vertex(a, b, va, vb) -> int:
        key = tuple(sorted((a, b)))
        if key not in edge_vertices:
            fraction = va / (va - vb)
            p = tuple(float(axes[axis][a[axis]] * (1 - fraction) +
                            axes[axis][b[axis]] * fraction) for axis in range(3))
            vertices.append(p)
            edge_vertices[key] = len(vertices)
        return edge_vertices[key]

    def triangle(ids, toward_air) -> None:
        p, q, r = (np.asarray(vertices[k - 1]) for k in ids)
        normal = np.cross(q - p, r - p)
        if np.linalg.norm(normal) < 1e-10:
            return
        if np.dot(normal, toward_air) < 0:
            ids = (ids[0], ids[2], ids[1])
        faces.append(tuple(ids))
        centre = (p + q + r) / 3
        materials.append(world.material(float(centre[0]), float(centre[1]),
                                        float(centre[2])))

    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                cube = [(i + dx, j + dy, k + dz) for dx, dy, dz in CORNERS]
                values = [float(density[c]) for c in cube]
                if min(values) > 0 or max(values) <= 0:
                    continue
                for tet in TETRAHEDRA:
                    solid = [index for index in tet if values[index] > 0]
                    air = [index for index in tet if values[index] <= 0]
                    if not solid or not air:
                        continue
                    solid_centre = np.mean([[axes[n][cube[a][n]] for n in range(3)]
                                            for a in solid], axis=0)
                    air_centre = np.mean([[axes[n][cube[a][n]] for n in range(3)]
                                          for a in air], axis=0)
                    direction = air_centre - solid_centre

                    def crossing(a, b):
                        return vertex(cube[a], cube[b], values[a], values[b])

                    if len(solid) == 1:
                        a = solid[0]
                        triangle(tuple(crossing(a, b) for b in air), direction)
                    elif len(air) == 1:
                        b = air[0]
                        triangle(tuple(crossing(a, b) for a in solid), direction)
                    else:
                        a, b = solid
                        c, d = air
                        p, q, r, s = (crossing(a, c), crossing(a, d),
                                      crossing(b, c), crossing(b, d))
                        triangle((p, q, r), direction)
                        triangle((q, s, r), direction)
    return Mesh(vertices, faces, materials)


def mesh_stats(mesh: Mesh) -> dict:
    return {'vertices': len(mesh.vertices), 'triangles': len(mesh.faces),
            'materials': dict(Counter(mesh.materials))}
