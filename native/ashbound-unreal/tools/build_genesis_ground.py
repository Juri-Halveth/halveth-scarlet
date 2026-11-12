"""Author a separate 5.04 km native Landscape candidate with real terrain collision."""
import json
import os
from pathlib import Path

import unreal

ROOT = Path(__file__).resolve().parents[3]
WORK = Path(os.environ.get('ASHBOUND_NATIVE_WORK', ROOT / '.local-qa' / 'ashbound-unreal'))
MAP = '/Game/ASHBOUND/Maps/GenesisWorld'
MATERIAL = '/Game/ASHBOUND/Rebirth/Surfaces/M_RebirthGround'
RECEIPT = WORK / 'genesis-world.json'
level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

if unreal.EditorAssetLibrary.does_asset_exist(MAP):
    if not RECEIPT.is_file() or json.loads(RECEIPT.read_text(encoding='utf-8')).get('map') != MAP:
        raise RuntimeError('Existing GenesisWorld map has no matching authoring receipt')
    if not level.load_level(MAP):
        raise RuntimeError('Could not load GenesisWorld')
    unreal.log('ASHBOUND_GENESIS_EXISTING ' + MAP)
else:
    if not level.new_level(MAP):
        raise RuntimeError('Could not create GenesisWorld level')
    ground = unreal.load_asset(MATERIAL)
    if not isinstance(ground, unreal.MaterialInterface):
        raise RuntimeError('Ground material is missing; build Rebirth first')
    world = unreal.EditorLevelLibrary.get_editor_world()
    landscape = unreal.ASHBOUNDWorldBuilder.create_genesis_landscape(world, ground)
    if not isinstance(landscape, unreal.Landscape):
        raise RuntimeError('Native 5 km Landscape creation failed')
    landscape.set_actor_label('ASHBOUND / Genesis ground / 5.04 km')

    # The first playable space is a calm basin. Atmosphere is independent of
    # the old OpenWorld template and stays in this native level.
    sun = actors.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(), unreal.Rotator())
    sun.set_actor_label('ASHBOUND / Sun')
    sun_rotation = unreal.Rotator()
    sun_rotation.set_editor_property('pitch', -38.0)
    sun_rotation.set_editor_property('yaw', -32.0)
    sun.set_actor_rotation(sun_rotation, False)
    sun_component = sun.get_component_by_class(unreal.DirectionalLightComponent)
    sun_component.set_editor_property('intensity', 10.0)
    sun_component.set_editor_property('atmosphere_sun_light', True)
    sky = actors.spawn_actor_from_class(unreal.SkyAtmosphere, unreal.Vector(), unreal.Rotator())
    sky.set_actor_label('ASHBOUND / Atmosphere')
    ambient = actors.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(), unreal.Rotator())
    ambient.set_actor_label('ASHBOUND / Skylight')
    ambient_component = ambient.get_component_by_class(unreal.SkyLightComponent)
    ambient_component.set_editor_property('real_time_capture', True)
    fog = actors.spawn_actor_from_class(unreal.ExponentialHeightFog, unreal.Vector(), unreal.Rotator())
    fog.set_actor_label('ASHBOUND / Distance air')
    clouds = actors.spawn_actor_from_class(unreal.VolumetricCloud, unreal.Vector(), unreal.Rotator())
    clouds.set_actor_label('ASHBOUND / Clouds')

    start_z = unreal.ASHBOUNDWorldBuilder.genesis_height_cm(0, 0) + 220.0
    start = actors.spawn_actor_from_class(unreal.PlayerStart,
                                          unreal.Vector(0, 0, start_z), unreal.Rotator())
    start.set_actor_label('ASHBOUND / Basin start')
    if not level.save_current_level():
        raise RuntimeError('Could not save GenesisWorld')
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    center, extent = landscape.get_actor_bounds(True)
    receipt = {
        'map': MAP, 'landscapeMaterial': MATERIAL,
        'widthCm': 504000, 'quadsPerSide': 2016, 'gridStepCm': 250,
        'startZCm': start_z,
        'center': str(center), 'extent': str(extent),
        'status': 'NATIVE_TERRAIN_CANDIDATE_NOT_ACCEPTED',
    }
    RECEIPT.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    unreal.log('ASHBOUND_GENESIS_AUTHORED ' + str(receipt))

# Migrate only this candidate map: a fixed origin grove would leave the rest
# of the 5 km ground empty. The manager loads bounded, repeatable habitat cells.
ecology_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDGenesisEcology')
if ecology_class is None:
    raise RuntimeError('Genesis ecology manager class unavailable')
for actor in actors.get_all_level_actors():
    if actor.get_class().get_name() == 'ASHBOUNDRebirthPopulation':
        actors.destroy_actor(actor)
managers = [actor for actor in actors.get_all_level_actors()
            if actor.get_class().get_name() == 'ASHBOUNDGenesisEcology']
if len(managers) > 1:
    raise RuntimeError('More than one Genesis ecology manager')
if not managers:
    manager = actors.spawn_actor_from_class(ecology_class, unreal.Vector(), unreal.Rotator())
    manager.set_actor_label('ASHBOUND / Living ground ecology')
    if not level.save_current_level():
        raise RuntimeError('Could not save Genesis ecology')
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
unreal.log('ASHBOUND_GENESIS_ECOLOGY_AUTHORED managers=1')

# Bind the candidate's daylight to this map. Automatic exposure otherwise
# washed out the photographed soil and made distant vegetation read as a flat
# colour strip; these values are evaluated again during visual QA.
by_label = {actor.get_actor_label(): actor for actor in actors.get_all_level_actors()}
for label, component_class, property_name, value in (
        ('ASHBOUND / Sun', unreal.DirectionalLightComponent, 'intensity', 4.0),
        ('ASHBOUND / Skylight', unreal.SkyLightComponent, 'intensity', 0.55),
        ('ASHBOUND / Distance air', unreal.ExponentialHeightFogComponent,
         'fog_density', 0.006)):
    actor = by_label.get(label)
    component = actor.get_component_by_class(component_class) if actor else None
    if component is None:
        raise RuntimeError('Genesis daylight component missing: ' + label)
    component.set_editor_property(property_name, value)
volume = by_label.get('ASHBOUND / Balanced daylight')
if volume is None:
    volume = actors.spawn_actor_from_class(unreal.PostProcessVolume,
                                           unreal.Vector(), unreal.Rotator())
    volume.set_actor_label('ASHBOUND / Balanced daylight')
if not isinstance(volume, unreal.PostProcessVolume):
    raise RuntimeError('Genesis daylight volume has unexpected type')
volume.set_editor_property('unbound', True)
settings = volume.get_editor_property('settings')
settings.set_editor_property('override_auto_exposure_bias', True)
settings.set_editor_property('auto_exposure_bias', -0.45)
volume.set_editor_property('settings', settings)
if not level.save_current_level():
    raise RuntimeError('Could not save Genesis daylight')
unreal.log('ASHBOUND_GENESIS_DAYLIGHT_AUTHORED exposure_bias=-0.45')
