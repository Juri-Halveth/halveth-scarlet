"""Author an explorable UE5 ASHBOUND landscape from CC0 source assets.

This runs in the editor commandlet. Gameplay is supplied by the first-person
Blueprint template; Python does not run inside a packaged game.
"""
import json
import math
import os
import random
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(os.environ.get('ASHBOUND_NATIVE_WORK', ROOT / '.local-qa' / 'ashbound-unreal'))
with open(os.path.join(HERE, 'import_world.json'), encoding='utf-8') as file:
    imports = json.load(file)
OUT = os.path.join(HERE, 'build_world.json')
MAP = '/Game/ASHBOUND/Maps/Prologue'
rng = random.Random(0xA5B0D)

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
if unreal.EditorAssetLibrary.does_asset_exist(MAP):
    if not level.load_level(MAP):
        raise RuntimeError('Unable to load ASHBOUND level')
    for actor in actors.get_all_level_actors():
        if not isinstance(actor, unreal.WorldSettings):
            actors.destroy_actor(actor)
elif not level.new_level(MAP):
    raise RuntimeError('Unable to create ASHBOUND level')

terrain_path = '/Game/ASHBOUND/Terrain/ASHBOUND_Valley.ASHBOUND_Valley'
if not unreal.EditorAssetLibrary.does_asset_exist(terrain_path):
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', os.path.join(HERE, 'ASHBOUND_Valley.obj'))
    task.set_editor_property('destination_path', '/Game/ASHBOUND/Terrain')
    task.set_editor_property('automated', True)
    task.set_editor_property('save', True)
    asset_tools.import_asset_tasks([task])
    unreal.log('ASHBOUND_TERRAIN_IMPORTED ' + str(task.get_editor_property('imported_object_paths')))
terrain_mesh = unreal.load_asset(terrain_path)
if not isinstance(terrain_mesh, unreal.StaticMesh):
    raise RuntimeError('Terrain static mesh import failed: ' + terrain_path)
# The imported OBJ's automatic box collision spans empty canyon air. Use the
# authored triangle surface for this static ground so the visible slopes are
# also the walkable and spell-queryable slopes.
terrain_body = terrain_mesh.get_editor_property('body_setup')
if terrain_body is None:
    raise RuntimeError('Terrain mesh has no collision body setup')
terrain_body.set_editor_property('collision_trace_flag',
                                 unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
if not unreal.EditorAssetLibrary.save_loaded_asset(terrain_mesh):
    raise RuntimeError('Unable to save terrain collision mode')

def make_surface(name, prefix):
    path = '/Game/ASHBOUND/Surfaces/' + name
    material = unreal.load_asset(path)
    if not material:
        material = asset_tools.create_asset(name, '/Game/ASHBOUND/Surfaces',
                                            unreal.Material, unreal.MaterialFactoryNew())
    if name == 'M_AshGround':
        material.set_editor_property('two_sided', True)
    unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
    road_uv = None
    if name == 'M_AshRoad':
        road_uv = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionTextureCoordinate, -750, 0)
        road_uv.set_editor_property('u_tiling', 18.0)
        road_uv.set_editor_property('v_tiling', 4.0)
    textures = {
        'diffuse': unreal.MaterialProperty.MP_BASE_COLOR,
        'nor_gl': unreal.MaterialProperty.MP_NORMAL,
        'rough': unreal.MaterialProperty.MP_ROUGHNESS,
    }
    for i, (kind, target) in enumerate(textures.items()):
        texture = unreal.load_asset('/Game/ASHBOUND/Surfaces/' + prefix + '_' + kind)
        if texture is None:
            raise RuntimeError('Missing ' + prefix + '_' + kind)
        if kind == 'nor_gl':
            texture.set_editor_property('srgb', False)
            texture.set_editor_property('compression_settings', unreal.TextureCompressionSettings.TC_NORMALMAP)
            unreal.EditorAssetLibrary.save_loaded_asset(texture)
        sample = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionTextureSample, -450, i * 240)
        sample.set_editor_property('texture', texture)
        if road_uv is not None:
            unreal.MaterialEditingLibrary.connect_material_expressions(road_uv, '', sample, 'UVs')
        if not unreal.MaterialEditingLibrary.connect_material_property(sample, '', target):
            raise RuntimeError('Material connection failed: ' + kind)
    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_loaded_asset(material)
    return material

