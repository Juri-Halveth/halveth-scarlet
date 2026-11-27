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
wind_time = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionTime, -720, 500)
wind_intensity = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionScalarParameter, -470, 630)
wind_intensity.set_editor_property('parameter_name', 'WindIntensity')
wind_intensity.set_editor_property('default_value', 8.0)
wind_speed = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionScalarParameter, -470, 510)
wind_speed.set_editor_property('parameter_name', 'WindSpeed')
wind_speed.set_editor_property('default_value', .8)
phase = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionMultiply, -220, 490)
wave = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionSine, 0, 490)
world_position = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionWorldPosition, -720, 790)
object_position = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionObjectPositionWS, -720, 940)
height_delta = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionSubtract, -470, 850)
height_z = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionComponentMask, -230, 850)
height_z.set_editor_property('r', False)
height_z.set_editor_property('g', False)
height_z.set_editor_property('b', True)
height_scale = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionMultiply, 0, 850)
height_scale.set_editor_property('const_b', .015)
height_clamp = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionClamp, 220, 850)
height_clamp.set_editor_property('min_default', 0.0)
height_clamp.set_editor_property('max_default', 1.0)
amplitude = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionMultiply, 230, 490)
height_weighted = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionMultiply, 440, 590)
wind_direction = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionConstant3Vector, 440, 790)
wind_direction.set_editor_property('constant', unreal.LinearColor(1.0, .35, 0.0, 1.0))
wind_offset = unreal.MaterialEditingLibrary.create_material_expression(
    material, unreal.MaterialExpressionMultiply, 660, 620)
for start, target, pin in (
        (wind_time, phase, 'A'), (wind_speed, phase, 'B'),
        (phase, wave, ''), (world_position, height_delta, 'A'),
        (object_position, height_delta, 'B'), (height_delta, height_z, ''),
        (height_z, height_scale, 'A'), (height_scale, height_clamp, ''),
        (wave, amplitude, 'A'), (wind_intensity, amplitude, 'B'),
        (amplitude, height_weighted, 'A'),
        (height_clamp, height_weighted, 'B'),
        (height_weighted, wind_offset, 'A'),
        (wind_direction, wind_offset, 'B')):
    if not unreal.MaterialEditingLibrary.connect_material_expressions(start, '', target, pin):
        raise RuntimeError('Could not connect fern wind graph: ' + str(start) + ' -> ' + str(target))

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
if not unreal.MaterialEditingLibrary.connect_material_property(
        wind_offset, '', unreal.MaterialProperty.MP_WORLD_POSITION_OFFSET):
    raise RuntimeError('Could not connect Reweave wind displacement')

unreal.MaterialEditingLibrary.recompile_material(material)
if not unreal.EditorAssetLibrary.save_loaded_asset(material):
    raise RuntimeError('Could not save Reweave material')
if not material.get_editor_property('used_with_instanced_static_meshes'):
    raise RuntimeError('Reweave material lost instanced mesh usage')
unreal.log('ASHBOUND_GROVE_MATERIAL_READY ' + PATH)
