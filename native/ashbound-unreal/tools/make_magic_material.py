"""Author an additive emissive material controlled by the native spell actor."""
import os
import unreal

TOOLS = unreal.AssetToolsHelpers.get_asset_tools()
PATH = '/Game/ASHBOUND/Materials/M_LivingSpellSoft'
if unreal.EditorAssetLibrary.does_asset_exist(PATH):
    material = unreal.load_asset(PATH)
    nodes = unreal.MaterialEditingLibrary.get_material_expressions(material)
    fresnel = next((node for node in nodes if isinstance(node, unreal.MaterialExpressionFresnel)), None)
    soft_edge = next((node for node in nodes if isinstance(node, unreal.MaterialExpressionOneMinus)), None)
    if fresnel is None or soft_edge is None:
        raise RuntimeError('Existing soft-light material has an unexpected graph')
    fresnel.set_editor_property('exponent', 1.0)
    fresnel.set_editor_property('base_reflect_fraction', 0.0)
    if not unreal.MaterialEditingLibrary.connect_material_expressions(fresnel, '', soft_edge, ''):
        raise RuntimeError('Unable to repair the soft-light edge input')
    unreal.MaterialEditingLibrary.recompile_material(material)
    if not unreal.EditorAssetLibrary.save_loaded_asset(material):
        raise RuntimeError('Soft-light material save failed')
    unreal.log('ASHBOUND_MAGIC_MATERIAL_DONE')
    raise SystemExit(0)
material = TOOLS.create_asset('M_LivingSpellSoft', '/Game/ASHBOUND/Materials',
                              unreal.Material, unreal.MaterialFactoryNew())
if material is None:
    raise RuntimeError('Unable to create magic material')
material.set_editor_property('blend_mode', unreal.BlendMode.BLEND_ADDITIVE)
material.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_UNLIT)
material.set_editor_property('two_sided', True)
color = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionVectorParameter, -500, -150)
color.set_editor_property('parameter_name', 'SpellColor')
color.set_editor_property('default_value', unreal.LinearColor(.02, .75, 1.0, 1.0))
radiance = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionScalarParameter, -500, 100)
radiance.set_editor_property('parameter_name', 'Radiance')
radiance.set_editor_property('default_value', 1.5)
multiply = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionMultiply, -150, -40)
unreal.MaterialEditingLibrary.connect_material_expressions(color, '', multiply, 'A')
unreal.MaterialEditingLibrary.connect_material_expressions(radiance, '', multiply, 'B')
# Fade the silhouettes of the low-cost sphere meshes instead of rendering
# every triangle edge as a hard, uniformly bright polygon.
fresnel = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionFresnel, -430, 300)
fresnel.set_editor_property('exponent', 1.0)
fresnel.set_editor_property('base_reflect_fraction', 0.0)
soft_edge = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionOneMinus, -210, 280)
if not unreal.MaterialEditingLibrary.connect_material_expressions(fresnel, '', soft_edge, ''):
    raise RuntimeError('Unable to connect the soft-light edge input')
soft_glow = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionMultiply, 40, -40)
unreal.MaterialEditingLibrary.connect_material_expressions(multiply, '', soft_glow, 'A')
unreal.MaterialEditingLibrary.connect_material_expressions(soft_edge, '', soft_glow, 'B')
if not unreal.MaterialEditingLibrary.connect_material_property(
        soft_glow, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR):
    raise RuntimeError('Emissive connection failed')
unreal.MaterialEditingLibrary.recompile_material(material)
if not unreal.EditorAssetLibrary.save_loaded_asset(material):
    raise RuntimeError('Magic material save failed')
unreal.log('ASHBOUND_MAGIC_MATERIAL_DONE')
