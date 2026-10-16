"""Author a separate native Landscape/World Partition art slice.

The old procedural volume lab is not used. This map is intentionally a visual
candidate until a packaged render and human play review accept it.
"""
import json
import os
from pathlib import Path

import unreal

ROOT = Path(__file__).resolve().parents[3]
WORK = Path(os.environ.get('ASHBOUND_NATIVE_WORK', ROOT / '.local-qa' / 'ashbound-unreal'))
MAP = '/Game/ASHBOUND/Maps/RebirthGrove'
TEMPLATE = '/Engine/Maps/Templates/OpenWorld'
SURFACES = '/Game/ASHBOUND/Rebirth/Surfaces'
level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()


def import_texture(name):
    path = SURFACES + '/' + name
    texture = unreal.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path) else None
    if texture is None:
        source = WORK / 'source-assets' / 'surfaces' / (name + '.jpg')
        if not source.is_file():
            raise RuntimeError('Missing hash-verified Rebirth surface: ' + str(source))
        task = unreal.AssetImportTask()
        task.set_editor_property('filename', str(source))
        task.set_editor_property('destination_path', SURFACES)
        task.set_editor_property('automated', True)
        task.set_editor_property('save', True)
        asset_tools.import_asset_tasks([task])
        texture = unreal.load_asset(path)
    if not isinstance(texture, unreal.Texture2D):
        raise RuntimeError('Rebirth surface import failed: ' + path)
    if '_nor_gl_' in name:
        texture.set_editor_property('srgb', False)
        texture.set_editor_property('compression_settings', unreal.TextureCompressionSettings.TC_NORMALMAP)
        texture.set_editor_property('flip_green_channel', True)
    elif '_rough_' in name:
        texture.set_editor_property('srgb', False)
        texture.set_editor_property('compression_settings', unreal.TextureCompressionSettings.TC_MASKS)
    unreal.EditorAssetLibrary.save_loaded_asset(texture)
    return texture


texture_sets = {
    name: {kind: import_texture(name + '_' + kind + '_2k')
           for kind in ('diff', 'nor_gl', 'rough')}
    for name in ('leafy_grass', 'dirt_floor')
}
rock_suffixes = {'diff': 'diffuse', 'nor_gl': 'nor_gl', 'rough': 'rough'}
texture_sets['rock'] = {}
for kind, suffix in rock_suffixes.items():
    rock_path = '/Game/ASHBOUND/Surfaces/rocky_terrain_03_' + suffix
    rock_texture = unreal.load_asset(rock_path)
    if not isinstance(rock_texture, unreal.Texture2D):
        raise RuntimeError('Missing imported rocky terrain surface: ' + rock_path)
    if kind == 'nor_gl':
        rock_texture.set_editor_property('srgb', False)
        rock_texture.set_editor_property('compression_settings',
                                         unreal.TextureCompressionSettings.TC_NORMALMAP)
        rock_texture.set_editor_property('flip_green_channel', True)
    elif kind == 'rough':
        rock_texture.set_editor_property('srgb', False)
        rock_texture.set_editor_property('compression_settings',
                                         unreal.TextureCompressionSettings.TC_MASKS)
    unreal.EditorAssetLibrary.save_loaded_asset(rock_texture)
    texture_sets['rock'][kind] = rock_texture

mat_path = SURFACES + '/M_RebirthGround'
material = unreal.load_asset(mat_path) if unreal.EditorAssetLibrary.does_asset_exist(mat_path) else None
if material is None:
    material = asset_tools.create_asset('M_RebirthGround', SURFACES,
                                        unreal.Material, unreal.MaterialFactoryNew())
if material is None:
    raise RuntimeError('Could not create Rebirth terrain material')
editor = unreal.MaterialEditingLibrary
editor.delete_all_material_expressions(material)

# Keep the experimental Landscape Grass Output authored for future baking.
# Current GenesisWorld visual QA uses bounded runtime habitat cells; the
# commandlet did not produce valid grass maps for these types.
with (WORK / 'import_world.json').open(encoding='utf-8') as source:
    model_imports = json.load(source)


