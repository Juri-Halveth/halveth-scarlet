"""Author a synthetic, native UE5 room for view-dependent mirror QA.

Private source video frames, voices and people are deliberately absent. This
level tests one world object seen directly and through a moving planar mirror.
"""
import unreal


MAP = '/Game/ASHBOUND/Maps/MirrorEncounter'
MATERIALS = '/Game/ASHBOUND/Materials'
level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
material_editor = unreal.MaterialEditingLibrary


def material(name, color, metallic=0.0, roughness=0.75, emissive=0.0):
    path = f'{MATERIALS}/{name}'
    asset = unreal.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path) else None
    if asset is None:
        asset = asset_tools.create_asset(name, MATERIALS,
                                         unreal.Material, unreal.MaterialFactoryNew())
    if not isinstance(asset, unreal.Material):
        raise RuntimeError(f'Material unavailable: {path}')
    material_editor.delete_all_material_expressions(asset)
    tint = material_editor.create_material_expression(
        asset, unreal.MaterialExpressionConstant3Vector, -320, -140)
    tint.set_editor_property('constant', unreal.LinearColor(*color, 1.0))
    metal = material_editor.create_material_expression(
        asset, unreal.MaterialExpressionConstant, -320, 60)
    metal.set_editor_property('r', metallic)
    matte = material_editor.create_material_expression(
        asset, unreal.MaterialExpressionConstant, -320, 220)
    matte.set_editor_property('r', roughness)
    for node, prop in ((tint, unreal.MaterialProperty.MP_BASE_COLOR),
                       (metal, unreal.MaterialProperty.MP_METALLIC),
                       (matte, unreal.MaterialProperty.MP_ROUGHNESS)):
        if not material_editor.connect_material_property(node, '', prop):
            raise RuntimeError(f'Material connection failed: {name} {prop}')
    if emissive:
        glow = material_editor.create_material_expression(
            asset, unreal.MaterialExpressionMultiply, -100, 350)
        strength = material_editor.create_material_expression(
            asset, unreal.MaterialExpressionConstant, -320, 380)
        strength.set_editor_property('r', emissive)
        material_editor.connect_material_expressions(tint, '', glow, 'A')
        material_editor.connect_material_expressions(strength, '', glow, 'B')
        if not material_editor.connect_material_property(
                glow, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR):
            raise RuntimeError(f'Emissive connection failed: {name}')
    material_editor.recompile_material(asset)
    if not unreal.EditorAssetLibrary.save_loaded_asset(asset):
        raise RuntimeError(f'Material save failed: {name}')
    return asset


if unreal.EditorAssetLibrary.does_asset_exist(MAP):
    raise RuntimeError('MirrorEncounter already exists; preserve the existing map')

mirror = material('M_MirrorEncounter', (0.9, 0.92, 0.97), 1.0, 0.0)
floor_material = material('M_EncounterFloor', (0.13, 0.19, 0.22))
wall_material = material('M_EncounterWall', (0.31, 0.35, 0.38))
dark_material = material('M_EncounterFrame', (0.025, 0.04, 0.055), 0.65, 0.32)
red_material = material('M_EncounterRed', (0.72, 0.04, 0.04), 0.25, 0.34)
blue_material = material('M_EncounterBlue', (0.015, 0.23, 0.78), 0.25, 0.34)
gold_material = material('M_EncounterGold', (0.85, 0.45, 0.08), 0.55, 0.24)
material('M_ButterflyBody', (1.0, 0.48, 0.12), emissive=4.0)
material('M_ButterflyCyan', (0.06, 0.78, 1.0), emissive=5.0)
material('M_ButterflyViolet', (0.62, 0.17, 0.96), emissive=5.0)

if not level.new_level(MAP):
    raise RuntimeError('Could not create native MirrorEncounter map')
