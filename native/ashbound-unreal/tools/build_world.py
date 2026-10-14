"""Author an explorable UE5 ASHBOUND landscape from CC0 source assets.

This runs in the editor commandlet. Gameplay is supplied by the first-person
Blueprint template; Python does not run inside a packaged game.
"""
import json
import math
import os
import random
import sys
from pathlib import Path
import unreal

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from surface_reference import walk_surface, support_span
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
road_path = '/Game/ASHBOUND/Terrain/ASHBOUND_WornRoad.ASHBOUND_WornRoad'
if not unreal.EditorAssetLibrary.does_asset_exist(road_path):
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', os.path.join(HERE, 'ASHBOUND_WornRoad.obj'))
    task.set_editor_property('destination_path', '/Game/ASHBOUND/Terrain')
    task.set_editor_property('automated', True)
    task.set_editor_property('save', True)
    asset_tools.import_asset_tasks([task])
road_mesh = unreal.load_asset(road_path)
if not isinstance(road_mesh, unreal.StaticMesh):
    raise RuntimeError('Worn road static mesh import failed: ' + road_path)
# The automatic Nanite fallback reduced 18,240 authored triangles to 255.
# The road is collision geometry as well as scenery; keep its actual ruts.
road_nanite = road_mesh.get_editor_property('nanite_settings')
road_nanite.set_editor_property('enabled', False)
road_mesh.set_editor_property('nanite_settings', road_nanite)
terrain_body = terrain_mesh.get_editor_property('body_setup')
if terrain_body is None:
    raise RuntimeError('Terrain has no body setup: ' + terrain_path)
# The imported OBJ's default simple collision is a canyon-sized box. The
# terrain never simulates physics, so its triangles can instead provide the
# walkable shape for pawn collision and aim/ground traces.
terrain_body.set_editor_property(
    'collision_trace_flag', unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
if terrain_body.get_editor_property(
        'collision_trace_flag') != unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE:
    raise RuntimeError('Terrain collision complexity was not applied')
if not unreal.EditorAssetLibrary.save_loaded_asset(terrain_mesh):
    raise RuntimeError('Terrain collision setup could not be saved')
road_body = road_mesh.get_editor_property('body_setup')
if road_body is None:
    raise RuntimeError('Road has no body setup')
road_body.set_editor_property('collision_trace_flag',
                              unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
if not unreal.EditorAssetLibrary.save_loaded_asset(road_mesh):
    raise RuntimeError('Road collision setup could not be saved')

def make_surface(name, prefix):
    path = '/Game/ASHBOUND/Surfaces/' + name
    material = unreal.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path) else None
    if not material:
        material = asset_tools.create_asset(name, '/Game/ASHBOUND/Surfaces',
                                            unreal.Material, unreal.MaterialFactoryNew())
    if name == 'M_AshGround':
        material.set_editor_property('two_sided', True)
    unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
    surface_uv = None
    if name in ('M_AshGround', 'M_AshRoad'):
        surface_uv = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionTextureCoordinate, -750, 0)
        # Terrain OBJ spans 140 x 160 m with ~20 UV repeats. The central road
        # spans 140 x 29 m with a single UV repeat. Keep both near 2 m/texture
        # so that the same rock pattern does not appear as giant square sheets.
        surface_uv.set_editor_property('u_tiling', 3.5 if name == 'M_AshGround' else 70.0)
        surface_uv.set_editor_property('v_tiling', 4.0 if name == 'M_AshGround' else 14.0)
    textures = {
        'diffuse': unreal.MaterialProperty.MP_BASE_COLOR,
        'nor_gl': unreal.MaterialProperty.MP_NORMAL,
        'rough': unreal.MaterialProperty.MP_ROUGHNESS,
    }
    for i, (kind, target) in enumerate(textures.items()):
        texture = unreal.load_asset('/Game/ASHBOUND/Surfaces/' + prefix + '_' + kind)
        if texture is None:
            raise RuntimeError('Missing ' + prefix + '_' + kind)
        if kind == 'diffuse':
            texture.set_editor_property('srgb', True)
        elif kind == 'nor_gl':
            texture.set_editor_property('srgb', False)
            texture.set_editor_property('compression_settings', unreal.TextureCompressionSettings.TC_NORMALMAP)
            # Poly Haven's nor_gl maps use the OpenGL (+Y) tangent convention.
            # Unreal expects -Y; invert green without altering source bytes.
            texture.set_editor_property('flip_green_channel', True)
        elif kind == 'rough':
            texture.set_editor_property('srgb', False)
            texture.set_editor_property('compression_settings', unreal.TextureCompressionSettings.TC_MASKS)
        if not unreal.EditorAssetLibrary.save_loaded_asset(texture):
            raise RuntimeError('Texture settings could not be saved: ' + kind)
        sample = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionTextureSample, -450, i * 240)
        sample.set_editor_property('texture', texture)
        if surface_uv is not None:
            unreal.MaterialEditingLibrary.connect_material_expressions(surface_uv, '', sample, 'UVs')
        if not unreal.MaterialEditingLibrary.connect_material_property(sample, '', target):
            raise RuntimeError('Material connection failed: ' + kind)
    unreal.MaterialEditingLibrary.recompile_material(material)
    if not unreal.EditorAssetLibrary.save_loaded_asset(material):
        raise RuntimeError('Surface material could not be saved: ' + name)
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
iron_mat = make_vault_material('M_VaultIron', (.44, .50, .55), .23)
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
# The authored surface extends to Y +/-8000. The central road below covers
# only Y +/-1450, so disabling this actor used to leave both slopes non-solid.
terrain_actor.set_actor_enable_collision(True)
terrain_component = terrain_actor.get_editor_property('static_mesh_component')
terrain_component.set_collision_profile_name('BlockAll')
terrain_component.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
cube = unreal.load_asset('/Engine/BasicShapes/Cube')
if cube is None:
    raise RuntimeError('Engine cube missing')
