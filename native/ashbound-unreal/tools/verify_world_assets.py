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

road = unreal.load_asset('/Game/ASHBOUND/Terrain/ASHBOUND_WornRoad')
if not isinstance(road, unreal.StaticMesh):
    raise RuntimeError('Worn road mesh missing')
if road.get_editor_property('nanite_settings').get_editor_property('enabled'):
    raise RuntimeError('Worn road Nanite fallback still reduces physical detail')
road_body = road.get_editor_property('body_setup')
if road_body is None or road_body.get_editor_property(
        'collision_trace_flag') != unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE:
    raise RuntimeError('Saved worn road is not complex-as-simple')
if road.get_num_triangles(0) < 10000:
    raise RuntimeError('Worn road lost authored ruts: ' + str(road.get_num_triangles(0)))
all_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
road_actors = [a for a in all_actors if a.get_actor_label() ==
               'ASHBOUND / Walkable worn road']
if len(road_actors) != 1:
    raise RuntimeError('Expected one worn road actor: ' + str(len(road_actors)))
road_actor = road_actors[0]
road_component = road_actor.get_editor_property('static_mesh_component')
if not road_actor.get_actor_enable_collision() or (
        road_component.get_collision_enabled() != unreal.CollisionEnabled.QUERY_AND_PHYSICS
        or road_component.get_collision_profile_name() != 'BlockAll'):
    raise RuntimeError('Saved worn road does not block collision')
if any(a.get_actor_label() == 'ASHBOUND / Walkable central path' for a in all_actors):
    raise RuntimeError('Flat cube road still exists')

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
    'roadTrianglesLOD0': road.get_num_triangles(0),
    'texturesChecked': textures,
}
with open(WORK / 'world_assets_verified.json', 'w', encoding='utf-8') as file:
    json.dump(receipt, file, indent=2)
unreal.log('ASHBOUND_WORLD_ASSETS_VERIFIED ' + str(receipt))
