"""Build the teaching car in Blender and export it as public/car.glb.

Run with Blender's Python (either the `bpy` wheel or a Blender install):

    python3 model/build_car.py            # with `pip install bpy`
    blender -b -P model/build_car.py      # with a Blender install

Conventions that the web app relies on
--------------------------------------
* Every clickable component is an Empty named with its component id (see
  src/data/components.js). Its mesh children carry the actual geometry.
  A child's material named "main" is recoloured with the component colour at
  run time; any other material keeps the colour set here (used for terminals,
  connectors, heatsinks and so on).
* Component Empties sit at the positions in src/scene/layout.js. The web app
  positions them from that file too, so the two must agree.
* Body parts (not clickable) are children of the Empty "body". Each carries a
  custom property `opacity` and optionally `kind` ("wheel" fades more when a
  system is isolated). Custom properties export as glTF extras.
* Coordinates: the web scene is x nose(-) to tail(+), y up, z across. Blender
  is z up, so scene (x, y, z) becomes Blender (x, -z, y); the glTF exporter
  converts back to y up on export. Two scene units are about one metre.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GLB = os.path.join(ROOT, 'public', 'car.glb')
BLEND = os.path.join(HERE, 'car.blend')

REAR_AXLE, FRONT_AXLE = 2.5, -1.9

# Must match src/scene/layout.js
POSITIONS = {
    'apps': (-2.25, 0.62, 0.2), 'bspd': (-1.75, 0.34, -0.42), 'vcu': (-1.45, 0.42, 0.1),
    'cancontroller': (-1.58, 0.56, 0.0), 'cantransceiver': (-1.32, 0.56, 0.24), 'dashboard': (-0.95, 1.12, 0),
    'lv': (-0.2, 0.36, -0.98), 'dcdc': (0.35, 0.34, -0.98), 'can': (-0.1, 0.24, 0.66),
    'shutdown': (0.45, 1.5, 0.82), 'tsal': (0.45, 2.22, 0), 'imd': (0.6, 1.18, -0.36),
    'cooling': (0.1, 0.62, 1.02), 'sensors': (0.62, 0.9, 1.02), 'accumulator': (0.98, 0.56, 0),
    'cell': (0.72, 0.95, 0.44), 'cellmonitor': (0.98, 0.93, -0.11), 'bms': (1.24, 0.97, 0.4),
    'hvfuse': (1.56, 0.8, 0.3), 'air': (1.86, 0.8, 0.3), 'precharge': (1.71, 1.08, 0.3),
    'packcurrent': (1.56, 0.32, -0.3), 'contactorCoil': (1.86, 0.32, -0.3),
    'dcLink': (2.12, 1.14, 0.0), 'inverter': (2.42, 1.14, 0), 'gateDriver': (2.42, 1.34, 0.0),
    'motor': (2.35, 0.52, -0.1), 'resolver': (2.35, 0.52, -0.56),
}

# ---------------------------------------------------------------- helpers

def B(x, y, z):
    """scene (x, y-up, z) -> Blender (x, -z, z-up)"""
    return Vector((x, -z, y))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


_mats = {}

def material(name, color, metal=0.25, rough=0.55, alpha=1.0):
    key = (name, color, metal, rough, alpha)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    bsdf = m.node_tree.nodes['Principled BSDF']
    r, g, b = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    bsdf.inputs['Base Color'].default_value = (r, g, b, 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        m.surface_render_method = 'BLENDED'
    _mats[key] = m
    return m


MAIN = None  # created after reset(); see main()


def main_mat():
    return material('main', '#888888')


def empty(name, pos=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None)
    e.location = B(*pos)
    e.parent = parent
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(obj, name, parent, mat, pos, rot=(0, 0, 0), bevel=None, smooth=False, props=None):
    """rot is (about scene x, about scene y, about scene z) in radians, applied in that order."""
    mat = mat or main_mat()
    obj.name = name
    obj.data.name = name
    # convert rotation axes: scene x -> blender x, scene y (up) -> blender z, scene z -> blender -y
    rx, ry, rz = rot
    obj.rotation_euler = (rx, -rz, ry)
    obj.location = B(*pos)
    if bevel:
        m = obj.modifiers.new('bevel', 'BEVEL')
        m.width, m.segments = bevel, 3
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    obj.data.materials.append(mat)
    obj.parent = parent
    if props:
        for k, v in props.items():
            obj[k] = v
    # bake rotation into the mesh so the exported node only carries a translation
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return obj


def box(name, parent, size, pos=(0, 0, 0), mat=None, rot=(0, 0, 0), bevel=0.012, props=None):
    sx, sy, sz = size
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = (sx, sz, sy)
    return finish(o, name, parent, mat, pos, rot, bevel=bevel, props=props)


def cyl(name, parent, rad, h, pos=(0, 0, 0), mat=None, axis='y', seg=32, bevel=0.008, props=None, rad2=None):
    # Blender cylinders point along local z. axis says which scene axis the cylinder runs along.
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=rad, radius2=rad if rad2 is None else rad2, depth=h)
    o = bpy.context.active_object
    rot = {'y': (0, 0, 0), 'x': (0, 0, math.pi / 2), 'z': (math.pi / 2, 0, 0)}[axis]
    # cone's axis is blender z == scene y already, so the mapping above is in scene axes
    return finish(o, name, parent, mat, pos, rot, bevel=bevel, smooth=True, props=props)


def torus(name, parent, R, r, pos=(0, 0, 0), mat=None, axis='x', props=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=32, minor_segments=14)
    o = bpy.context.active_object
    rot = {'y': (0, 0, 0), 'x': (0, 0, math.pi / 2), 'z': (math.pi / 2, 0, 0)}[axis]
    return finish(o, name, parent, mat, pos, rot, smooth=True, props=props)


def sphere(name, parent, r, pos=(0, 0, 0), mat=None, props=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=24, ring_count=16)
    o = bpy.context.active_object
    return finish(o, name, parent, mat, pos, smooth=True, props=props)


def tube(name, parent, a, b, rad=0.026, mat=None, props=None):
    """A straight structural tube from scene point a to scene point b."""
    va, vb = B(*a), B(*b)
    d = vb - va
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=rad, depth=d.length)
    o = bpy.context.active_object
    o.location = (va + vb) / 2
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    o.name = name
    o.data.name = name
    o.data.materials.append(mat or main_mat())
    o.parent = parent
    if props:
        for k, v in props.items():
            o[k] = v
    for p in o.data.polygons:
        p.use_smooth = True
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


def wing_profile(name, parent, chord, span, thick, pos, mat, angle=-0.18, props=None):
    """A cambered plate: a flattened cylinder rotated to the span, then tilted."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.5, depth=span)
    o = bpy.context.active_object
    o.scale = (chord, thick, 1)
    return finish(o, name, parent, mat, pos, rot=(0, 0, 0), smooth=True, props=props) if False else _wing_finish(o, name, parent, mat, pos, angle, props)


