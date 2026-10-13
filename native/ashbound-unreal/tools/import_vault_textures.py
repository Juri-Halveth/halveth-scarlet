"""Import authored material images for the native book, as project assets."""
from pathlib import Path
import unreal

root = Path(__file__).resolve().parents[3]
source_dir = root / 'native' / 'ashbound-unreal' / 'art' / 'materials'
for name in ('T_VaultPaper.png', 'T_VaultLeather.png'):
    source = source_dir / name
    if not source.is_file():
        raise RuntimeError('Missing native material image: ' + str(source))
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', str(source))
    task.set_editor_property('destination_path', '/Game/ASHBOUND/Materials')
    task.set_editor_property('automated', True)
    task.set_editor_property('save', True)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    imported = unreal.load_asset('/Game/ASHBOUND/Materials/' + source.stem)
    if not isinstance(imported, unreal.Texture2D):
        raise RuntimeError('Native material import failed: ' + name)
    unreal.log('ASHBOUND_VAULT_TEXTURE_IMPORTED ' + name)