def imported_mesh(model_id, mesh_name):
    matches = [entry['path'] for entry in model_imports[model_id]['meshes']
               if entry['path'].rsplit('/', 1)[-1].split('.')[0] == mesh_name]
    if len(matches) != 1:
        raise RuntimeError('Expected one imported mesh: ' + model_id + '/' + mesh_name)
    mesh = unreal.load_asset(matches[0])
    if not isinstance(mesh, unreal.StaticMesh):
        raise RuntimeError('Imported mesh could not load: ' + matches[0])
    return mesh


def grass_variety(mesh, density, cull_start, cull_end, scale_min, scale_max):
    variety = unreal.GrassVariety()
    variety.set_editor_property('grass_mesh', mesh)
    per_platform_density = variety.get_editor_property('grass_density')
    per_platform_density.set_editor_property('default', density)
    variety.set_editor_property('grass_density', per_platform_density)
    variety.set_editor_property('start_cull_distance', unreal.PerPlatformInt(default=cull_start))
    variety.set_editor_property('end_cull_distance', unreal.PerPlatformInt(default=cull_end))
    size = unreal.FloatInterval(min=scale_min, max=scale_max)
    for axis in ('scale_x', 'scale_y', 'scale_z'):
        variety.set_editor_property(axis, size)
    variety.set_editor_property('random_rotation', True)
    variety.set_editor_property('use_grid', False)
    return variety


def landscape_type(name, varieties):
    path = SURFACES + '/' + name
    grass_type = unreal.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path) else None
    if grass_type is None:
        grass_type = asset_tools.create_asset(name, SURFACES, unreal.LandscapeGrassType,
                                             unreal.LandscapeGrassTypeFactory())
    if not isinstance(grass_type, unreal.LandscapeGrassType):
        raise RuntimeError('Landscape grass type unavailable: ' + name)
    grass_type.set_editor_property('grass_varieties', varieties)
    if not unreal.EditorAssetLibrary.save_loaded_asset(grass_type):
        raise RuntimeError('Could not save landscape type: ' + name)
    return grass_type


grass_type = landscape_type('GT_RebirthGrass', [
    grass_variety(imported_mesh('grass_medium_01', name), 10.0, 2200, 3800, 0.65, 1.1)
    for name in ('grass_medium_01_small_a_LOD0', 'grass_medium_01_mid_c_LOD0',
                 'grass_medium_01_tall_c_LOD0')])
shrub_type = landscape_type('GT_RebirthShrubs', [
    grass_variety(imported_mesh('shrub_02', name), 0.08, 4800, 8500, 0.75, 1.35)
    for name in ('shrub_02_a', 'shrub_02_b', 'shrub_02_c', 'shrub_02_d')])
canopy_type = landscape_type('GT_RebirthCanopy', [
    grass_variety(imported_mesh('tree_small_02', 'tree_small_02_1k'),
                  0.007, 11500, 18000, 1.35, 2.15)])

# Use metres of world position, not each Landscape component's 0..1 UVs: the
# same real-scale material continues across streamed cells without giant tiles.
position = editor.create_material_expression(material, unreal.MaterialExpressionWorldPosition, -900, -120)
xy = editor.create_material_expression(material, unreal.MaterialExpressionComponentMask, -700, -120)
xy.set_editor_property('r', True)
xy.set_editor_property('g', True)
# In UE 5.8 Python this pin is named "None"; an empty destination name
# reports success but leaves the mask disconnected and the material invalid.
if not editor.connect_material_expressions(position, '', xy, 'None'):
    raise RuntimeError('World position did not connect to XY mask')
scale = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -700, 60)
scale.set_editor_property('r', 155.0)
uv = editor.create_material_expression(material, unreal.MaterialExpressionDivide, -470, -120)
editor.connect_material_expressions(xy, '', uv, 'A')
editor.connect_material_expressions(scale, '', uv, 'B')