cylinder = unreal.load_asset('/Engine/BasicShapes/Cylinder')
sphere = unreal.load_asset('/Engine/BasicShapes/Sphere')
if cylinder is None or sphere is None:
    raise RuntimeError('Engine cylinder or sphere missing')
road_actor = spawn_mesh(road_mesh, 'ASHBOUND / Walkable worn road', 0, 0, 0,
                        mat=road_mat)
road_actor.set_actor_enable_collision(True)
road_component = road_actor.get_editor_property('static_mesh_component')
road_component.set_collision_profile_name('BlockAll')
road_component.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)

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
    # All grounded objects refer to the exported triangles, including the
    # visible road where it is above the carved valley collision surface.
    return walk_surface(x, y)

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
    arch_ground = support_span(x, y, 185, 185)[0]
    arch = place_normalized(archive_arch, 'ASHBOUND / Archive arch %02d' % index,
                            x, y, arch_ground - 14, 480 + (index % 3) * 28,
                            yaw=math.degrees(angle))
    arch.set_actor_enable_collision(False)
    for side in (-1, 1):
        # The imported arch uses box collision. Narrow invisible end stops
        # retain a walkable opening without blocking its visible aperture.
        theta = angle + math.pi / 2
        end_x = x + side * 190 * math.cos(theta)
        end_y = y + side * 190 * math.sin(theta)
        stop = spawn_mesh(cube, 'ASHBOUND / Archive end stop %02d %s' % (index, side),
                          end_x, end_y, arch_ground + 190, .7, .7, 3.8)
        stop.get_editor_property('static_mesh_component').set_visibility(False)

# A taller architectural gate frames the book on the original approach.
west_ground = support_span(2290, 0, 140, 280)[0]
gate = place_normalized(archive_arch, 'ASHBOUND / Archive west portal',
                        2290, 0, west_ground - 12, 720)
gate.set_actor_enable_collision(False)
for side in (-1, 1):
    stop = spawn_mesh(cube, 'ASHBOUND / Portal end stop %s' % side,
                      2290, side * 290, west_ground + 265, .85, .85, 5.3)
    stop.get_editor_property('static_mesh_component').set_visibility(False)
    spawn_mesh(cube, 'ASHBOUND / Portal light seam %s' % side,
               2185, side * 300, west_ground + 350, .035, .025, .2, mat=rune_mat)
    # Thick, partly buried footings attach the gate to the road surface.
    spawn_mesh(cylinder, 'ASHBOUND / Portal foundation %s' % side,
               2290, side * 290, west_ground + 5, 1.45, 1.45, .36, mat=stone_mat)

# The book's clue has a playable consequence: three school-matched seals
# raise the east archive gate. These actors are native game code, not widgets.
east_ground = support_span(3920, 0, 140, 280)[0]
east_arch = place_normalized(archive_arch, 'ASHBOUND / Archive east gate arch',
                             3920, 0, east_ground - 12, 690, yaw=180)
east_arch.set_actor_enable_collision(False)
for side in (-1, 1):
    stop = spawn_mesh(cube, 'ASHBOUND / East gate end stop %s' % side,
                      3920, side * 285, east_ground + 250, .8, .8, 5.0)
    stop.get_editor_property('static_mesh_component').set_visibility(False)
