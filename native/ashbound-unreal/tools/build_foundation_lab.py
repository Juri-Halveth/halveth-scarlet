"""Author a separate real-time 3D ground lab; leave the story map untouched."""

import json
import os
from pathlib import Path

import unreal

REPO = Path(__file__).resolve().parents[3]
WORK = Path(os.environ.get('ASHBOUND_NATIVE_WORK', REPO / '.local-qa' / 'ashbound-unreal'))
MAP = '/Game/ASHBOUND/Maps/FoundationLab'
level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def foundation_material(name, detail_weight):
    path = '/Game/ASHBOUND/Surfaces/' + name
    material = unreal.load_asset(path)
    if material is None:
        material = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            name, '/Game/ASHBOUND/Surfaces', unreal.Material,
            unreal.MaterialFactoryNew())
    if material is None:
        raise RuntimeError('Could not create foundation material: ' + name)
    detail = unreal.load_asset('/Game/ASHBOUND/Surfaces/rocky_terrain_03_diffuse')
    if detail is None:
        raise RuntimeError('Foundation detail texture is missing')
    editor = unreal.MaterialEditingLibrary
    editor.delete_all_material_expressions(material)
    colour = editor.create_material_expression(
        material, unreal.MaterialExpressionVertexColor, -620, -120)
    sample = editor.create_material_expression(
        material, unreal.MaterialExpressionTextureSample, -620, 120)
    sample.set_editor_property('texture', detail)
    factor = editor.create_material_expression(
        material, unreal.MaterialExpressionConstant, -440, 360)
    factor.set_editor_property('r', detail_weight)
    blend = editor.create_material_expression(
        material, unreal.MaterialExpressionLinearInterpolate, -190, 0)
    editor.connect_material_expressions(colour, 'RGB', blend, 'A')
    editor.connect_material_expressions(sample, 'RGB', blend, 'B')
    editor.connect_material_expressions(factor, '', blend, 'Alpha')
    if not editor.connect_material_property(blend, '', unreal.MaterialProperty.MP_BASE_COLOR):
        raise RuntimeError('Could not connect foundation colour')
    roughness = editor.create_material_expression(
        material, unreal.MaterialExpressionConstant, -190, 260)
    roughness.set_editor_property('r', 0.94)
    editor.connect_material_property(roughness, '', unreal.MaterialProperty.MP_ROUGHNESS)
    editor.recompile_material(material)
    if not unreal.EditorAssetLibrary.save_loaded_asset(material):
        raise RuntimeError('Could not save foundation material: ' + name)


def model_material(name, texture_path, tint, masked=False):
    path = '/Game/ASHBOUND/Surfaces/' + name
    material = unreal.load_asset(path)
    if material is None:
        material = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            name, '/Game/ASHBOUND/Surfaces', unreal.Material,
            unreal.MaterialFactoryNew())
    texture = unreal.load_asset(texture_path)
    if material is None or texture is None:
        raise RuntimeError('Missing model material source: ' + name)
    material.set_editor_property('used_with_instanced_static_meshes', True)
    if masked:
        material.set_editor_property('blend_mode', unreal.BlendMode.BLEND_MASKED)
        material.set_editor_property('two_sided', True)
    editor = unreal.MaterialEditingLibrary
    editor.delete_all_material_expressions(material)
    sample = editor.create_material_expression(
        material, unreal.MaterialExpressionTextureSample, -450, -80)
    sample.set_editor_property('texture', texture)
    pigment = editor.create_material_expression(
        material, unreal.MaterialExpressionConstant3Vector, -450, 130)
    pigment.set_editor_property('constant', unreal.LinearColor(*tint, 1.0))
    multiply = editor.create_material_expression(
        material, unreal.MaterialExpressionMultiply, -160, -40)
    editor.connect_material_expressions(sample, 'RGB', multiply, 'A')
    editor.connect_material_expressions(pigment, '', multiply, 'B')
    editor.connect_material_property(multiply, '', unreal.MaterialProperty.MP_BASE_COLOR)
    if masked:
        editor.connect_material_property(sample, 'A', unreal.MaterialProperty.MP_OPACITY_MASK)
    roughness = editor.create_material_expression(
        material, unreal.MaterialExpressionConstant, -160, 220)
    roughness.set_editor_property('r', 0.88)
    editor.connect_material_property(roughness, '', unreal.MaterialProperty.MP_ROUGHNESS)
    editor.recompile_material(material)
    if not unreal.EditorAssetLibrary.save_loaded_asset(material):
        raise RuntimeError('Could not save model material: ' + name)


