"""Import the rendered archive pages and a swappable lit page material."""
import os
from pathlib import Path

import unreal

root = Path(__file__).resolve().parents[3]
work = Path(os.environ.get('ASHBOUND_NATIVE_WORK', root / '.local-qa' / 'ashbound-unreal'))
pages = work / 'book-pages'
source = sorted(pages.glob('T_BookV??P??.png'))
if len(source) != 12:
    raise RuntimeError(f'Expected 12 existing story pages, found {len(source)} in {pages}')

tools = unreal.AssetToolsHelpers.get_asset_tools()
for image in source:
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', str(image))
    task.set_editor_property('destination_path', '/Game/ASHBOUND/Books')
    task.set_editor_property('automated', True)
    task.set_editor_property('save', True)
    task.set_editor_property('replace_existing', True)
    tools.import_asset_tasks([task])
    if not isinstance(unreal.load_asset('/Game/ASHBOUND/Books/' + image.stem), unreal.Texture2D):
        raise RuntimeError('Unable to import book page ' + image.name)

path = '/Game/ASHBOUND/Books/M_BookPage'
material = unreal.load_asset(path)
if material is None:
    material = tools.create_asset('M_BookPage', '/Game/ASHBOUND/Books',
                                  unreal.Material, unreal.MaterialFactoryNew())
if material is None:
    raise RuntimeError('Unable to author book page material')
unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
sample = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionTextureSampleParameter2D, -300, -80)
sample.set_editor_property('parameter_name', 'PageTexture')
sample.set_editor_property('texture', unreal.load_asset(
    '/Game/ASHBOUND/Books/T_BookV00P00'))
if not unreal.MaterialEditingLibrary.connect_material_property(
        sample, 'RGB', unreal.MaterialProperty.MP_BASE_COLOR):
    raise RuntimeError('Book page base-colour connection failed')
roughness = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionConstant, -300, 170)
roughness.set_editor_property('r', 0.92)
if not unreal.MaterialEditingLibrary.connect_material_property(
        roughness, '', unreal.MaterialProperty.MP_ROUGHNESS):
    raise RuntimeError('Book page roughness connection failed')
unreal.MaterialEditingLibrary.recompile_material(material)
if not unreal.EditorAssetLibrary.save_loaded_asset(material):
    raise RuntimeError('Book page material save failed')
unreal.log('ASHBOUND_BOOK_PAGES_IMPORTED ' + str(len(source)))