# Two noninteger texture periods prevent soil and rock from sharing the same
# printed grid as the fine leaf layer across a kilometre-scale view.
dirt_period = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -700, 145)
dirt_period.set_editor_property('r', 0.37)
dirt_uv = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, -470, 100)
editor.connect_material_expressions(uv, '', dirt_uv, 'A')
editor.connect_material_expressions(dirt_period, '', dirt_uv, 'B')
rock_period = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -700, 180)
rock_period.set_editor_property('r', 0.61)
rock_uv = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, -470, 170)
editor.connect_material_expressions(uv, '', rock_uv, 'A')
editor.connect_material_expressions(rock_period, '', rock_uv, 'B')

# A broad, low-frequency mask changes soil families over tens of metres rather
# than printing the same texture across a 2 km plane.
noise = editor.create_material_expression(material, unreal.MaterialExpressionNoise, -470, 240)
noise.set_editor_property('scale', 0.00045)
editor.connect_material_expressions(position, '', noise, 'Position')
alpha = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, -240, 240)
if not editor.connect_material_expressions(noise, '', alpha, 'A'):
    raise RuntimeError('Noise did not connect to blend mask')
soil_fraction = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -440, 420)
soil_fraction.set_editor_property('r', 0.11)
if not editor.connect_material_expressions(soil_fraction, '', alpha, 'B'):
    raise RuntimeError('Soil fraction did not connect to blend mask')

# Rock belongs to exposed, steep terrain, not to an arbitrary world-Z band.
# A height-only blend painted entire smooth hills mint and violet. The vertex
# normal keeps the geology tied to the actual Landscape shape; weak regional
# noise only breaks up the transition, and flat basins stay mostly soil.
terrain_normal = editor.create_material_expression(material,
    unreal.MaterialExpressionVertexNormalWS, -700, 890)
world_up = editor.create_material_expression(material,
    unreal.MaterialExpressionConstant3Vector, -700, 1080)
world_up.set_editor_property('constant', unreal.LinearColor(0, 0, 1, 1))
normal_up = editor.create_material_expression(material,
    unreal.MaterialExpressionDotProduct, -500, 890)
editor.connect_material_expressions(terrain_normal, '', normal_up, 'A')
editor.connect_material_expressions(world_up, '', normal_up, 'B')
slope = editor.create_material_expression(material,
    unreal.MaterialExpressionOneMinus, -300, 890)
editor.connect_material_expressions(normal_up, '', slope, '')
slope_threshold = editor.create_material_expression(material,
    unreal.MaterialExpressionConstant, -300, 1080)
slope_threshold.set_editor_property('r', 0.08)
exposed_slope = editor.create_material_expression(material,
    unreal.MaterialExpressionSubtract, -100, 890)
editor.connect_material_expressions(slope, '', exposed_slope, 'A')
editor.connect_material_expressions(slope_threshold, '', exposed_slope, 'B')
rock_gain = editor.create_material_expression(material,
    unreal.MaterialExpressionConstant, -100, 1090)
rock_gain.set_editor_property('r', 3.5)
rock_slope = editor.create_material_expression(material,
    unreal.MaterialExpressionMultiply, 100, 890)
editor.connect_material_expressions(exposed_slope, '', rock_slope, 'A')
editor.connect_material_expressions(rock_gain, '', rock_slope, 'B')
rock_noise_gain = editor.create_material_expression(material,
    unreal.MaterialExpressionConstant, -100, 1170)
rock_noise_gain.set_editor_property('r', 0.12)
rock_noise = editor.create_material_expression(material,
    unreal.MaterialExpressionMultiply, 100, 1130)
editor.connect_material_expressions(noise, '', rock_noise, 'A')
editor.connect_material_expressions(rock_noise_gain, '', rock_noise, 'B')
rock_variation = editor.create_material_expression(material,
    unreal.MaterialExpressionAdd, 300, 890)