foundation_material('M_FoundationSoil', 0.025)
foundation_material('M_FoundationRock', 0.04)
model_material('M_FoundationFern',
               '/Game/ASHBOUND/Models/fern_02/fern_02_1k/Textures/fern_02_diff-fern_02_alpha',
               (0.58, 0.66, 0.47), True)
model_material('M_FoundationGrass',
               '/Game/ASHBOUND/Models/grass_medium_01/grass_medium_01_1k/Textures/grass_medium_01_diff-grass_medium_01_alpha',
               (0.62, 0.68, 0.49), True)
model_material('M_FoundationBoulder',
               '/Game/ASHBOUND/Models/boulder_01/boulder_01_1k/Textures/boulder_01_diff',
               (0.62, 0.60, 0.55))
model_material('M_FoundationBark',
               '/Game/ASHBOUND/Models/pine_sapling_small/pine_sapling_small_1k/Textures/pine_sapling_small_bark_diff',
               (0.55, 0.47, 0.37))
model_material('M_FoundationTwig',
               '/Game/ASHBOUND/Models/pine_sapling_small/pine_sapling_small_1k/Textures/pine_sapling_small_twig_diff',
               (0.45, 0.50, 0.34))

if unreal.EditorAssetLibrary.does_asset_exist(MAP):
    if not level.load_level(MAP):
        raise RuntimeError('Could not load existing foundation lab')
    for actor in actors.get_all_level_actors():
        if not isinstance(actor, unreal.WorldSettings):
            actors.destroy_actor(actor)
elif not level.new_level(MAP):
    raise RuntimeError('Could not create foundation lab map')

ground_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDGroundLab')
if ground_class is None:
    raise RuntimeError('Native 3D ground class missing from editor build')
ground = actors.spawn_actor_from_class(ground_class, unreal.Vector(), unreal.Rotator())
ground.set_actor_label('ASHBOUND / 5 km ground volume / streamed 3D chunks')

start = actors.spawn_actor_from_class(unreal.PlayerStart,
                                      unreal.Vector(0, 0, 7850),
                                      unreal.Rotator(yaw=32))
start.set_actor_label('ASHBOUND / foundation player entry')

sun = actors.spawn_actor_from_class(unreal.DirectionalLight,
                                    unreal.Vector(0, 0, 25000),
                                    unreal.Rotator(pitch=-42, yaw=28))
sun.set_actor_label('ASHBOUND / foundation sun')
sun_comp = sun.get_editor_property('light_component')
sun_comp.set_editor_property('intensity', 5.0)
sun_comp.set_editor_property('atmosphere_sun_light', True)
sky = actors.spawn_actor_from_class(unreal.SkyAtmosphere, unreal.Vector(), unreal.Rotator())
sky.set_actor_label('ASHBOUND / foundation atmosphere')
skylight = actors.spawn_actor_from_class(unreal.SkyLight,
                                         unreal.Vector(0, 0, 18000), unreal.Rotator())
skylight.set_actor_label('ASHBOUND / foundation sky fill')
skylight.get_editor_property('light_component').set_editor_property('real_time_capture', True)
fog = actors.spawn_actor_from_class(unreal.ExponentialHeightFog,
                                    unreal.Vector(0, 0, -3000), unreal.Rotator())
fog.set_actor_label('ASHBOUND / foundation air')
fog_comp = fog.get_editor_property('component')
fog_comp.set_editor_property('fog_density', 0.0015)
cloud = actors.spawn_actor_from_class(unreal.VolumetricCloud, unreal.Vector(), unreal.Rotator())
cloud.set_actor_label('ASHBOUND / foundation clouds')

if not level.save_current_level():
    raise RuntimeError('Could not save foundation lab')
unreal.EditorAssetLibrary.save_directory('/Game/ASHBOUND', True, True)
receipt = {'map': MAP, 'type': 'native_3d_streaming_ground_lab',
           'groundClass': '/Script/ASHBOUNDUE.ASHBOUNDGroundLab',
           'playerEntryCm': [0, 0, 7850], 'sideMetres': 5000,
           'storyMapChanged': False}
(WORK / 'foundation_lab.json').write_text(json.dumps(receipt, indent=2) + '\n',
                                          encoding='utf-8')
unreal.log('ASHBOUND_FOUNDATION_LAB_DONE ' + str(receipt))
