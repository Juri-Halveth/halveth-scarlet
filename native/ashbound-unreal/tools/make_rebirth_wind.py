"""Author local, masked wind materials for Rebirth's instanced ground plants."""
import unreal

ROOT = '/Game/ASHBOUND/Materials'
SPECS = (
    ('M_RebirthFern',
     '/Game/ASHBOUND/Models/fern_02/fern_02_1k/Textures/fern_02_diff-fern_02_alpha',
     unreal.LinearColor(.43, .82, .38, 1.0), 5.0, .019),
    ('M_RebirthGrass',
     '/Game/ASHBOUND/Models/grass_medium_01/grass_medium_01_1k/Textures/grass_medium_01_diff-grass_medium_01_alpha',
     unreal.LinearColor(.86, 1.05, .78, 1.0), 2.5, .035),
)
editor = unreal.MaterialEditingLibrary
tools = unreal.AssetToolsHelpers.get_asset_tools()


def connect(first, second, pin, output=''):
    if not editor.connect_material_expressions(first, output, second, pin):
        raise RuntimeError('Rebirth wind connection failed: ' + str(first) + ' -> ' + str(second))


for name, texture_path, tint_value, amplitude_cm, height_rate in SPECS:
    texture = unreal.load_asset(texture_path)
    if not isinstance(texture, unreal.Texture2D):
        raise RuntimeError('Rebirth wind source texture missing: ' + texture_path)
    path = ROOT + '/' + name
    material = (unreal.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path)
                else tools.create_asset(name, ROOT, unreal.Material, unreal.MaterialFactoryNew()))
    if not isinstance(material, unreal.Material):
        raise RuntimeError('Rebirth wind material missing: ' + path)
    material.set_editor_property('blend_mode', unreal.BlendMode.BLEND_MASKED)
    material.set_editor_property('two_sided', True)
    # Thin grass cards need transmitted light on their backfaces; Default Lit
    # makes the dense understory read as a nearly black mass against the sky.
    material.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_TWO_SIDED_FOLIAGE)
    material.set_editor_property('used_with_instanced_static_meshes', True)
    editor.delete_all_material_expressions(material)

    sample = editor.create_material_expression(material, unreal.MaterialExpressionTextureSample, -800, -300)
    sample.set_editor_property('texture', texture)
    tint = editor.create_material_expression(material, unreal.MaterialExpressionConstant3Vector, -800, -80)
    tint.set_editor_property('constant', tint_value)
    colour = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, -550, -220)
    connect(sample, colour, 'A', 'RGB')
    connect(tint, colour, 'B')
    vigor = editor.create_material_expression(material, unreal.MaterialExpressionPerInstanceCustomData, -600, 80)
    vigor.set_editor_property('data_index', 0)
    vigor.set_editor_property('const_default_value', 1.0)
    vertex_vigor = editor.create_material_expression(material, unreal.MaterialExpressionVertexInterpolator, -360, 30)
    connect(vigor, vertex_vigor, 'VS')
    individual_colour = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, -100, -180)
    connect(colour, individual_colour, 'A')
    connect(vertex_vigor, individual_colour, 'B')
    subsurface = editor.create_material_expression(material, unreal.MaterialExpressionConstant3Vector, 20, -40)
    subsurface.set_editor_property('constant', unreal.LinearColor(.22, .52, .14, 1.0))
    roughness = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -500, 30)
    roughness.set_editor_property('r', .86)
    # HISM cells fade their masked foliage before the end-cull distance.
    # Without this, whole instance clusters visibly pop out at the boundary.
    fade = editor.create_material_expression(
        material, unreal.MaterialExpressionPerInstanceFadeAmount, -560, 150)
    faded_alpha = editor.create_material_expression(
        material, unreal.MaterialExpressionMultiply, -290, 150)
    connect(sample, faded_alpha, 'A', 'A')
    connect(fade, faded_alpha, 'B')

    clock = editor.create_material_expression(material, unreal.MaterialExpressionTime, -800, 290)
    speed = editor.create_material_expression(material, unreal.MaterialExpressionConstant, -800, 390)
    speed.set_editor_property('r', 1.15)
    elapsed = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, -560, 340)
    connect(clock, elapsed, 'A')
    connect(speed, elapsed, 'B')
    instance_phase = editor.create_material_expression(material, unreal.MaterialExpressionPerInstanceCustomData, -550, 520)
    instance_phase.set_editor_property('data_index', 1)
    instance_phase.set_editor_property('const_default_value', 0.0)
    phase = editor.create_material_expression(material, unreal.MaterialExpressionAdd, -320, 410)
    connect(elapsed, phase, 'A')
    connect(instance_phase, phase, 'B')
    wave = editor.create_material_expression(material, unreal.MaterialExpressionSine, -100, 410)
    connect(phase, wave, '')
    reach = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, 130, 410)
    reach.set_editor_property('const_b', amplitude_cm)
    connect(wave, reach, 'A')

    world = editor.create_material_expression(material, unreal.MaterialExpressionWorldPosition, -800, 770)
    origin = editor.create_material_expression(material, unreal.MaterialExpressionObjectPositionWS, -800, 880)
    delta = editor.create_material_expression(material, unreal.MaterialExpressionSubtract, -550, 800)
    connect(world, delta, 'A')
    connect(origin, delta, 'B')
    vertical = editor.create_material_expression(material, unreal.MaterialExpressionComponentMask, -330, 800)
    vertical.set_editor_property('r', False)
    vertical.set_editor_property('g', False)
    vertical.set_editor_property('b', True)
    connect(delta, vertical, '')
    height = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, -110, 780)
    height.set_editor_property('const_b', height_rate)
    connect(vertical, height, 'A')
    weight = editor.create_material_expression(material, unreal.MaterialExpressionClamp, 90, 780)
    weight.set_editor_property('min_default', 0.0)
    weight.set_editor_property('max_default', 1.0)
    connect(height, weight, '')
    bend = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, 350, 550)
    connect(reach, bend, 'A')
    connect(weight, bend, 'B')
    vigor_bend = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, 500, 510)
    connect(bend, vigor_bend, 'A')
    connect(vigor, vigor_bend, 'B')
    direction = editor.create_material_expression(material, unreal.MaterialExpressionConstant3Vector, 350, 720)
    direction.set_editor_property('constant', unreal.LinearColor(1.0, .28, 0.0, 1.0))
    offset = editor.create_material_expression(material, unreal.MaterialExpressionMultiply, 560, 600)
    connect(vigor_bend, offset, 'A')
    connect(direction, offset, 'B')

    for expression, output, target in (
        (individual_colour, '', unreal.MaterialProperty.MP_BASE_COLOR),
        (subsurface, '', unreal.MaterialProperty.MP_SUBSURFACE_COLOR),
        (faded_alpha, '', unreal.MaterialProperty.MP_OPACITY_MASK),
        (roughness, '', unreal.MaterialProperty.MP_ROUGHNESS),
        (offset, '', unreal.MaterialProperty.MP_WORLD_POSITION_OFFSET),
    ):
        if not editor.connect_material_property(expression, output, target):
            raise RuntimeError('Rebirth wind property failed: ' + str(target))
    editor.recompile_material(material)
    if not unreal.EditorAssetLibrary.save_loaded_asset(material):
        raise RuntimeError('Rebirth wind save failed: ' + path)
    unreal.log('ASHBOUND_REBIRTH_WIND_AUTHORED ' + path)
