import json
import os
from pathlib import Path
import unreal

root = Path(__file__).resolve().parents[3]
work = Path(os.environ.get('ASHBOUND_NATIVE_WORK', root / '.local-qa' / 'ashbound-unreal'))
out = work / 'import_world.json'
extra = work / 'source-assets' / 'models'
web = root / 'forschung' / 'ashbound' / 'play' / 'assets' / 'models'
ids = ['modular_fort_01', 'pine_sapling_small', 'rock_moss_set_01', 'fern_02',
       'tree_stump_01', 'grass_medium_01', 'boulder_01', 'dead_tree_trunk', 'gothic_statue',
       'ornate_medieval_dagger', 'book_encyclopedia_set_01']
result = {}
for model_id in ids:
    source_root = web if model_id in ['boulder_01', 'dead_tree_trunk', 'gothic_statue',
                                      'ornate_medieval_dagger'] else extra
    source = source_root / model_id / (model_id + '_1k.gltf')
    if not source.is_file():
        raise RuntimeError('Missing model source: ' + str(source))
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', str(source))
    task.set_editor_property('destination_path', '/Game/ASHBOUND/Models/' + model_id)
    task.set_editor_property('automated', True)
    task.set_editor_property('save', True)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    paths = list(task.get_editor_property('imported_object_paths'))
    meshes = []
    for asset_path in paths:
        asset = unreal.load_asset(asset_path)
        if isinstance(asset, unreal.StaticMesh):
            box = asset.get_bounding_box()
            meshes.append({'path': asset_path, 'bounds': str(box),
                           'triangles': asset.get_num_triangles(0)})
    if not meshes:
        raise RuntimeError('No static meshes imported from: ' + str(source))
    result[model_id] = {'source': str(source), 'meshCount': len(meshes), 'meshes': meshes}
    with open(out, 'w', encoding='utf-8') as file:
        json.dump(result, file, indent=2)
    unreal.log('ASHBOUND_IMPORTED ' + model_id + ' ' + str(len(meshes)))

# 2K images were already hash-bound in the public WebGL art manifest.
for name in ['rocky_terrain_03_diffuse.jpg', 'rocky_terrain_03_nor_gl.jpg',
             'rocky_terrain_03_rough.jpg', 'old_stone_wall_02_diffuse.jpg',
             'old_stone_wall_02_nor_gl.jpg', 'old_stone_wall_02_rough.jpg']:
    source = root / 'forschung' / 'ashbound' / 'play' / 'assets' / 'surfaces' / name
    if not source.is_file():
        raise RuntimeError('Missing surface source: ' + str(source))
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', str(source))
    task.set_editor_property('destination_path', '/Game/ASHBOUND/Surfaces')
    task.set_editor_property('automated', True)
    task.set_editor_property('save', True)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    result[name] = list(task.get_editor_property('imported_object_paths'))
    if not result[name]:
        raise RuntimeError('No texture imported from: ' + str(source))
with open(out, 'w', encoding='utf-8') as file:
    json.dump(result, file, indent=2)