def _wing_finish(o, name, parent, mat, pos, angle, props):
    # cylinder axis (blender z) must run across the car (scene z == blender -y)
    o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.rotation_euler = (0, 0, 0)
    return finish(o, name, parent, mat, pos, rot=(0, 0, angle), smooth=True, props=props)


# ---------------------------------------------------------------- body

def build_body():
    body = empty('body')
    ghost = lambda o: {'opacity': o}
    carbon = material('carbon', '#9db7d1', 0.1, 0.9)
    steel = material('steel', '#7d93aa', 0.4, 0.5)
    rubber = material('rubber', '#141b24', 0.0, 0.95)
    rim = material('rim', '#8793a0', 0.7, 0.4)
    R, F = REAR_AXLE, FRONT_AXLE

    # floor, bays, nose, sidepods
    box('floor', body, (5.4, 0.04, 1.3), (0.15, 0.12, 0), carbon, props=ghost(0.2))
    box('frontBay', body, (1.55, 0.6, 0.72), (-1.72, 0.45, 0), carbon, bevel=0.05, props={'opacity': 0.1, 'edges': 1})
    box('tub', body, (1.4, 0.64, 1.26), (-0.25, 0.47, 0), carbon, bevel=0.08, props={'opacity': 0.08, 'edges': 1})
    cyl('nose', body, 0.42, 1.0, (-3.0, 0.42, 0), carbon, axis='x', seg=24, rad2=0.08, bevel=0, props=ghost(0.14))
    box('sidepodL', body, (1.5, 0.52, 0.4), (0.1, 0.42, 1.02), carbon, bevel=0.09, props=ghost(0.06))
    box('sidepodR', body, (1.5, 0.52, 0.4), (0.1, 0.42, -1.02), carbon, bevel=0.09, props=ghost(0.06))
    # seat and driver
    box('seat', body, (0.06, 0.9, 0.7), (0.3, 0.9, 0), carbon, rot=(0, 0, 0.22), bevel=0.02, props=ghost(0.1))
    sphere('helmet', body, 0.23, (0.08, 1.52, 0), carbon, props=ghost(0.16))
    box('torso', body, (0.3, 0.6, 0.5), (0.02, 1.0, 0), carbon, rot=(0, 0, 0.22), bevel=0.08, props=ghost(0.07))
    # wings
    wing_profile('frontWing', body, 0.6, 2.7, 0.05, (-3.35, 0.2, 0), carbon, angle=-0.12, props=ghost(0.26))
    box('frontPlateL', body, (0.6, 0.3, 0.02), (-3.35, 0.32, 1.35), carbon, bevel=0.005, props=ghost(0.2))
    box('frontPlateR', body, (0.6, 0.3, 0.02), (-3.35, 0.32, -1.35), carbon, bevel=0.005, props=ghost(0.2))
    wing_profile('rearWingUpper', body, 0.6, 2.0, 0.05, (R + 0.75, 1.55, 0), carbon, angle=-0.3, props=ghost(0.26))
    wing_profile('rearWingLower', body, 0.4, 2.0, 0.04, (R + 0.85, 1.35, 0), carbon, angle=-0.2, props=ghost(0.2))
    box('rearPlateL', body, (0.7, 0.66, 0.02), (R + 0.75, 1.3, 1.0), carbon, bevel=0.005, props=ghost(0.18))
    box('rearPlateR', body, (0.7, 0.66, 0.02), (R + 0.75, 1.3, -1.0), carbon, bevel=0.005, props=ghost(0.18))
    tube('wingStrutL', body, (R + 0.4, 0.5, -0.3), (R + 0.75, 1.35, -0.3), 0.026, steel, props=ghost(0.5))
    tube('wingStrutR', body, (R + 0.4, 0.5, 0.3), (R + 0.75, 1.35, 0.3), 0.026, steel, props=ghost(0.5))

    # space frame: main hoop, front hoop, rear bay
    def hoop(x, top, half, tag):
        pts = [(x, 0.14, -half), (x, top * 0.72, -half), (x, top, -half * 0.55), (x, top, half * 0.55), (x, top * 0.72, half), (x, 0.14, half)]
        for i in range(len(pts) - 1):
            tube(f'{tag}{i}', body, pts[i], pts[i + 1], 0.028, steel, props=ghost(0.5))
    hoop(0.45, 2.05, 0.82, 'mainHoop')
    hoop(-0.95, 1.22, 0.62, 'frontHoop')
    frame = [
        ((0.45, 1.45, -0.82), (R + 0.4, 0.5, -0.5)), ((0.45, 1.45, 0.82), (R + 0.4, 0.5, 0.5)),
        ((R + 0.4, 0.14, -0.5), (R + 0.4, 0.5, -0.5)), ((R + 0.4, 0.14, 0.5), (R + 0.4, 0.5, 0.5)), ((R + 0.4, 0.5, -0.5), (R + 0.4, 0.5, 0.5)),
        ((0.45, 0.14, -0.82), (R + 0.4, 0.14, -0.5)), ((0.45, 0.14, 0.82), (R + 0.4, 0.14, 0.5)),
        ((-0.95, 0.14, -0.62), (0.45, 0.14, -0.82)), ((-0.95, 0.14, 0.62), (0.45, 0.14, 0.82)),
        ((-0.95, 1.22 * 0.72, -0.62), (0.45, 1.45, -0.82)), ((-0.95, 1.22 * 0.72, 0.62), (0.45, 1.45, 0.82)),
        ((-0.95, 0.14, -0.62), (-2.5, 0.14, -0.36)), ((-0.95, 0.14, 0.62), (-2.5, 0.14, 0.36)),
        ((-0.95, 0.88, -0.62), (-2.5, 0.7, -0.36)), ((-0.95, 0.88, 0.62), (-2.5, 0.7, 0.36)),
        ((-2.5, 0.14, -0.36), (-2.5, 0.7, -0.36)), ((-2.5, 0.14, 0.36), (-2.5, 0.7, 0.36)), ((-2.5, 0.7, -0.36), (-2.5, 0.7, 0.36)),
    ]
    for i, (a, b) in enumerate(frame):
        tube(f'frame{i}', body, a, b, 0.026, steel, props=ghost(0.5))

    # suspension wishbones and pushrods (simplified)
    for x, tag in ((F, 'f'), (R, 'r')):
        bx = -2.5 if x < 0 else R + 0.4
        for side in (1, -1):
            s = 'L' if side > 0 else 'R'
            for j, (y_in, y_out) in enumerate(((0.14, 0.3), (0.7 if x < 0 else 0.5, 0.62))):
                tube(f'{tag}Wish{s}{j}a', body, (x - 0.25, y_in, 0.36 * side if x < 0 else 0.5 * side), (x, y_out, 0.95 * side), 0.014, steel, props=ghost(0.5))
                tube(f'{tag}Wish{s}{j}b', body, (x + 0.25, y_in, 0.36 * side if x < 0 else 0.5 * side), (x, y_out, 0.95 * side), 0.014, steel, props=ghost(0.5))
            tube(f'{tag}Upright{s}', body, (x, 0.3, 0.95 * side), (x, 0.62, 0.95 * side), 0.03, steel, props=ghost(0.5))

    # wheels
    for x in (F, R):
        for z in (1.2, -1.2):
            tag = f'wheel{"F" if x < 0 else "R"}{"L" if z > 0 else "R"}'
            t = cyl(tag + 'Tyre', body, 0.46, 0.36, (x, 0.46, z), rubber, axis='z', seg=40, bevel=0.06, props={'opacity': 0.92, 'kind': 'wheel'})
            cyl(tag + 'Rim', body, 0.26, 0.37, (x, 0.46, z), rim, axis='z', seg=24, bevel=0.02, props={'opacity': 0.92, 'kind': 'wheel'})
            for k in range(5):
                a = k * 2 * math.pi / 5
                box(tag + f'Spoke{k}', body, (0.04, 0.22, 0.03), (x + 0.12 * math.cos(a), 0.46 + 0.12 * math.sin(a), z), rim, rot=(0, 0, a), bevel=0.005,
                    props={'opacity': 0.92, 'kind': 'wheel'})
    # driveline
    tube('chain', body, (2.35, 0.52, 0.23), (R, 0.46, 0.23), 0.02, steel, props=ghost(0.5))
    tube('halfShaft', body, (R, 0.46, -1.02), (R, 0.46, 1.02), 0.035, steel, props=ghost(0.5))
    cyl('diff', body, 0.16, 0.22, (R, 0.46, 0.1), steel, axis='z', seg=20, props=ghost(0.5))
    return body


