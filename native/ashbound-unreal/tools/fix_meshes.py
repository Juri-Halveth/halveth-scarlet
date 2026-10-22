"""Make imported CC0 geometry render with its authored materials in UE 5.8."""
import json
import os
from pathlib import Path
import unreal

paths = unreal.EditorAssetLibrary.list_assets('/Game/ASHBOUND', recursive=True, include_folder=False)
changed = []
usage_changed = []
for path in paths:
    asset = unreal.EditorAssetLibrary.load_asset(path)
    if isinstance(asset, unreal.MaterialInstanceConstant):
        for usage in (unreal.MaterialUsage.MATUSAGE_INSTANCED_STATIC_MESHES,
                      unreal.MaterialUsage.MATUSAGE_NANITE):
            unreal.MaterialEditingLibrary.set_material_usage_override(asset, usage, True, True)
        if not unreal.EditorAssetLibrary.save_loaded_asset(asset):
            raise RuntimeError('Could not save instanced material usage: ' + path)
        usage_changed.append(path)
        continue
    if not isinstance(asset, unreal.StaticMesh):
        continue
    settings = asset.get_editor_property('nanite_settings')
    if settings.get_editor_property('enabled'):
        settings.set_editor_property('enabled', False)
        asset.set_editor_property('nanite_settings', settings)
        if not unreal.EditorAssetLibrary.save_loaded_asset(asset):
            raise RuntimeError('Could not save static mesh: ' + path)
        changed.append(path)

repo = Path(__file__).resolve().parents[3]
work = Path(os.environ.get('ASHBOUND_NATIVE_WORK', repo / '.local-qa' / 'ashbound-unreal'))
out = work / 'fix_meshes.json'
with open(out, 'w', encoding='utf-8') as file:
    json.dump({'meshCount': len(changed), 'meshes': changed,
               'materialUsageCount': len(usage_changed),
               'materialUsageAssets': usage_changed}, file, indent=2)
unreal.log('ASHBOUND_MESH_FIX_DONE meshes=' + str(len(changed)) +
           ' instanced_materials=' + str(len(usage_changed)))