editor.connect_material_expressions(rock_slope, '', rock_variation, 'A')
editor.connect_material_expressions(rock_noise, '', rock_variation, 'B')
rock_zero = editor.create_material_expression(material,
    unreal.MaterialExpressionConstant, 300, 1090)
rock_zero.set_editor_property('r', 0.0)
rock_floor = editor.create_material_expression(material,
    unreal.MaterialExpressionMax, 500, 890)
editor.connect_material_expressions(rock_variation, '', rock_floor, 'A')
editor.connect_material_expressions(rock_zero, '', rock_floor, 'B')
rock_one = editor.create_material_expression(material,
    unreal.MaterialExpressionConstant, 500, 1090)
rock_one.set_editor_property('r', 1.0)
rock_mask = editor.create_material_expression(material,
    unreal.MaterialExpressionMin, 700, 890)
editor.connect_material_expressions(rock_floor, '', rock_mask, 'A')
editor.connect_material_expressions(rock_one, '', rock_mask, 'B')

soil_bias = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -240, 430)
soil_bias.set_editor_property('r', 0.14)
soil_mask = editor.create_material_expression(material, unreal.MaterialExpressionAdd, -10, 430)
editor.connect_material_expressions(alpha, '', soil_mask, 'A')
editor.connect_material_expressions(soil_bias, '', soil_mask, 'B')
soil_zero = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -10, 550)
soil_zero.set_editor_property('r', 0.0)
soil_floor = editor.create_material_expression(material, unreal.MaterialExpressionMax, 180, 430)
editor.connect_material_expressions(soil_mask, '', soil_floor, 'A')
editor.connect_material_expressions(soil_zero, '', soil_floor, 'B')
soil_ceiling = editor.create_material_expression(material, unreal.MaterialExpressionConstant, 180, 550)
soil_ceiling.set_editor_property('r', 0.22)
soil_weight = editor.create_material_expression(material, unreal.MaterialExpressionMin, 360, 430)
editor.connect_material_expressions(soil_floor, '', soil_weight, 'A')
editor.connect_material_expressions(soil_ceiling, '', soil_weight, 'B')

for row, (kind, property_name) in enumerate((
        ('diff', unreal.MaterialProperty.MP_BASE_COLOR),
        ('nor_gl', unreal.MaterialProperty.MP_NORMAL),
        ('rough', unreal.MaterialProperty.MP_ROUGHNESS))):
    first = editor.create_material_expression(material, unreal.MaterialExpressionTextureSample,
                                               -240, -400 + row * 380)
    second = editor.create_material_expression(material, unreal.MaterialExpressionTextureSample,
                                                -240, -240 + row * 380)
    first.set_editor_property('texture', texture_sets['leafy_grass'][kind])
    second.set_editor_property('texture', texture_sets['dirt_floor'][kind])
    editor.connect_material_expressions(uv, '', first, 'UVs')
    editor.connect_material_expressions(dirt_uv, '', second, 'UVs')
    blend = editor.create_material_expression(material, unreal.MaterialExpressionLinearInterpolate,
                                               80, -320 + row * 380)
    if kind == 'diff':
        # Keep the photographed leaf litter, but let it read as a living
        # understory between real grass clumps rather than pale bare soil.
        leaf_tint = editor.create_material_expression(material,
            unreal.MaterialExpressionConstant3Vector, -30, -560)
        leaf_tint.set_editor_property('constant', unreal.LinearColor(.55, .95, .60, 1.0))
        tinted_leaf = editor.create_material_expression(material,
            unreal.MaterialExpressionMultiply, -20, -400)
        editor.connect_material_expressions(first, '', tinted_leaf, 'A')
        editor.connect_material_expressions(leaf_tint, '', tinted_leaf, 'B')
        editor.connect_material_expressions(tinted_leaf, '', blend, 'A')
    else:
        editor.connect_material_expressions(first, '', blend, 'A')
    editor.connect_material_expressions(second, '', blend, 'B')
    editor.connect_material_expressions(soil_weight, '', blend, 'Alpha')
    rock_sample = editor.create_material_expression(material,
        unreal.MaterialExpressionTextureSample, 300, -320 + row * 380)
    rock_sample.set_editor_property('texture', texture_sets['rock'][kind])
    editor.connect_material_expressions(rock_uv, '', rock_sample, 'UVs')
    regional_blend = editor.create_material_expression(material,
        unreal.MaterialExpressionLinearInterpolate, 560, -320 + row * 380)
    editor.connect_material_expressions(blend, '', regional_blend, 'A')
    editor.connect_material_expressions(rock_sample, '', regional_blend, 'B')
    editor.connect_material_expressions(rock_mask, '', regional_blend, 'Alpha')
    if not editor.connect_material_property(regional_blend, '', property_name):
        raise RuntimeError('Could not connect Rebirth ' + kind)

