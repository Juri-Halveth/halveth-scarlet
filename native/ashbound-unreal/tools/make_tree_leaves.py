"""Restore the cutout leaves of the imported CC0 small broadleaf tree."""
import unreal

root = '/Game/ASHBOUND'
texture_path = root + '/Models/tree_small_02/tree_small_02_1k/Textures/tree_small_02_leaves_diff-tree_small_02_leaves_alpha'
mesh_path = root + '/Models/tree_small_02/tree_small_02_1k/StaticMeshes/tree_small_02_1k'
material_path = root + '/Materials/M_TreeSmallLeaves'
texture = unreal.load_asset(texture_path)
mesh = unreal.load_asset(mesh_path)
if not isinstance(texture, unreal.Texture2D) or not isinstance(mesh, unreal.StaticMesh):
    raise RuntimeError('Small-tree leaf source is missing')

tools = unreal.AssetToolsHelpers.get_asset_tools()
material = (unreal.load_asset(material_path)
            if unreal.EditorAssetLibrary.does_asset_exist(material_path)
            else tools.create_asset('M_TreeSmallLeaves', root + '/Materials',
                                    unreal.Material, unreal.MaterialFactoryNew()))
if not isinstance(material, unreal.Material):
    raise RuntimeError('Could not create small-tree foliage material')
material.set_editor_property('blend_mode', unreal.BlendMode.BLEND_MASKED)
material.set_editor_property('two_sided', True)
material.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_TWO_SIDED_FOLIAGE)
material.set_editor_property('used_with_instanced_static_meshes', True)
material.set_editor_property('opacity_mask_clip_value', 0.005)
editor = unreal.MaterialEditingLibrary
editor.delete_all_material_expressions(material)

albedo = editor.create_material_expression(material, unreal.MaterialExpressionTextureSample, -600, -120)
albedo.set_editor_property('texture', texture)
if not editor.connect_material_property(albedo, 'RGB', unreal.MaterialProperty.MP_BASE_COLOR):
    raise RuntimeError('Could not connect tree leaf colour')

# The glTF names an alpha channel, but its source file is a JPEG. Its black
# card background is encoded in RGB; use luminance to cut those pixels out.
luma = editor.create_material_expression(material, unreal.MaterialExpressionDotProduct, -240, 80)
weights = editor.create_material_expression(material, unreal.MaterialExpressionConstant3Vector, -500, 140)
weights.set_editor_property('constant', unreal.LinearColor(0.299, 0.587, 0.114, 1.0))
if not editor.connect_material_expressions(albedo, 'RGB', luma, 'A'):
    raise RuntimeError('Could not connect leaf mask source')
if not editor.connect_material_expressions(weights, '', luma, 'B'):
    raise RuntimeError('Could not connect leaf mask weights')
if not editor.connect_material_property(luma, '', unreal.MaterialProperty.MP_OPACITY_MASK):
    raise RuntimeError('Could not connect tree leaf cutout')

roughness = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -230, 250)
roughness.set_editor_property('r', 0.83)
subsurface = editor.create_material_expression(material, unreal.MaterialExpressionConstant3Vector, -230, 370)
subsurface.set_editor_property('constant', unreal.LinearColor(0.17, 0.32, 0.11, 1.0))
if not editor.connect_material_property(roughness, '', unreal.MaterialProperty.MP_ROUGHNESS):
    raise RuntimeError('Could not connect leaf roughness')
if not editor.connect_material_property(subsurface, '', unreal.MaterialProperty.MP_SUBSURFACE_COLOR):
    raise RuntimeError('Could not connect leaf subsurface colour')
editor.recompile_material(material)
if not unreal.EditorAssetLibrary.save_loaded_asset(material):
    raise RuntimeError('Could not save tree leaf material')

slots = mesh.get_editor_property('static_materials')
leaf_slots = [index for index, slot in enumerate(slots)
              if 'leaves' in slot.get_editor_property('material_interface').get_name().lower()]
if len(leaf_slots) != 1:
    raise RuntimeError('Expected exactly one small-tree leaf material slot: ' + str(leaf_slots))
mesh.set_material(leaf_slots[0], material)
if not unreal.EditorAssetLibrary.save_loaded_asset(mesh):
    raise RuntimeError('Could not save small-tree leaf slot')
unreal.log('ASHBOUND_TREE_LEAVES_AUTHORED slot=' + str(leaf_slots[0]))
