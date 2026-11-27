"""A bounded, editable 5 km x 5 km earth-like solid; no game integration.

All coordinates and layer thicknesses are metres. The 25 km² domain is
addressable without allocating a world-sized voxel array. Only requested
64 m chunks are sampled/meshed. Density > 0 means solid, <= 0 means air.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
import json
import math
from pathlib import Path

import numpy as np


WORLD_HALF = 2500.0
WORLD_SIZE = 5000.0
CHUNK_SIZE = 64.0
BEDROCK_BOTTOM = -160.0
BEDROCK_TOP = -152.0
MAX_Z = 352.0
MATERIALS = ('turf', 'topsoil', 'subsoil', 'rock', 'bedrock')


def _hash2(ix: int, iy: int, seed: int) -> float:
    n = (ix * 0x1F123BB5 ^ iy * 0x5F356495 ^ seed * 0x6C8E9CF5) & 0xFFFFFFFF
    n ^= n >> 16
    n = n * 0x7FEB352D & 0xFFFFFFFF
    n ^= n >> 15
    n = n * 0x846CA68B & 0xFFFFFFFF
    n ^= n >> 16
    return n / 0xFFFFFFFF


def _noise(x: float, y: float, scale: float, seed: int) -> float:
    gx, gy = x / scale, y / scale
    ix, iy = math.floor(gx), math.floor(gy)
    u, v = gx - ix, gy - iy
    u, v = u * u * (3 - 2 * u), v * v * (3 - 2 * v)
    a = _hash2(ix, iy, seed) * (1 - u) + _hash2(ix + 1, iy, seed) * u
    b = _hash2(ix, iy + 1, seed) * (1 - u) + _hash2(ix + 1, iy + 1, seed) * u
    return (a * (1 - v) + b * v) * 2 - 1


@dataclass(frozen=True)
class Excavation:
    x: float
    y: float
    z: float
    radius: float


@dataclass
class Foundation:
    seed: int = 20261015
    excavations: list[Excavation] = field(default_factory=list)

    def height(self, x: float, y: float) -> float:
        """Continuous elevation shared by every chunk, including boundaries."""
        self._check_xy(x, y)
        broad = 67 * _noise(x, y, 1400, self.seed)
        hills = 25 * _noise(x, y, 450, self.seed + 1)
        slopes = 7 * _noise(x, y, 110, self.seed + 2)
        gravel = 1.4 * _noise(x, y, 24, self.seed + 3)
        return 68 + broad + hills + slopes + gravel

    @staticmethod
    def _check_xy(x: float, y: float) -> None:
        if not (-WORLD_HALF <= x <= WORLD_HALF and -WORLD_HALF <= y <= WORLD_HALF):
            raise ValueError('outside the 5 km x 5 km world')

    def density(self, x: float, y: float, z: float) -> float:
        self._check_xy(x, y)
        if z < BEDROCK_BOTTOM:
            return 1.0  # no open void beneath the lowest sampled bedrock chunk
        if z > MAX_Z:
            return -1.0
        base = self.height(x, y) - z
        if z <= BEDROCK_TOP:
            return max(base, 1.0)  # excavation cannot delete the foundation
        for edit in self.excavations:
            if (abs(x - edit.x) > edit.radius or abs(y - edit.y) > edit.radius
                    or abs(z - edit.z) > edit.radius):
                continue
            cut = math.dist((x, y, z), (edit.x, edit.y, edit.z)) - edit.radius
            base = min(base, cut)
        return base

    def drop_to_ground(self, x: float, y: float, start_z: float) -> float:
        """Vertical collision query: first solid encountered below a point.

        The caller supplies motion/gravity. This query answers where a falling
        point would meet material, including the floor of an excavated hole.
        """
        self._check_xy(x, y)
        if not math.isfinite(start_z) or start_z > MAX_Z:
            raise ValueError('start_z must be finite and inside the vertical domain')
        if self.density(x, y, start_z) > 0:
            raise ValueError('start point is already inside solid material')
        z = start_z
        while z > BEDROCK_BOTTOM:
            next_z = max(BEDROCK_BOTTOM, z - 1.0)
            if self.density(x, y, next_z) > 0:
                lo, hi = next_z, z
                for _ in range(22):
                    mid = (lo + hi) / 2
                    if self.density(x, y, mid) > 0:
                        lo = mid
                    else:
                        hi = mid
                return (lo + hi) / 2
            z = next_z
        return BEDROCK_BOTTOM

    def material(self, x: float, y: float, z: float) -> str:
        if z <= BEDROCK_TOP:
            return 'bedrock'
        depth = self.height(x, y) - z
        if depth < 0.45:
            return 'turf'
        if depth < 3.0:
            return 'topsoil'
        if depth < 10.0:
            return 'subsoil'
        return 'rock'

    def excavate(self, x: float, y: float, z: float, radius: float) -> set[tuple[int, int, int]]:
        """Carve one sphere and return chunks to remesh; bedrock stays intact."""
        self._check_xy(x, y)
        if not all(math.isfinite(v) for v in (x, y, z, radius)) or not 0 < radius <= 24:
            raise ValueError('excavation requires finite coordinates and 0 < radius <= 24 m')
        if z - radius < BEDROCK_TOP or z + radius > MAX_Z:
            raise ValueError('excavation intersects bedrock or leaves vertical domain')
        edit = Excavation(x, y, z, radius)
        if edit not in self.excavations:
            self.excavations.append(edit)
        keys = set()
        for ix in range(self._axis_key(max(-WORLD_HALF, x - radius)),
                        self._axis_key(min(WORLD_HALF, x + radius)) + 1):
            for iy in range(self._axis_key(max(-WORLD_HALF, y - radius)),
                            self._axis_key(min(WORLD_HALF, y + radius)) + 1):
                for iz in range(self._z_key(z - radius), self._z_key(z + radius) + 1):
                    keys.add((ix, iy, iz))
        return keys

    @staticmethod
    def _axis_key(value: float) -> int:
        return min(78, max(0, math.floor((value + WORLD_HALF) / CHUNK_SIZE)))

    @staticmethod
    def _z_key(value: float) -> int:
        return min(7, max(0, math.floor((value - BEDROCK_BOTTOM) / CHUNK_SIZE)))

    @staticmethod
    def bounds(ix: int, iy: int, iz: int) -> tuple[tuple[float, float], ...]:
        if not (0 <= ix <= 78 and 0 <= iy <= 78 and 0 <= iz <= 7):
            raise ValueError('chunk key outside world')
        x0, y0, z0 = -WORLD_HALF + ix * CHUNK_SIZE, -WORLD_HALF + iy * CHUNK_SIZE, BEDROCK_BOTTOM + iz * CHUNK_SIZE
        return ((x0, min(WORLD_HALF, x0 + CHUNK_SIZE)),
                (y0, min(WORLD_HALF, y0 + CHUNK_SIZE)), (z0, z0 + CHUNK_SIZE))

    def sample_chunk(self, ix: int, iy: int, iz: int, spacing: float = 2.0):
        if spacing not in (1.0, 2.0, 4.0, 8.0):
            raise ValueError('spacing must be 1, 2, 4 or 8 m')
        bounds = self.bounds(ix, iy, iz)
        axes = tuple(np.linspace(lo, hi, int(round((hi - lo) / spacing)) + 1)
                     for lo, hi in bounds)
        xs, ys, zs = axes
        heights = np.array([[self.height(float(x), float(y)) for y in ys]
                            for x in xs], dtype=np.float32)
        density = heights[:, :, None] - zs[None, None, :]
        # A dig updates only intersecting chunks, yet exact global coordinates
        # make the same cut meet at chunk boundaries.
        for edit in self.excavations:
            if any(edit_coord + edit.radius < lo or edit_coord - edit.radius > hi
                   for edit_coord, (lo, hi) in zip((edit.x, edit.y, edit.z), bounds)):
                continue
            distance = np.sqrt((xs[:, None, None] - edit.x) ** 2 +
                               (ys[None, :, None] - edit.y) ** 2 +
                               (zs[None, None, :] - edit.z) ** 2) - edit.radius
            density = np.minimum(density, distance)
        density[:, :, zs <= BEDROCK_TOP] = np.maximum(
            density[:, :, zs <= BEDROCK_TOP], 1.0)
        return axes, density

    def vegetation(self, ix: int, iy: int) -> list[dict]:
        """Deterministic living cover; placements, not borrowed game assets."""
        (x0, x1), (y0, y1), _ = self.bounds(ix, iy, 0)
        result = []
        for gx in range(math.floor(x0 / 4) - 1, math.ceil(x1 / 4) + 1):
            for gy in range(math.floor(y0 / 4) - 1, math.ceil(y1 / 4) + 1):
                x = gx * 4 + (_hash2(gx, gy, self.seed + 50) - 0.5) * 2.4
                y = gy * 4 + (_hash2(gx, gy, self.seed + 51) - 0.5) * 2.4
                if not (x0 <= x < x1 and y0 <= y < y1):
                    continue
                z = self.height(x, y)
                if self.density(x, y, z - 0.1) <= 0:
                    continue  # excavation removed this plant's support
                slope = math.hypot((self.height(max(-WORLD_HALF, x - 1), y) -
                                    self.height(min(WORLD_HALF, x + 1), y)) / 2,
                                   (self.height(x, max(-WORLD_HALF, y - 1)) -
                                    self.height(x, min(WORLD_HALF, y + 1))) / 2)
                moisture = _noise(x, y, 350, self.seed + 7)
                chance = _hash2(gx, gy, self.seed + 52)
                if slope < 0.7 and moisture > -0.35 and chance < 0.30:
                    kind = 'tree' if chance < 0.006 and slope < 0.35 else 'grass'
                    result.append({'kind': kind, 'x': round(x, 2),
                                   'y': round(y, 2), 'z': round(z, 2)})
        return result

    def save(self, path: Path) -> None:
        payload = {'schema': 'ashbound.world-foundation/1', 'seed': self.seed,
                   'extentMetres': [-2500, 2500, -2500, 2500],
                   'excavations': [asdict(edit) for edit in self.excavations]}
        path.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')

    @classmethod
    def load(cls, path: Path) -> 'Foundation':
        payload = json.loads(path.read_text(encoding='utf-8'))
        if (payload.get('schema') != 'ashbound.world-foundation/1' or
                payload.get('extentMetres') != [-2500, 2500, -2500, 2500]):
            raise ValueError('incompatible world foundation')
        world = cls(seed=payload['seed'])
        for raw in payload['excavations']:
            world.excavate(**raw)
        return world