# An optional low-frequency grass-map mask remains separate from the runtime
# ecology cells. Its authored connections are not evidence of baked grass maps.
habitat_noise = editor.create_material_expression(material, unreal.MaterialExpressionNoise, -450, 1170)
habitat_noise.set_editor_property('scale', 0.00028)
editor.connect_material_expressions(position, '', habitat_noise, 'Position')
habitat_bias = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -450, 1370)
habitat_bias.set_editor_property('r', 0.18)
habitat_add = editor.create_material_expression(material, unreal.MaterialExpressionAdd, -230, 1170)
editor.connect_material_expressions(habitat_noise, '', habitat_add, 'A')
editor.connect_material_expressions(habitat_bias, '', habitat_add, 'B')
habitat_gain = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -230, 1380)
habitat_gain.set_editor_property('r', 2.5)
habitat_mul = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, 0, 1170)
editor.connect_material_expressions(habitat_add, '', habitat_mul, 'A')
editor.connect_material_expressions(habitat_gain, '', habitat_mul, 'B')
zero = editor.create_material_expression(material, unreal.MaterialExpressionConstant, 0, 1550)
zero.set_editor_property('r', 0.0)
one = editor.create_material_expression(material, unreal.MaterialExpressionConstant, 230, 1550)
one.set_editor_property('r', 1.0)
habitat_floor = editor.create_material_expression(material, unreal.MaterialExpressionMax, 230, 1170)
editor.connect_material_expressions(habitat_mul, '', habitat_floor, 'A')
editor.connect_material_expressions(zero, '', habitat_floor, 'B')
habitat_mask = editor.create_material_expression(material, unreal.MaterialExpressionMin, 420, 1170)
editor.connect_material_expressions(habitat_floor, '', habitat_mask, 'A')
editor.connect_material_expressions(one, '', habitat_mask, 'B')
grass_weight = editor.create_material_expression(material, unreal.MaterialExpressionConstant, 230, 1410)
grass_weight.set_editor_property('r', 0.80)
vegetation_mask = editor.create_material_expression(material,
    unreal.MaterialExpressionOneMinus, 480, 1450)
editor.connect_material_expressions(rock_mask, '', vegetation_mask, '')
grass_habitat = editor.create_material_expression(material,
    unreal.MaterialExpressionMultiply, 690, 1450)
editor.connect_material_expressions(grass_weight, '', grass_habitat, 'A')
editor.connect_material_expressions(vegetation_mask, '', grass_habitat, 'B')
wood_habitat = editor.create_material_expression(material,
    unreal.MaterialExpressionMultiply, 690, 1670)
editor.connect_material_expressions(habitat_mask, '', wood_habitat, 'A')
editor.connect_material_expressions(vegetation_mask, '', wood_habitat, 'B')
grass_output = editor.create_material_expression(material,
    unreal.MaterialExpressionLandscapeGrassOutput, 540, 1200)