ground_mat = make_surface('M_AshGround', 'rocky_terrain_03')
road_mat = make_surface('M_AshRoad', 'rocky_terrain_03')
stone_mat = make_surface('M_AshStone', 'old_stone_wall_02')

def make_vault_material(name, color, roughness, glow=0):
    material = unreal.load_asset('/Game/ASHBOUND/Materials/' + name)
    if material is None:
        material = asset_tools.create_asset(name, '/Game/ASHBOUND/Materials',
                                            unreal.Material, unreal.MaterialFactoryNew())
    if material is None:
        raise RuntimeError('Vault material creation failed: ' + name)
    unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
    base = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionVectorParameter, -420, -100)
    base.set_editor_property('parameter_name', 'BaseColor')
    base.set_editor_property('default_value', unreal.LinearColor(*color, 1.0))
    surface = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionScalarParameter, -420, 90)
    surface.set_editor_property('parameter_name', 'SurfaceRoughness')
    surface.set_editor_property('default_value', roughness)
    texture_name = {'M_VaultPaper': 'T_VaultPaper',
                    'M_VaultLeather': 'T_VaultLeather'}.get(name)
    texture = (unreal.load_asset('/Game/ASHBOUND/Materials/' + texture_name)
               if texture_name else None)
    if texture_name and not isinstance(texture, unreal.Texture2D):
        raise RuntimeError('Vault texture is not imported: ' + texture_name)
    if texture is not None:
        sample = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionTextureSample, -420, -210)
        sample.set_editor_property('texture', texture)
        unreal.MaterialEditingLibrary.connect_material_property(
            sample, '', unreal.MaterialProperty.MP_BASE_COLOR)
    else:
        unreal.MaterialEditingLibrary.connect_material_property(
            base, '', unreal.MaterialProperty.MP_BASE_COLOR)
    unreal.MaterialEditingLibrary.connect_material_property(surface, '', unreal.MaterialProperty.MP_ROUGHNESS)
    if glow:
        power = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionScalarParameter, -420, 280)
        power.set_editor_property('parameter_name', 'Glow')
        power.set_editor_property('default_value', glow)
        multiply = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionMultiply, -100, 210)
        unreal.MaterialEditingLibrary.connect_material_expressions(base, '', multiply, 'A')
        unreal.MaterialEditingLibrary.connect_material_expressions(power, '', multiply, 'B')
        unreal.MaterialEditingLibrary.connect_material_property(
            multiply, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_loaded_asset(material)
    return material

leather_mat = make_vault_material('M_VaultLeather', (.055, .095, .13), .54)
paper_mat = make_vault_material('M_VaultPaper', (.72, .64, .49), .84)
bronze_mat = make_vault_material('M_VaultBronze', (.25, .15, .07), .26)
rune_mat = make_vault_material('M_VaultRune', (.012, .22, .29), .38, 2.0)

def spawn_mesh(mesh, label, x, y, z, sx=1, sy=None, sz=None, yaw=0, pitch=0, mat=None):
    actor = actors.spawn_actor_from_class(unreal.StaticMeshActor,
                                          unreal.Vector(x, y, z),
                                          unreal.Rotator(pitch=pitch, yaw=yaw, roll=0))
    if actor is None:
        raise RuntimeError('Actor spawn failed: ' + label)
    component = actor.get_editor_property('static_mesh_component')
    component.set_static_mesh(mesh)
    if mat is not None:
        component.set_material(0, mat)
    actor.set_actor_scale3d(unreal.Vector(sx, sx if sy is None else sy, sx if sz is None else sz))
    actor.set_actor_label(label)
    return actor

terrain_actor = spawn_mesh(terrain_mesh, 'ASHBOUND / Sculpted ash valley', 0, 0, 0,
                           mat=ground_mat)
terrain_actor.set_actor_enable_collision(True)
terrain_component = terrain_actor.get_editor_property('static_mesh_component')
terrain_component.set_collision_profile_name('BlockAll')
terrain_component.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
cube = unreal.load_asset('/Engine/BasicShapes/Cube')
if cube is None:
    raise RuntimeError('Engine cube missing')
collision = spawn_mesh(cube, 'ASHBOUND / Walkable central path', 3500, 0, -250,
                       140, 29, 5, mat=road_mat)
collision.set_actor_enable_collision(True)
collision.get_editor_property('static_mesh_component').set_collision_profile_name('BlockAll')

def paths(model_id):
    return [row['path'] for row in imports[model_id]['meshes']]

def model(model_id, index=0):
    mesh = unreal.load_asset(paths(model_id)[index % len(paths(model_id))])
    if not isinstance(mesh, unreal.StaticMesh):
        raise RuntimeError('Missing model: ' + model_id)
    return mesh

def place_normalized(mesh, label, x, y, z, desired_height, yaw=0, pitch=0):
    box = mesh.get_bounding_box()
    height = max(1, box.max.z - box.min.z)
    scale = desired_height / height
    cx, cy = (box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2
    angle = math.radians(yaw)
    offset_x = (cx * math.cos(angle) - cy * math.sin(angle)) * scale
    offset_y = (cx * math.sin(angle) + cy * math.cos(angle)) * scale
    return spawn_mesh(mesh, label, x - offset_x, y - offset_y,
                      z - box.min.z * scale, scale, yaw=yaw, pitch=pitch)

def terrain_height(x, y):
    side = max(0.0, abs(y) - 1100.0) / 6500.0
    return (2100.0 * side ** 1.35 + 380.0 * side * math.sin(x / 980.0 + y / 770.0)
            + 190.0 * side * math.sin(x / 370.0) * math.cos(y / 460.0)
            + (1.0 - min(1.0, side * 4)) * (12.0 * math.sin(x / 440.0)
            + 8.0 * math.cos(y / 330.0)) - 18.0)

# A walkable, broken circular archive interrupts the old road. The historic
# scanned arches carry the silhouette; simple collision pieces stay separate.
vault_x = 3000
archive_arch = model('modular_fort_01', 12)
for index in range(12):
    if index in (0, 5, 6, 7):
        continue
    angle = 2 * math.pi * index / 12
    x = vault_x + 820 * math.cos(angle)
    y = 820 * math.sin(angle)
    arch = place_normalized(archive_arch, 'ASHBOUND / Archive arch %02d' % index,
                            x, y, 0, 480 + (index % 3) * 28,
                            yaw=math.degrees(angle))
    arch.set_actor_enable_collision(False)
    for side in (-1, 1):
        # The imported arch uses box collision. Narrow invisible end stops
        # retain a walkable opening without blocking its visible aperture.
        theta = angle + math.pi / 2
        end_x = x + side * 190 * math.cos(theta)
        end_y = y + side * 190 * math.sin(theta)
        stop = spawn_mesh(cube, 'ASHBOUND / Archive end stop %02d %s' % (index, side),
                          end_x, end_y, 190, .7, .7, 3.8)
        stop.get_editor_property('static_mesh_component').set_visibility(False)

# A taller architectural gate frames the book on the original approach.
gate = place_normalized(archive_arch, 'ASHBOUND / Archive west portal',
                        2290, 0, 0, 720)
gate.set_actor_enable_collision(False)
for side in (-1, 1):
    stop = spawn_mesh(cube, 'ASHBOUND / Portal end stop %s' % side,
                      2290, side * 290, 265, .85, .85, 5.3)
    stop.get_editor_property('static_mesh_component').set_visibility(False)
    spawn_mesh(cube, 'ASHBOUND / Portal light seam %s' % side,
               2185, side * 300, 350, .035, .025, .2, mat=rune_mat)

# The book's clue has a playable consequence: three school-matched seals
# raise the east archive gate. These actors are native game code, not widgets.
east_arch = place_normalized(archive_arch, 'ASHBOUND / Archive east gate arch',
                             3920, 0, 0, 690, yaw=180)
east_arch.set_actor_enable_collision(False)
for side in (-1, 1):
    stop = spawn_mesh(cube, 'ASHBOUND / East gate end stop %s' % side,
                      3920, side * 285, 250, .8, .8, 5.0)
    stop.get_editor_property('static_mesh_component').set_visibility(False)
gate_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDArchiveGate')
seal_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDSeal')
if gate_class is None or seal_class is None:
    raise RuntimeError('Native archive gate and seal classes are not compiled')
east_gate = actors.spawn_actor_from_class(gate_class,
                                          unreal.Vector(3920, 0, 190), unreal.Rotator())
if east_gate is None:
    raise RuntimeError('Native archive gate spawn failed')
east_gate.get_editor_property('door_mesh').set_material(0, stone_mat)
east_gate.set_actor_label('ASHBOUND / Three-seal east gate')
for school, (x, y) in enumerate(((2680, -490), (3430, 0), (2680, 490))):
    spawn_mesh(cube, 'ASHBOUND / Seal plinth %d' % school,
               x, y, 52, 1.0, 1.0, 1.04, mat=stone_mat)
    seal = actors.spawn_actor_from_class(seal_class,
                                          unreal.Vector(x, y, 188), unreal.Rotator())
    if seal is None:
        raise RuntimeError('Native archive seal spawn failed: ' + str(school))
    seal.set_editor_property('required_school', school)
    seal.set_actor_label('ASHBOUND / %s seal - spell %d' %
                         (('Resonanz', 'Glut', 'Neufassung')[school], school))

# Low steps and a table-sized pedestal keep the book in the explorable world.
for index, (width, height) in enumerate(((3.5, 20), (2.5, 24), (1.65, 60))):
    z = (10, 32, 74)[index]
    spawn_mesh(cube, 'ASHBOUND / Archive altar tier %02d' % index,
               vault_x, 0, z, width, width, height / 100, mat=stone_mat)
spawn_mesh(cube, 'ASHBOUND / Altar stone tabletop',
           vault_x, 0, 107, 1.72, 1.72, .06, mat=stone_mat)
for side in (-1, 1):
    spawn_mesh(cube, 'ASHBOUND / Altar bronze east-west inlay %s' % side,
               vault_x, side * 84, 112, 1.68, .025, .025, mat=bronze_mat)
    spawn_mesh(cube, 'ASHBOUND / Altar bronze north-south inlay %s' % side,
               vault_x + side * 84, 0, 112, .025, 1.68, .025, mat=bronze_mat)

book_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDGrimoire')
if book_class is None:
    raise RuntimeError('Native ASHBOUND grimoire module is not compiled')
for volume_index, (side, title) in enumerate(((0, 'Ilyras Buch vom ersten Feuer'),
                                               (-270, 'Nerals Atlas ohne Pfeile'),
                                               (270, 'Kaels Uhrschrift'))):
    if side:
        spawn_mesh(cube, 'ASHBOUND / Reading lectern %d' % volume_index,
                   vault_x, side, 55, 1.65, 1.25, 1.1, mat=stone_mat)
        spawn_mesh(cube, 'ASHBOUND / Reading lectern top %d' % volume_index,
                   vault_x, side, 111, 1.80, 1.42, .06, mat=stone_mat)
    book = actors.spawn_actor_from_class(book_class,
                                         unreal.Vector(vault_x, side, 135),
                                         unreal.Rotator(pitch=35, yaw=0, roll=0))
    if book is None:
        raise RuntimeError('Native grimoire spawn failed: ' + title)
    book.set_editor_property('volume_index', volume_index)
    book.set_actor_label('ASHBOUND / ' + title + ' - F')
    closed_book = book.get_editor_property('closed_book')
    closed_book.set_static_mesh(model('book_encyclopedia_set_01', volume_index))
    closed_book.set_relative_rotation(unreal.Rotator(pitch=90, yaw=0, roll=0), sweep=False, teleport=False)
    closed_book.set_relative_scale3d(unreal.Vector(2.5, 2.5, 2.5))
    closed_book.set_relative_location(unreal.Vector(-30, -5, 0), sweep=False, teleport=False)

# The scanned CC0 volumes provide surface detail around the authored book.
archive_books = paths('book_encyclopedia_set_01') if 'book_encyclopedia_set_01' in imports else []
for index in range(min(6, len(archive_books))):
    mesh = model('book_encyclopedia_set_01', index)
    prop = place_normalized(mesh, 'ASHBOUND / Archive volume %02d' % index,
                            vault_x + 340 + (index % 3) * 86,
                            -225 + (index // 3) * 450, 105, 56,
                            yaw=(index % 3) * 13)
    prop.set_actor_enable_collision(False)

for index, (x, y, hue) in enumerate(((2530, -520, (.28, .55, .7)),
                                     (2530, 520, (1.0, .66, .35)),
                                     (3460, -520, (.28, .55, .7)),
                                     (3460, 520, (1.0, .66, .35)))):
    orb = unreal.load_asset('/Engine/BasicShapes/Sphere')
    spawn_mesh(orb, 'ASHBOUND / Archive light fixture %02d' % index,
               x, y, 290, .12, .12, .12, mat=rune_mat)
    lamp = actors.spawn_actor_from_class(unreal.PointLight,
                                          unreal.Vector(x, y, 300), unreal.Rotator())
    lamp.set_actor_label('ASHBOUND / Archive practical %02d' % index)
    lamp_comp = lamp.get_editor_property('point_light_component')
    lamp_comp.set_editor_property('intensity', 250.0)
    lamp_comp.set_editor_property('attenuation_radius', 600.0)
    lamp_comp.set_editor_property('light_color', unreal.Color(
        int(hue[0] * 255), int(hue[1] * 255), int(hue[2] * 255), 255))
    lamp_comp.set_editor_property('cast_shadows', False)

# The imported modular fort retains piece transforms in its mesh vertices.
# One common transform reconstitutes its architecture at the valley terminus.
fort_meshes = [model('modular_fort_01', i) for i in range(len(paths('modular_fort_01')))]
min_x = min(mesh.get_bounding_box().min.x for mesh in fort_meshes)
max_x = max(mesh.get_bounding_box().max.x for mesh in fort_meshes)
min_y = min(mesh.get_bounding_box().min.y for mesh in fort_meshes)
max_y = max(mesh.get_bounding_box().max.y for mesh in fort_meshes)
min_z = min(mesh.get_bounding_box().min.z for mesh in fort_meshes)
fort_scale = .72
fort_x = 6450 - (min_x + max_x) * fort_scale / 2
fort_y = -(min_y + max_y) * fort_scale / 2
for i, mesh in enumerate(fort_meshes):
    spawn_mesh(mesh, 'ASHBOUND / FORT / %02d' % i,
               fort_x, fort_y, -min_z * fort_scale, fort_scale, mat=stone_mat)

statue = model('gothic_statue')
for i, (x, y) in enumerate([(-200, -850), (-200, 850), (1700, -790), (1700, 790),
                            (3300, -910), (3300, 910)]):
    placed = place_normalized(statue, 'ASHBOUND / Guardian statue %02d' % i,
                              x, y, terrain_height(x, y), 470 + (i % 2) * 70,
                              yaw=90 if y < 0 else -90)
    placed.get_editor_property('static_mesh_component').set_material(0, stone_mat)

boulder = model('boulder_01')
for i in range(94):
    x = rng.uniform(-3000, 9700)
    y = rng.choice([-1, 1]) * rng.uniform(1250, 6850)
    place_normalized(boulder, 'ASHBOUND / Boulder %03d' % i,
                     x, y, terrain_height(x, y) - 30,
                     rng.uniform(130, 650), rng.uniform(0, 360))

sapling = model('pine_sapling_small')
for i in range(74):
    x = rng.uniform(-2400, 9800)
    y = rng.choice([-1, 1]) * rng.uniform(2250, 7300)
    place_normalized(sapling, 'ASHBOUND / Wind pine %03d' % i,
                     x, y, terrain_height(x, y), rng.uniform(420, 770), rng.uniform(0, 360))

stump = model('tree_stump_01')
for i in range(25):
    x = rng.uniform(-2800, 9500)
    y = rng.choice([-1, 1]) * rng.uniform(1400, 5500)
    place_normalized(stump, 'ASHBOUND / Old root %03d' % i,
                     x, y, terrain_height(x, y), rng.uniform(75, 180), rng.uniform(0, 360))

for model_id, count, height_range, lateral in [
    ('rock_moss_set_01', 74, (80, 300), (1100, 6300)),
    ('fern_02', 112, (50, 140), (1100, 4400)),
    ('grass_medium_01', 150, (25, 85), (950, 4500)),
]:
    for i in range(count):
        x = rng.uniform(-2900, 9700)
        y = rng.choice([-1, 1]) * rng.uniform(*lateral)
        mesh = model(model_id, i)
        place_normalized(mesh, 'ASHBOUND / %s %03d' % (model_id, i),
                         x, y, terrain_height(x, y), rng.uniform(*height_range), rng.uniform(0, 360))

manager_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDSpellManager')
if manager_class is None:
    raise RuntimeError('Native ASHBOUND spell module is not compiled')
manager = actors.spawn_actor_from_class(manager_class, unreal.Vector(), unreal.Rotator())
if manager is None:
    raise RuntimeError('Native spell manager spawn failed')
manager.set_actor_label('ASHBOUND / Living magic Q E R')

start = actors.spawn_actor_from_class(unreal.PlayerStart,
                                      unreal.Vector(1000, 0, 160), unreal.Rotator(0, 0, 0))
start.set_actor_label('ASHBOUND / Player entry')

sun = actors.spawn_actor_from_class(unreal.DirectionalLight,
                                    unreal.Vector(0, 0, 4500),
                                    unreal.Rotator(pitch=-28, yaw=-42, roll=0))
sun.set_actor_label('ASHBOUND / Late amber sun')
sun_comp = sun.get_editor_property('directional_light_component')
sun_comp.set_editor_property('intensity', 6.0)
sun_comp.set_editor_property('light_color', unreal.Color(235, 222, 204, 255))
sun_comp.set_editor_property('atmosphere_sun_light', True)
sky = actors.spawn_actor_from_class(unreal.SkyAtmosphere, unreal.Vector(), unreal.Rotator())
sky.set_actor_label('ASHBOUND / Physical atmosphere')
skylight = actors.spawn_actor_from_class(unreal.SkyLight,
                                         unreal.Vector(0, 0, 400), unreal.Rotator())
skylight.set_actor_label('ASHBOUND / Sky fill')
sky_comp = skylight.get_editor_property('light_component')
sky_comp.set_editor_property('real_time_capture', True)
sky_comp.set_editor_property('intensity', .35)
fog = actors.spawn_actor_from_class(unreal.ExponentialHeightFog,
                                    unreal.Vector(0, 0, -80), unreal.Rotator())
fog.set_actor_label('ASHBOUND / Valley atmosphere')
fog_comp = fog.get_editor_property('component')
fog_comp.set_editor_property('fog_density', .0007)
fog_comp.set_editor_property('fog_height_falloff', .22)
fog_comp.set_editor_property('enable_volumetric_fog', True)
clouds = actors.spawn_actor_from_class(unreal.VolumetricCloud,
                                       unreal.Vector(), unreal.Rotator())
clouds.set_actor_label('ASHBOUND / High clouds')

grade = actors.spawn_actor_from_class(unreal.PostProcessVolume,
                                      unreal.Vector(), unreal.Rotator())
grade.set_actor_label('ASHBOUND / Fixed cinematic exposure')
grade.set_editor_property('unbound', True)
look = grade.get_editor_property('settings')
look.set_editor_property('override_auto_exposure_bias', True)
look.set_editor_property('auto_exposure_bias', -1.12)
look.set_editor_property('override_bloom_intensity', True)
look.set_editor_property('bloom_intensity', .055)
grade.set_editor_property('settings', look)

if not level.save_current_level():
    raise RuntimeError('Level save failed')
unreal.EditorAssetLibrary.save_directory('/Game/ASHBOUND', True, True)
receipt = {'map': MAP, 'terrain': terrain_path, 'fortPieces': len(fort_meshes),
           'actorCount': len(actors.get_all_level_actors()), 'entry': [1000, 0, 160],
           'source': 'Poly Haven CC0 + authored heightfield + UE5 first-person template'}
with open(OUT, 'w', encoding='utf-8') as file:
    json.dump(receipt, file, indent=2)
unreal.log('ASHBOUND_WORLD_DONE ' + str(receipt))
