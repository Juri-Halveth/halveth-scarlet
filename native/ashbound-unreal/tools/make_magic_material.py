"""Author an additive emissive material controlled by the native spell actor."""
import os
import unreal

TOOLS = unreal.AssetToolsHelpers.get_asset_tools()
PATH = '/Game/ASHBOUND/Materials/M_LivingSpell'
material = unreal.load_asset(PATH)
if material is None:
    material = TOOLS.create_asset('M_LivingSpell', '/Game/ASHBOUND/Materials',
                                  unreal.Material, unreal.MaterialFactoryNew())
if material is None:
    raise RuntimeError('Unable to create magic material')
material.set_editor_property('blend_mode', unreal.BlendMode.BLEND_ADDITIVE)
material.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_UNLIT)
material.set_editor_property('two_sided', True)
unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
color = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionVectorParameter, -500, -150)
color.set_editor_property('parameter_name', 'SpellColor')
color.set_editor_property('default_value', unreal.LinearColor(.02, .75, 1.0, 1.0))
radiance = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionScalarParameter, -500, 100)
radiance.set_editor_property('parameter_name', 'Radiance')
radiance.set_editor_property('default_value', 6.0)
multiply = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionMultiply, -150, -40)
unreal.MaterialEditingLibrary.connect_material_expressions(color, '', multiply, 'A')
unreal.MaterialEditingLibrary.connect_material_expressions(radiance, '', multiply, 'B')
if not unreal.MaterialEditingLibrary.connect_material_property(
        multiply, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR):
    raise RuntimeError('Emissive connection failed')
unreal.MaterialEditingLibrary.recompile_material(material)
if not unreal.EditorAssetLibrary.save_loaded_asset(material):
    raise RuntimeError('Magic material save failed')
unreal.log('ASHBOUND_MAGIC_MATERIAL_DONE')
