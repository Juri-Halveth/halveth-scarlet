"""Reopen the saved UE level and verify collision/material authoring persisted."""
import json
import os
from pathlib import Path

import unreal

ROOT = Path(__file__).resolve().parents[3]
WORK = Path(os.environ.get('ASHBOUND_NATIVE_WORK', ROOT / '.local-qa' / 'ashbound-unreal'))
MAP = '/Game/ASHBOUND/Maps/Prologue'
level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
if not level.load_level(MAP):
    raise RuntimeError('Unable to load saved ASHBOUND level')

terrain = unreal.load_asset('/Game/ASHBOUND/Terrain/ASHBOUND_Valley')
if not isinstance(terrain, unreal.StaticMesh):
    raise RuntimeError('Terrain mesh missing')
body = terrain.get_editor_property('body_setup')
if body is None or body.get_editor_property(
        'collision_trace_flag') != unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE:
    raise RuntimeError('Saved terrain is not complex-as-simple')

terrain_actors = [
    actor for actor in unreal.get_editor_subsystem(
        unreal.EditorActorSubsystem).get_all_level_actors()
    if actor.get_actor_label() == 'ASHBOUND / Sculpted ash valley'
]
if len(terrain_actors) != 1:
    raise RuntimeError('Expected exactly one terrain actor: ' + str(len(terrain_actors)))
actor = terrain_actors[0]
component = actor.get_editor_property('static_mesh_component')
if not actor.get_actor_enable_collision() or (
        component.get_collision_enabled() != unreal.CollisionEnabled.QUERY_AND_PHYSICS
        or component.get_collision_profile_name() != 'BlockAll'):
    raise RuntimeError('Saved terrain actor does not block collision')

textures = []
for prefix in ('rocky_terrain_03', 'old_stone_wall_02'):
    for kind in ('diffuse', 'nor_gl', 'rough'):
        path = '/Game/ASHBOUND/Surfaces/' + prefix + '_' + kind
        texture = unreal.load_asset(path)
        if not isinstance(texture, unreal.Texture2D):
            raise RuntimeError('Missing texture: ' + path)
        expected_srgb = kind == 'diffuse'
        if texture.get_editor_property('srgb') != expected_srgb:
            raise RuntimeError('Wrong sRGB setting: ' + path)
        if kind == 'nor_gl':
            if texture.get_editor_property(
                    'compression_settings') != unreal.TextureCompressionSettings.TC_NORMALMAP:
                raise RuntimeError('Wrong normal compression: ' + path)
            if not texture.get_editor_property('flip_green_channel'):
                raise RuntimeError('OpenGL normal lacks Y flip: ' + path)
        if kind == 'rough' and texture.get_editor_property(
                'compression_settings') != unreal.TextureCompressionSettings.TC_MASKS:
            raise RuntimeError('Wrong roughness compression: ' + path)
        textures.append(path)

receipt = {
    'map': MAP,
    'terrainCollision': 'CTF_USE_COMPLEX_AS_SIMPLE',
    'terrainActorCollision': 'QUERY_AND_PHYSICS / BlockAll',
    'terrainTrianglesLOD0': terrain.get_num_triangles(0),
    'texturesChecked': textures,
}
with open(WORK / 'world_assets_verified.json', 'w', encoding='utf-8') as file:
    json.dump(receipt, file, indent=2)
unreal.log('ASHBOUND_WORLD_ASSETS_VERIFIED ' + str(receipt))