# ---------------------------------------------------------------- components

def build_components():
    silver = material('silver', '#d9dde2', 0.8, 0.3)
    dark = material('dark', '#1c2a33', 0.2, 0.6)
    slate = material('slate', '#2a3642', 0.2, 0.6)
    navy = material('navy', '#33414f', 0.2, 0.6)
    teal = material('teal', '#22313d', 0.2, 0.6)
    copper = material('copper', '#c98a3b', 0.6, 0.4)
    cream = material('cream', '#e9e3d2', 0.1, 0.6)
    yellow = material('yellow', '#e9d35a', 0.1, 0.5)
    amber = material('amber', '#e7c53f', 0.1, 0.5)
    purple = material('purple', '#5c4a8f', 0.3, 0.5)
    cyan = material('cyan', '#3c8997', 0.3, 0.5)
    aqua = material('aqua', '#2f7f86', 0.3, 0.5)
    grey = material('grey', '#8b98a6', 0.7, 0.4)
    chrome = material('chrome', '#c9ced4', 0.9, 0.25)
    gunmetal = material('gunmetal', '#7b8691', 0.8, 0.35)
    glass = material('packGlass', '#6b5a45', 0.1, 0.3, alpha=0.28)
    P = {k: empty(k, v) for k, v in POSITIONS.items()}

    # --- cell: a 21700 with a positive cap
    cyl('cell_can', P['cell'], 0.045, 0.3, bevel=0.01)
    cyl('cell_cap', P['cell'], 0.025, 0.03, (0, 0.16, 0), silver)
    cyl('cell_ring', P['cell'], 0.047, 0.012, (0, 0.14, 0), cream, bevel=0)

    # --- tractive battery: translucent container with seven modules
    box('accumulator_container', P['accumulator'], (0.84, 0.64, 1.08), mat=glass, bevel=0.03)
    for i, z in enumerate((-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45)):
        box(f'accumulator_module{i}', P['accumulator'], (0.74, 0.56, 0.13), (0, 0.02, z), bevel=0.01)
        box(f'accumulator_busbar{i}', P['accumulator'], (0.6, 0.015, 0.03), (0, 0.31, z), copper, bevel=0.003)
    box('accumulator_lidSeam', P['accumulator'], (0.86, 0.02, 1.1), (0, 0.33, 0), mat=glass, bevel=0.005)

    # --- cell monitor boards, one per module (five shown)
    for i, x in enumerate((-0.32, -0.16, 0, 0.16, 0.32)):
        box(f'cellmonitor_pcb{i}', P['cellmonitor'], (0.12, 0.02, 0.36), (x, 0, -0.22), bevel=0.003)
        box(f'cellmonitor_ic{i}', P['cellmonitor'], (0.05, 0.015, 0.05), (x, 0.017, -0.22), dark, bevel=0.002)
        cyl(f'cellmonitor_xfmr{i}', P['cellmonitor'], 0.02, 0.025, (x, 0.02, -0.06), navy, seg=16)

    # --- BMS master
    box('bms_pcb', P['bms'], (0.3, 0.03, 0.26), bevel=0.004)
    box('bms_mcu', P['bms'], (0.1, 0.03, 0.1), (0, 0.03, 0), dark, bevel=0.003)
    box('bms_conn', P['bms'], (0.04, 0.03, 0.12), (0.12, 0.03, -0.05), navy, bevel=0.003)

    # --- fuse: ceramic body, metal end caps
    cyl('hvfuse_body', P['hvfuse'], 0.045, 0.2, mat=cream, axis='z')
    cyl('hvfuse_capA', P['hvfuse'], 0.05, 0.03, (0, 0, 0.11), axis='z')
    cyl('hvfuse_capB', P['hvfuse'], 0.05, 0.03, (0, 0, -0.11), axis='z')

    # --- isolation relay: sealed contactor can with terminals
    cyl('air_can', P['air'], 0.085, 0.2, bevel=0.015)
    cyl('air_termA', P['air'], 0.022, 0.06, (0.04, 0.13, 0), silver, seg=16)
    cyl('air_termB', P['air'], 0.022, 0.06, (-0.04, 0.13, 0), silver, seg=16)
    box('air_base', P['air'], (0.2, 0.03, 0.2), (0, -0.11, 0), dark, bevel=0.005)

    # --- coil + aux contact: copper coil with a small driver board
    cyl('contactorCoil_coil', P['contactorCoil'], 0.085, 0.2, mat=copper, bevel=0.015)
    cyl('contactorCoil_term', P['contactorCoil'], 0.03, 0.05, (0, 0.12, 0), silver, seg=16)
    box('contactorCoil_board', P['contactorCoil'], (0.12, 0.06, 0.12), (0, -0.13, 0), bevel=0.005)

    # --- precharge: resistor with relay block
    cyl('precharge_resistor', P['precharge'], 0.035, 0.18, axis='z', seg=16)
    box('precharge_relay', P['precharge'], (0.08, 0.06, 0.08), (0, -0.07, 0), navy, bevel=0.005)

    # --- current sensor: ring around the busbar
    torus('packcurrent_ring', P['packcurrent'], 0.07, 0.028, axis='x')

    # --- DC link capacitors
    for i, z in enumerate((-0.22, 0, 0.22)):
        cyl(f'dcLink_cap{i}', P['dcLink'], 0.085, 0.24, (0, 0, z), axis='x', bevel=0.012)
        cyl(f'dcLink_term{i}', P['dcLink'], 0.02, 0.03, (0.13, 0, z), silver, axis='x', seg=12)

    # --- inverter: finned case with phase terminals
    box('inverter_case', P['inverter'], (0.5, 0.26, 0.74), bevel=0.03)
    for i, z in enumerate((-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3)):
        box(f'inverter_fin{i}', P['inverter'], (0.46, 0.06, 0.03), (0, -0.16, z), purple, bevel=0.003)
    for i, z in enumerate((-0.14, 0, 0.14)):
        cyl(f'inverter_phase{i}', P['inverter'], 0.025, 0.06, (0, -0.15, z), silver, seg=16)
    box('inverter_lid', P['inverter'], (0.44, 0.02, 0.68), (0, 0.14, 0), slate, bevel=0.005)

    # --- gate driver board
    box('gateDriver_pcb', P['gateDriver'], (0.4, 0.02, 0.6), bevel=0.003)
    for i, z in enumerate((-0.2, 0, 0.2)):
        box(f'gateDriver_ic{i}', P['gateDriver'], (0.1, 0.03, 0.08), (0, 0.025, z), dark, bevel=0.003)
        box(f'gateDriver_iso{i}', P['gateDriver'], (0.05, 0.02, 0.05), (0.14, 0.02, z), navy, bevel=0.003)

    # --- motor: finned housing, shaft, flange
    cyl('motor_housing', P['motor'], 0.3, 0.42, axis='z', seg=40, bevel=0.03)
    for i in range(10):
        a = i * 2 * math.pi / 10
        box(f'motor_fin{i}', P['motor'], (0.03, 0.05, 0.36), (0.31 * math.cos(a), 0.31 * math.sin(a), 0), gunmetal, rot=(0, 0, a), bevel=0.003)
    cyl('motor_shaft', P['motor'], 0.05, 0.14, (0, 0, 0.27), chrome, axis='z', seg=16)
    cyl('motor_flange', P['motor'], 0.1, 0.03, (0, 0, 0.33), gunmetal, axis='z', seg=24)
    cyl('motor_endcap', P['motor'], 0.2, 0.03, (0, 0, -0.22), gunmetal, axis='z', seg=32)

    # --- resolver
    cyl('resolver_body', P['resolver'], 0.14, 0.07, axis='z', seg=32)
    cyl('resolver_hub', P['resolver'], 0.05, 0.09, mat=slate, axis='z', seg=16)
    box('resolver_conn', P['resolver'], (0.05, 0.04, 0.04), (0.14, 0, 0), dark, bevel=0.003)

    # --- VCU: enclosure with a connector
    box('vcu_case', P['vcu'], (0.38, 0.12, 0.44), bevel=0.02)
    box('vcu_conn', P['vcu'], (0.05, 0.08, 0.3), (0.21, 0, 0), dark, bevel=0.005)
    box('vcu_label', P['vcu'], (0.2, 0.005, 0.12), (0, 0.062, 0.05), silver, bevel=0)

    # --- CAN controller and transceiver chips
    box('cancontroller_ic', P['cancontroller'], (0.1, 0.035, 0.1), bevel=0.004)
    box('cantransceiver_ic', P['cantransceiver'], (0.07, 0.035, 0.05), bevel=0.004)

    # --- APPS: pedal arm with two sensors
    box('apps_arm', P['apps'], (0.03, 0.42, 0.13), (0.02, -0.06, 0), grey, rot=(0, 0, -0.35), bevel=0.005)
    box('apps_pad', P['apps'], (0.04, 0.12, 0.14), (0.1, 0.12, 0), slate, rot=(0, 0, -0.35), bevel=0.01)
    cyl('apps_sensorA', P['apps'], 0.05, 0.05, (0.1, -0.22, 0.1), axis='z', seg=24)
    cyl('apps_sensorB', P['apps'], 0.05, 0.05, (0.1, -0.22, -0.1), axis='z', seg=24)
    cyl('apps_pivot', P['apps'], 0.02, 0.26, (0.1, -0.22, 0), silver, axis='z', seg=12)

    # --- BSPD board
    box('bspd_pcb', P['bspd'], (0.22, 0.025, 0.16), bevel=0.003)
    box('bspd_ic', P['bspd'], (0.06, 0.03, 0.06), (0, 0.03, 0), dark, bevel=0.003)
    cyl('bspd_relay', P['bspd'], 0.025, 0.04, (0.07, 0.03, 0.04), navy, seg=16)

    # --- dashboard: display plus steering wheel
    box('dashboard_display', P['dashboard'], (0.05, 0.22, 0.62), bevel=0.01)
    box('dashboard_screen', P['dashboard'], (0.01, 0.16, 0.5), (0.03, 0, 0), dark, bevel=0)
    torus('dashboard_wheel', P['dashboard'], 0.19, 0.025, (0.2, -0.06, 0), slate, axis='x')
    box('dashboard_hub', P['dashboard'], (0.04, 0.1, 0.3), (0.2, -0.06, 0), slate, bevel=0.01)

    # --- shutdown buttons: two on the main hoop, one in the cockpit
    for i, (p, ax) in enumerate((((0, 0, 0), 'z'), ((0, 0, -1.64), 'z'), ((-1.25, -0.42, -1.2), 'x'))):
        cyl(f'shutdown_base{i}', P['shutdown'], 0.085, 0.06, p, axis=ax, seg=24)
        off = (0.05, 0, 0) if ax == 'x' else (0, 0, 0.05 if i else -0.05)
        cyl(f'shutdown_button{i}', P['shutdown'], 0.05, 0.06, tuple(p[k] + off[k] for k in range(3)), amber, axis=ax, seg=24, bevel=0.015)

    # --- IMD: yellow Bender-style box
    box('imd_case', P['imd'], (0.06, 0.26, 0.34), mat=yellow, bevel=0.01)
    box('imd_label', P['imd'], (0.02, 0.1, 0.16), (0.04, 0, 0), bevel=0.003)
    box('imd_conn', P['imd'], (0.03, 0.05, 0.12), (0.03, -0.09, 0), dark, bevel=0.003)

    # --- roll-hoop lights: status indicator (green/red pair) and two amber ready-to-move lamps
    cyl('tsal_mast', P['tsal'], 0.02, 0.26, (0, -0.1, 0), slate, seg=12)
    cyl('tsal_statusGreen', P['tsal'], 0.045, 0.08, (0, 0.02, 0.08), seg=20, bevel=0.015)
    cyl('tsal_statusRed', P['tsal'], 0.045, 0.08, (0, 0.02, -0.08), material('red', '#d43d3d', 0.1, 0.4), seg=20, bevel=0.015)
    cyl('tsal_readyFwd', P['tsal'], 0.035, 0.05, (-0.06, -0.08, 0), amber, axis='x', seg=20, bevel=0.01)
    cyl('tsal_readyAft', P['tsal'], 0.035, 0.05, (0.06, -0.08, 0), amber, axis='x', seg=20, bevel=0.01)

    # --- LV battery with fuse block
    box('lv_battery', P['lv'], (0.42, 0.26, 0.22), bevel=0.015)
    box('lv_fusebox', P['lv'], (0.3, 0.05, 0.14), (0, 0.16, 0), teal, bevel=0.005)
    cyl('lv_termA', P['lv'], 0.02, 0.04, (0.14, 0.15, 0), silver, seg=12)
    cyl('lv_termB', P['lv'], 0.02, 0.04, (-0.14, 0.15, 0), silver, seg=12)

    # --- DC/DC converter with heatsink fins
    box('dcdc_case', P['dcdc'], (0.36, 0.18, 0.2), bevel=0.012)
    for i, x in enumerate((-0.12, -0.04, 0.04, 0.12)):
        box(f'dcdc_fin{i}', P['dcdc'], (0.02, 0.06, 0.2), (x, 0.12, 0), cyan, bevel=0.002)

    # --- CAN node (transceiver module on the trunk)
    box('can_module', P['can'], (0.16, 0.07, 0.1), bevel=0.008)
    box('can_conn', P['can'], (0.1, 0.03, 0.06), (0, 0.05, 0), dark, bevel=0.003)

    # --- cooling: radiator core, pump
    box('cooling_core', P['cooling'], (0.7, 0.5, 0.07), rot=(0, 0.25, 0), bevel=0.01)
    for i in range(7):
        box(f'cooling_tube{i}', P['cooling'], (0.68, 0.015, 0.09), (0, -0.21 + i * 0.07, 0), aqua, rot=(0, 0.25, 0), bevel=0.002)
    cyl('cooling_pump', P['cooling'], 0.07, 0.16, (0.55, -0.32, 0), aqua, axis='x', seg=24, bevel=0.012)
    cyl('cooling_pumpInlet', P['cooling'], 0.03, 0.08, (0.55, -0.24, 0), slate, seg=12)

    # --- sensors: a thermistor probe with a housing
    cyl('sensors_probe', P['sensors'], 0.035, 0.12, bevel=0.006)
    box('sensors_housing', P['sensors'], (0.06, 0.05, 0.06), (0, 0.08, 0), teal, bevel=0.005)
    cyl('sensors_lead', P['sensors'], 0.008, 0.1, (0, 0.14, 0), slate, seg=8, bevel=0)
    return P


def export():
    os.makedirs(os.path.dirname(GLB), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=GLB, export_format='GLB', export_yup=True, export_apply=True,
        export_extras=True, export_materials='EXPORT', export_cameras=False, export_lights=False,
        export_texcoords=False, export_normals=True, export_animations=False,
    )
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, compress=True)
    print('wrote', GLB, os.path.getsize(GLB) // 1024, 'KB and', BLEND, os.path.getsize(BLEND) // 1024, 'KB')


if __name__ == '__main__':
    reset()
    build_body()
    build_components()
    export()
