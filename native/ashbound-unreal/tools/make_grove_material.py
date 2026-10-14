"""Give instanced Reweave ferns a local masked material with a visible leaf tint."""
import unreal

PATH = '/Game/ASHBOUND/Materials/M_GroveFern'
TEXTURE = '/Game/ASHBOUND/Models/fern_02/fern_02_1k/Textures/fern_02_diff-fern_02_alpha'

texture = unreal.load_asset(TEXTURE)
if not isinstance(texture, unreal.Texture2D):
    raise RuntimeError('Reweave fern colour/alpha texture missing: ' + TEXTURE)

material = (unreal.load_asset(PATH) if unreal.EditorAssetLibrary.does_asset_exist(PATH)
            else unreal.AssetToolsHelpers.get_asset_tools().create_asset(
                'M_GroveFern', '/Game/ASHBOUND/Materials',
                unreal.Material, unreal.MaterialFactoryNew()))
if not isinstance(material, unreal.Material):
    raise RuntimeError('Could not create Reweave fern material')

material.set_editor_property('blend_mode', unreal.BlendMode.BLEND_MASKED)
material.set_editor_property('two_sided', True)
material.set_editor_property('used_with_instanced_static_meshes', True)
unreal.MaterialEditingLibrary.delete_all_material_expressions(material)

sample = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionTextureSample, -720, -80)
sample.set_editor_property('texture', texture)
tint = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionVectorParameter, -450, 100)
tint.set_editor_property('parameter_name', 'LeafTint')
tint.set_editor_property('default_value', unreal.LinearColor(.38, .78, .33, 1.0))
colour = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionMultiply, -170, -60)
roughness = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionScalarParameter, -300, 320)
roughness.set_editor_property('parameter_name', 'LeafRoughness')
roughness.set_editor_property('default_value', .83)

if not unreal.MaterialEditingLibrary.connect_material_expressions(sample, 'RGB', colour, 'A'):
    raise RuntimeError('Could not connect fern colour texture')
if not unreal.MaterialEditingLibrary.connect_material_expressions(tint, '', colour, 'B'):
    raise RuntimeError('Could not connect fern tint')
for expression, output, destination in (
        (colour, '', unreal.MaterialProperty.MP_BASE_COLOR),
        (sample, 'A', unreal.MaterialProperty.MP_OPACITY_MASK),
        (roughness, '', unreal.MaterialProperty.MP_ROUGHNESS)):
    if not unreal.MaterialEditingLibrary.connect_material_property(
            expression, output, destination):
        raise RuntimeError('Could not connect Reweave material property: ' + str(destination))

unreal.MaterialEditingLibrary.recompile_material(material)
if not unreal.EditorAssetLibrary.save_loaded_asset(material):
    raise RuntimeError('Could not save Reweave material')
if not material.get_editor_property('used_with_instanced_static_meshes'):
    raise RuntimeError('Reweave material lost instanced mesh usage')
unreal.log('ASHBOUND_GROVE_MATERIAL_READY ' + PATH)