cube = unreal.load_asset('/Engine/BasicShapes/Cube.Cube')
if not isinstance(cube, unreal.StaticMesh):
    raise RuntimeError('Engine cube unavailable')


def box(name, xyz, scale, surface):
    actor = actors.spawn_actor_from_class(unreal.StaticMeshActor,
                                          unreal.Vector(*xyz), unreal.Rotator())
    actor.set_actor_label(name)
    component = actor.get_component_by_class(unreal.StaticMeshComponent)
    component.set_static_mesh(cube)
    component.set_material(0, surface)
    actor.set_actor_scale3d(unreal.Vector(*scale))
    return actor


# Four sides, floor, ceiling. The thick divider gives a real occluder: a
# marker remains the same world object even when one sightline hides it.
box('Mirror room / floor', (0, 0, -20), (12, 10, 0.4), floor_material)
box('Mirror room / ceiling', (0, 0, 400), (12, 10, 0.25), wall_material)
box('Mirror room / west', (-600, 0, 190), (0.25, 10, 4), wall_material)
box('Mirror room / east', (600, 0, 190), (0.25, 10, 4), wall_material)
box('Mirror room / north', (0, 500, 190), (12, 0.25, 4), wall_material)
box('Mirror room / south', (0, -500, 190), (12, 0.25, 4), wall_material)
box('Occluding partition', (-80, 135, 145), (0.35, 1.2, 2.9), dark_material)

rig_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDMirrorRig')
if rig_class is None:
    raise RuntimeError('Compile ASHBOUNDMirrorRig before authoring the map')
rig = actors.spawn_actor_from_class(rig_class,
                                    unreal.Vector(445, 0, 150), unreal.Rotator())
rig.set_actor_label('Mirror Encounter / swivel with Q and E')
butterfly_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDFairyButterfly')
if butterfly_class is None:
    raise RuntimeError('Compile ASHBOUNDFairyButterfly before authoring the map')
butterfly = actors.spawn_actor_from_class(
    butterfly_class, unreal.Vector(-25, -25, 185), unreal.Rotator())
butterfly.set_actor_label('Living butterfly / direct and reflected')
box('Mirror frame / top', (442, 0, 288), (0.24, 4.4, 0.14), dark_material)
box('Mirror frame / bottom', (442, 0, 12), (0.24, 4.4, 0.14), dark_material)
box('Mirror frame / north', (442, 210, 150), (0.24, 0.14, 2.9), dark_material)
box('Mirror frame / south', (442, -210, 150), (0.24, 0.14, 2.9), dark_material)

box('One world object / red', (-175, -125, 86), (0.85, 0.85, 1.7), red_material)
box('One world object / blue', (-235, 260, 86), (0.85, 0.85, 1.7), blue_material)
box('Occlusion reference / gold', (100, 240, 65), (0.6, 0.6, 1.3), gold_material)

start = actors.spawn_actor_from_class(unreal.PlayerStart,
                                      unreal.Vector(-400, -70, 130), unreal.Rotator())
start.set_actor_label('Player camera / WASD and mouse')

light = actors.spawn_actor_from_class(unreal.PointLight,
                                      unreal.Vector(0, 0, 345), unreal.Rotator())
light.set_actor_label('Mirror room / light')
light_component = light.get_component_by_class(unreal.PointLightComponent)
light_component.set_editor_property('intensity', 24000.0)
light_component.set_editor_property('attenuation_radius', 1400.0)

world_settings = unreal.get_editor_subsystem(
    unreal.UnrealEditorSubsystem).get_editor_world().get_world_settings()
mode = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDMirrorGameMode')
if mode is None:
    raise RuntimeError('Compile ASHBOUNDMirrorGameMode before authoring the map')
world_settings.set_editor_property('default_game_mode', mode)
if not level.save_current_level():
    raise RuntimeError('Could not save MirrorEncounter')
unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
unreal.log('ASHBOUND_MIRROR_ENCOUNTER_AUTHORED map=' + MAP)