gate_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDArchiveGate')
seal_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDSeal')
if gate_class is None or seal_class is None:
    raise RuntimeError('Native archive gate and seal classes are not compiled')
east_gate = actors.spawn_actor_from_class(gate_class,
                                          unreal.Vector(3920, 0, east_ground + 190),
                                          unreal.Rotator())
if east_gate is None:
    raise RuntimeError('Native archive gate spawn failed')
east_gate.get_editor_property('door_mesh').set_material(0, stone_mat)
east_gate.set_actor_label('ASHBOUND / Three-seal east gate')
for school, (x, y) in enumerate(((2680, -490), (3430, 0), (2680, 490))):
    # Three readable parts make each seal a piece of the archive, not a cube.
    seal_ground = terrain_height(x, y)
    spawn_mesh(cylinder, 'ASHBOUND / Seal foot %d' % school,
               x, y, seal_ground + 14, 1.6, 1.6, .28, mat=stone_mat)
    spawn_mesh(cylinder, 'ASHBOUND / Seal column %d' % school,
               x, y, seal_ground + 63, .91, .91, .72, mat=stone_mat)
    spawn_mesh(cylinder, 'ASHBOUND / Seal capital %d' % school,
               x, y, seal_ground + 109, 1.27, 1.27, .19, mat=stone_mat)
    spawn_mesh(cylinder, 'ASHBOUND / Seal bronze lip %d' % school,
               x, y, seal_ground + 119, 1.12, 1.12, .025, mat=bronze_mat)
    seal = actors.spawn_actor_from_class(seal_class,
                                          unreal.Vector(x, y, seal_ground + 157),
                                          unreal.Rotator())
    if seal is None:
        raise RuntimeError('Native archive seal spawn failed: ' + str(school))
    seal.set_editor_property('required_school', school)
    seal.set_actor_label('ASHBOUND / %s seal - spell %d' %
                         (('Resonanz', 'Glut', 'Neufassung')[school], school))

# The central reading dais has a walkable footprint and a smaller stone desk.
altar_ground = terrain_height(vault_x, 0)
for index, (z, radius, height) in enumerate(((10, 3.3, .20), (28, 2.5, .16),
                                             (73, 1.42, .74), (113, 1.65, .07))):
    spawn_mesh(cylinder, 'ASHBOUND / Archive altar tier %02d' % index,
               vault_x, 0, altar_ground + z, radius, radius, height, mat=stone_mat)
spawn_mesh(cylinder, 'ASHBOUND / Altar bronze rim',
           vault_x, 0, altar_ground + 119, 1.52, 1.52, .015, mat=bronze_mat)
for side in (-1, 1):
    desk_ground = terrain_height(vault_x, side * 270)
    spawn_mesh(cylinder, 'ASHBOUND / Reading desk foot %s' % side,
               vault_x, side * 270, desk_ground + 49, 1.32, 1.32, .98,
               mat=stone_mat)
    spawn_mesh(cylinder, 'ASHBOUND / Reading desk rim %s' % side,
               vault_x, side * 270, desk_ground + 102, 1.5, 1.5, .08,
               mat=bronze_mat)

book_class = unreal.load_class(None, '/Script/ASHBOUNDUE.ASHBOUNDGrimoire')
if book_class is None:
    raise RuntimeError('Native ASHBOUND grimoire module is not compiled')
book_placements = (
    # desk Y, title, position on the desk, facing, surface height, surface radius
    (0, 'Ilyras Buch vom ersten Feuer', -9, 4, -18, 119.75, 76),
    (-270, 'Nerals Atlas ohne Pfeile', 11, -6, 37, 106, 75),
    (270, 'Kaels Uhrschrift', -4, 10, -53, 106, 75),
)
for volume_index, (side, title, dx, dy, yaw, surface_z, radius) in enumerate(book_placements):
    surface_z += terrain_height(vault_x, side)
    volume = model('book_encyclopedia_set_01', volume_index)
    bounds = volume.get_bounding_box()
    book_scale = 2.5
    # The source scans have different baked X offsets. With a 90-degree pitch,
    # source X becomes height and source Z becomes the length of the closed book.
    half_length = (bounds.max.z - bounds.min.z) * book_scale / 2
    half_width = (bounds.max.y - bounds.min.y) * book_scale / 2
    if math.hypot(dx, dy) + math.hypot(half_length, half_width) >= radius:
        raise RuntimeError('Grimoire footprint exceeds its reading desk: ' + title)
    root_z = surface_z + 3
    book = actors.spawn_actor_from_class(book_class,
                                         unreal.Vector(vault_x + dx, side + dy, root_z),
                                         unreal.Rotator(pitch=0, yaw=yaw, roll=0))
    if book is None:
        raise RuntimeError('Native grimoire spawn failed: ' + title)
    book.set_editor_property('volume_index', volume_index)
    book.set_actor_label('ASHBOUND / ' + title + ' - F')
    closed_book = book.get_editor_property('closed_book')
    closed_book.set_static_mesh(volume)
    closed_book.set_relative_rotation(unreal.Rotator(pitch=90, yaw=0, roll=0), sweep=False, teleport=False)
    closed_book.set_relative_scale3d(unreal.Vector(book_scale, book_scale, book_scale))
    closed_book.set_relative_location(
        unreal.Vector((bounds.min.z + bounds.max.z) * book_scale / 2,
                      -(bounds.min.y + bounds.max.y) * book_scale / 2,
                      surface_z - root_z - bounds.min.x * book_scale),
        sweep=False, teleport=False)

