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

mat_path = SURFACES + '/M_RebirthGround'
material = unreal.load_asset(mat_path) if unreal.EditorAssetLibrary.does_asset_exist(mat_path) else None
if material is None:
    material = asset_tools.create_asset('M_RebirthGround', SURFACES,
                                        unreal.Material, unreal.MaterialFactoryNew())
if material is None:
    raise RuntimeError('Could not create Rebirth terrain material')
editor = unreal.MaterialEditingLibrary
editor.delete_all_material_expressions(material)

# Use metres of world position, not each Landscape component's 0..1 UVs: the
# same real-scale material continues across streamed cells without giant tiles.
position = editor.create_material_expression(material, unreal.MaterialExpressionWorldPosition, -900, -120)
xy = editor.create_material_expression(material, unreal.MaterialExpressionComponentMask, -700, -120)
xy.set_editor_property('r', True)
xy.set_editor_property('g', True)
if not editor.connect_material_expressions(position, '', xy, ''):
    raise RuntimeError('World position did not connect to XY mask')
scale = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -700, 60)
scale.set_editor_property('r', 155.0)
uv = editor.create_material_expression(material, unreal.MaterialExpressionDivide, -470, -120)
editor.connect_material_expressions(xy, '', uv, 'A')
editor.connect_material_expressions(scale, '', uv, 'B')

# A broad, low-frequency mask changes soil families over tens of metres rather
# than printing the same texture across a 2 km plane.
noise = editor.create_material_expression(material, unreal.MaterialExpressionNoise, -470, 240)
noise.set_editor_property('scale', 0.003)
editor.connect_material_expressions(position, '', noise, 'Position')
alpha = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, -240, 240)
if not editor.connect_material_expressions(noise, '', alpha, 'A'):
    raise RuntimeError('Noise did not connect to blend mask')
soil_fraction = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -440, 420)
soil_fraction.set_editor_property('r', 0.12)
if not editor.connect_material_expressions(soil_fraction, '', alpha, 'B'):
    raise RuntimeError('Soil fraction did not connect to blend mask')

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
    editor.connect_material_expressions(uv, '', second, 'UVs')
    blend = editor.create_material_expression(material, unreal.MaterialExpressionLinearInterpolate,
                                               80, -320 + row * 380)
    if kind == 'diff':
        # Keep the photographed leaf litter, but let it read as a living
        # understory between real grass clumps rather than pale bare soil.
        leaf_tint = editor.create_material_expression(material,
            unreal.MaterialExpressionConstant3Vector, -30, -560)
        leaf_tint.set_editor_property('constant', unreal.LinearColor(.47, .79, .41, 1.0))
        tinted_leaf = editor.create_material_expression(material,
            unreal.MaterialExpressionMultiply, -20, -400)
        editor.connect_material_expressions(first, '', tinted_leaf, 'A')
        editor.connect_material_expressions(leaf_tint, '', tinted_leaf, 'B')
        editor.connect_material_expressions(tinted_leaf, '', blend, 'A')
    else:
        editor.connect_material_expressions(first, '', blend, 'A')
    editor.connect_material_expressions(second, '', blend, 'B')
    editor.connect_material_expressions(alpha, '', blend, 'Alpha')
    if not editor.connect_material_property(blend, '', property_name):
        raise RuntimeError('Could not connect Rebirth ' + kind)
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
           'populationClass': '/Script/ASHBOUNDUE.ASHBOUNDRebirthPopulation',
           'status': 'VISUAL_CANDIDATE_NOT_ACCEPTED'}
receipt_path.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
unreal.log('ASHBOUND_REBIRTH_AUTHORED ' + str(receipt))