entries = []
for name, kind in (('MapGrass', grass_type), ('MapShrubs', shrub_type),
                   ('MapCanopy', canopy_type)):
    item = type(grass_output.get_editor_property('grass_types')[0])()
    item.set_editor_property('name', name)
    item.set_editor_property('grass_type', kind)
    entries.append(item)
grass_output.set_editor_property('grass_types', entries)
for name, weight in (('MapGrass', grass_habitat), ('MapShrubs', wood_habitat),
                     ('MapCanopy', wood_habitat)):
    if not editor.connect_material_expressions(weight, '', grass_output, name):
        raise RuntimeError('Could not connect landscape habitat: ' + name)
editor.recompile_material(material)
if not unreal.EditorAssetLibrary.save_loaded_asset(material):
    raise RuntimeError('Could not save Rebirth material')

receipt_path = WORK / 'rebirth.json'
map_exists = unreal.EditorAssetLibrary.does_asset_exist(MAP)
if map_exists and (not receipt_path.is_file() or
                   json.loads(receipt_path.read_text(encoding='utf-8')).get('map') != MAP):
    raise RuntimeError('Existing RebirthGrove map lacks matching authoring receipt')
if map_exists:
    if not level.load_level(MAP):
        raise RuntimeError('Could not load Rebirth map')
elif not level.new_level_from_template(MAP, TEMPLATE):
    raise RuntimeError('Could not duplicate Unreal OpenWorld template')

landscapes = [a for a in actors.get_all_level_actors() if isinstance(a, unreal.Landscape)]
if len(landscapes) != 1:
    raise RuntimeError('Expected exactly one Landscape, got ' + str(len(landscapes)))
landscapes[0].set_editor_property('landscape_material', material)
# Keep the template's atmosphere-linked daylight exactly as authored. Python
# and C++ Rotator constructors use different positional conventions; any
# re-creation here can silently turn a daylight level into a black scene.

population_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDRebirthPopulation')
if population_class is None:
    raise RuntimeError('Rebirth runtime population class missing')
if not map_exists:
    # World Partition can leave unloaded actors out of get_all_level_actors().
    # Author the population once; a rerun only refreshes the material.
    starts = [a for a in actors.get_all_level_actors() if isinstance(a, unreal.PlayerStart)]
    if len(starts) != 1:
        raise RuntimeError('OpenWorld template must have one player start')
    origin = starts[0].get_actor_location()
    population = actors.spawn_actor_from_class(population_class,
                                                 unreal.Vector(origin.x, origin.y, 0), unreal.Rotator())
    population.set_actor_label('ASHBOUND / Rebirth grounded habitat')

    with (WORK / 'import_world.json').open(encoding='utf-8') as source:
        model_imports = json.load(source)
    for component_name, model_id in (
            ('rocks', 'boulder_01'), ('ferns', 'fern_02'),
            ('grasses', 'grass_medium_01'), ('stumps', 'tree_stump_01'),
            ('pines', 'fir_sapling')):
        mesh_index = 0
        mesh_path = model_imports[model_id]['meshes'][mesh_index]['path']
        mesh = unreal.load_asset(mesh_path)
        if not isinstance(mesh, unreal.StaticMesh):
            raise RuntimeError('Missing imported Rebirth mesh: ' + mesh_path)
        population.get_editor_property(component_name).set_static_mesh(mesh)

if not level.save_current_level():
    raise RuntimeError('Could not save Rebirth map')
unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
unreal.EditorAssetLibrary.save_directory(SURFACES, True, True)
receipt = {'map': MAP, 'template': TEMPLATE,
           'landscapeMaterial': mat_path,
           'landscapeGrassTypes': [SURFACES + '/' + name for name in
               ('GT_RebirthGrass', 'GT_RebirthShrubs', 'GT_RebirthCanopy')],
           'populationClass': '/Script/ASHBOUNDUE.ASHBOUNDRebirthPopulation',
           'status': 'VISUAL_CANDIDATE_NOT_ACCEPTED'}
receipt_path.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
unreal.log('ASHBOUND_REBIRTH_AUTHORED ' + str(receipt))