# Only the loose metal dagger is magnetizable. The books and desks keep their
# ordinary support relationship and never inherit the metal ability.
dagger = model('ornate_medieval_dagger')
dagger_bounds = dagger.get_bounding_box()
dagger_scale = 1.2
dagger_mid_z = (dagger_bounds.min.z + dagger_bounds.max.z) / 2
relic = spawn_mesh(dagger, 'ASHBOUND / Loose metal dagger - M',
                   vault_x + dagger_mid_z * dagger_scale, 327,
                   terrain_height(vault_x, 270) + 106 - dagger_bounds.min.x * dagger_scale,
                   dagger_scale, yaw=25, pitch=90, mat=iron_mat)
relic.set_editor_property('tags', [unreal.Name('ASHBOUND_Magnetic')])

for index, (x, y, hue) in enumerate(((2530, -520, (.28, .55, .7)),
                                     (2530, 520, (1.0, .66, .35)),
                                     (3460, -520, (.28, .55, .7)),
                                     (3460, 520, (1.0, .66, .35)))):
    # A recessed glass ember inside a bronze lantern replaces the bare orb.
    spawn_mesh(cylinder, 'ASHBOUND / Lantern foot %02d' % index,
               x, y, terrain_height(x, y) + 218, .47, .47, .09, mat=bronze_mat)
    spawn_mesh(cylinder, 'ASHBOUND / Lantern stem %02d' % index,
               x, y, terrain_height(x, y) + 253, .12, .12, .65, mat=bronze_mat)
    spawn_mesh(cylinder, 'ASHBOUND / Lantern cage %02d' % index,
               x, y, terrain_height(x, y) + 291, .42, .42, .12, mat=bronze_mat)
    spawn_mesh(sphere, 'ASHBOUND / Lantern ember %02d' % index,
               x, y, terrain_height(x, y) + 300, .035, .035, .035, mat=rune_mat)
    spawn_mesh(cylinder, 'ASHBOUND / Lantern crown %02d' % index,
               x, y, terrain_height(x, y) + 312, .48, .48, .09, mat=bronze_mat)
    lamp = actors.spawn_actor_from_class(unreal.PointLight,
                                          unreal.Vector(x, y,
                                                        terrain_height(x, y) + 300),
                                          unreal.Rotator())
    lamp.set_actor_label('ASHBOUND / Archive practical %02d' % index)
    lamp_comp = lamp.get_editor_property('point_light_component')
    lamp_comp.set_editor_property('intensity', 170.0)
    lamp_comp.set_editor_property('attenuation_radius', 520.0)
    lamp_comp.set_editor_property('light_color', unreal.Color(
        int(hue[0] * 255), int(hue[1] * 255), int(hue[2] * 255), 255))
    lamp_comp.set_editor_property('cast_shadows', False)

# A visible source for the genesis light, connected to the ground by stone.
for index, (z, radius, height) in enumerate(((-8, 1.38, .34),
                                             (40, .82, .72),
                                             (85, 1.08, .18))):
    spawn_mesh(cylinder, 'ASHBOUND / Genesis foundation %02d' % index,
               1450, 625, z, radius, radius, height, mat=stone_mat)
spawn_mesh(cylinder, 'ASHBOUND / Genesis engraved rim',
           1450, 625, 96, .95, .95, .035, mat=bronze_mat)

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
# The scanned pieces share baked XY transforms, but their zero-height plane
# stayed above the irregular path at the fort approach. Seat the whole ruin
# into the soil without changing any wall-to-wall alignment.
fort_ground = support_span(6450, 0, 200, 400)[0]
fort_base_z = -min_z * fort_scale + fort_ground - 35
for i, mesh in enumerate(fort_meshes):
    spawn_mesh(mesh, 'ASHBOUND / FORT / %02d' % i,
               fort_x, fort_y, fort_base_z, fort_scale, mat=stone_mat)

statue = model('gothic_statue')
for i, (x, y) in enumerate([(-200, -850), (-200, 850), (1700, -790), (1700, 790),
                            (3300, -910), (3300, 910)]):
    statue_height = 470 + (i % 2) * 70
    placed = place_normalized(statue, 'ASHBOUND / Guardian statue %02d' % i,
                              x, y, support_span(x, y, 160, 160)[0] - 12,
                              statue_height,
                              yaw=90 if y < 0 else -90)
    placed.get_editor_property('static_mesh_component').set_material(0, stone_mat)

boulder = model('boulder_01')
for i in range(94):
    x = rng.uniform(-3000, 9700)
    y = rng.choice([-1, 1]) * rng.uniform(1850, 6850)
    height = rng.uniform(130, 650)
    ground_low = support_span(x, y, height * .72, height * .85)[0]
    place_normalized(boulder, 'ASHBOUND / Boulder %03d' % i,
                     x, y, ground_low - height * .34,
                     height, rng.uniform(0, 360))

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
                     x, y, support_span(x, y, 45, 45)[0] - 15,
                     rng.uniform(75, 180), rng.uniform(0, 360))

for model_id, count, height_range, lateral in [
    ('rock_moss_set_01', 74, (80, 300), (1100, 6300)),
    ('fern_02', 112, (50, 140), (1100, 4400)),
    ('grass_medium_01', 150, (25, 85), (950, 4500)),
]:
    for i in range(count):
        x = rng.uniform(-2900, 9700)
        y = rng.choice([-1, 1]) * rng.uniform(*lateral)
        mesh = model(model_id, i)
        height = rng.uniform(*height_range)
        inset = height * (.14 if model_id == 'rock_moss_set_01' else .06)
        support = (support_span(x, y, height * .8, height * .8)[0]
                   if model_id == 'rock_moss_set_01' else terrain_height(x, y))
        place_normalized(mesh, 'ASHBOUND / %s %03d' % (model_id, i),
                         x, y, support - inset, height, rng.uniform(0, 360))

# A few low, buried stones and wind plants make the playable route itself
# read as a surface. Keep the central lane clear for collision and spells.
for i in range(190):
    x = rng.uniform(-900, 7200)
    side = rng.choice((-1, 1))
    y = side * rng.uniform(430, 1220)
    height = rng.uniform(20, 74)
    mesh = model('rock_moss_set_01', i)
    place_normalized(mesh, 'ASHBOUND / Buried road stone %03d' % i,
                     x, y, support_span(x, y, height * .85,
                                        height * .85)[0] - height * .28,
                     height, rng.uniform(0, 360))
for i in range(90):
    x = rng.uniform(-500, 6900)
    y = rng.uniform(-390, 390)
    height = rng.uniform(7, 22)
    pebble = place_normalized(model('rock_moss_set_01', i),
                              'ASHBOUND / Walkway pebble %03d' % i,
                              x, y, support_span(x, y, height, height)[0]
                              - height * .40,
                              height, rng.uniform(0, 360))
    pebble.get_editor_property('static_mesh_component').set_collision_enabled(
        unreal.CollisionEnabled.NO_COLLISION)
for i in range(140):
    x = rng.uniform(-600, 7000)
    y = rng.choice((-1, 1)) * rng.uniform(600, 1380)
    height = rng.uniform(32, 94)
    mesh = model('fern_02', i)
    plant = place_normalized(mesh, 'ASHBOUND / Roadside fern %03d' % i,
                             x, y, terrain_height(x, y) - height * .08,
                             height, rng.uniform(0, 360))
    plant.get_editor_property('static_mesh_component').set_material(0,
        unreal.load_asset('/Game/ASHBOUND/Materials/M_GroveFern'))

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
fog_comp.set_editor_property('fog_density', .007)
fog_comp.set_editor_property('fog_height_falloff', .055)
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
           'terrainCollision': 'CTF_USE_COMPLEX_AS_SIMPLE',
           'source': 'Poly Haven CC0 + authored heightfield + UE5 first-person template'}
with open(OUT, 'w', encoding='utf-8') as file:
    json.dump(receipt, file, indent=2)
unreal.log('ASHBOUND_WORLD_DONE ' + str(receipt))
