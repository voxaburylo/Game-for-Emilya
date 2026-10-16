import bpy, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "models" / "ui"
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 192
scene.render.resolution_y = 192
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Soft sky")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (.78, .88, .98, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = .7

for loc, power, size in [((5, -6, 9), 900, 5), ((-5, -1, 5), 450, 4)]:
    light = bpy.data.lights.new("Softbox", "AREA")
    light.energy, light.shape, light.size = power, "DISK", size
    obj = bpy.data.objects.new("Softbox", light)
    scene.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 0, 1)) - obj.location).to_track_quat("-Z", "Y").to_euler()

camera_data = bpy.data.cameras.new("Camera")
camera = bpy.data.objects.new("Camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = "ORTHO"

def material(name, color, rough=.72, metal=0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Roughness"].default_value = rough
    bs.inputs["Metallic"].default_value = metal
    return m

def cube(name, loc, scale, mat, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new("Soft edges", "BEVEL")
        mod.width, mod.segments = bevel, 3
    o.data.materials.append(mat)
    return o

def sphere(name, loc, scale, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=loc)
    o = bpy.context.object
    o.name, o.scale = name, scale
    o.data.materials.append(mat)
    return o

def clear_objects():
    for o in list(scene.objects):
        if o.type not in {"CAMERA", "LIGHT"}:
            bpy.data.objects.remove(o, do_unlink=True)

def render(name, scale=5, target=(0, 0, .5)):
    center = Vector(target)
    camera.location = center + Vector((6, -8, 6))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.ortho_scale = scale
    scene.render.filepath = str(OUT / f"{name}.png")
    bpy.ops.render.render(write_still=True)
    clear_objects()

grass = material("Grass", (.24, .56, .18))
earth = material("Earth", (.42, .25, .12))
stone = material("Stone", (.58, .61, .59))
sand = material("Sand", (.78, .62, .35))
brick = material("Brick", (.62, .25, .16))
wood = material("Wood", (.48, .27, .11))
cream = material("Cream", (.92, .78, .55))
coral = material("Coral", (.77, .23, .30))
blue = material("Blue", (.20, .48, .63))

# Faceted in-game currency crystal.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.15, location=(0, 0, 1.25))
gem = bpy.context.object
gem.scale = (.82, .82, 1.22)
gem.data.materials.append(material("Crystal", (.15, .72, .88), .18, .2))
gem.rotation_euler = (.08, .2, -.12)
render("gem", 3.5, (0, 0, 1.2))

# A real floating land piece rather than a map pictogram.
cube("soil", (0, 0, -.1), (1.65, 1.35, .48), earth, .2)
cube("grass", (0, 0, .42), (1.7, 1.4, .12), grass, .14)
for x, y in [(-1.25, -.9), (.8, -1.0), (1.3, .55), (-.8, .9)]:
    sphere("rock", (x, y, -.55), (.35, .28, .4), stone)
render("land", 5.1, (0, 0, 0))

def path_base(kind):
    cube("ground", (0, 0, -.10), (1.9, 1.45, .12), grass, .12)
    if kind == "sand":
        cube("sand path", (0, 0, .06), (1.35, 1.25, .11), sand, .25)
    elif kind == "stone":
        for x in [-.72, 0, .72]:
            for y in [-.72, 0, .72]:
                cube("paver", (x, y, .08), (.31, .31, .10), stone, .10)
    elif kind == "brick":
        for r, y in enumerate([-.78, -.26, .26, .78]):
            for c, x in enumerate([-.9, -.3, .3, .9]):
                cube("brick", (x + (r % 2) * .14, y, .08), (.25, .19, .09), brick, .035)
    elif kind == "wood":
        for y in [-.9, -.45, 0, .45, .9]:
            cube("plank", (0, y, .1), (1.28, .17, .11), wood, .04)
    else:
        for x, y, sx, sy in [(-.55,-.65,.5,.36),(.48,-.1,.55,.42),(-.35,.62,.58,.4)]:
            o = sphere("step", (x, y, .08), (sx, sy, .12), stone)
            o.rotation_euler[2] = x

for kind in ["sand", "stone", "brick", "wood", "stepping"]:
    path_base(kind)
    render("path-" + kind, 5.1, (0, 0, 0))

# Room furniture previews use the same friendly rounded proportions as the game.
cube("seat", (0, 0, .55), (1.35, .55, .28), coral, .18)
cube("back", (0, .48, 1.15), (1.35, .16, .66), coral, .17)
for x in [-1.15, 1.15]:
    cube("arm", (x, 0, .75), (.2, .58, .43), coral, .13)
for x in [-.95, .95]:
    cube("leg", (x, -.34, .2), (.1, .1, .25), wood, .03)
render("furniture-sofa", 4.5, (0, 0, .65))

bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=1.25, depth=.18, location=(0, 0, 1.25))
bpy.context.object.data.materials.append(wood)
for x, y in [(-.8,-.55),(.8,-.55),(-.8,.55),(.8,.55)]:
    cube("leg", (x, y, .62), (.11, .11, .62), cream, .04)
render("furniture-table", 4.2, (0, 0, .7))

cube("rug", (0, 0, .08), (1.6, 1.15, .08), blue, .28)
for y in [-.65, 0, .65]:
    cube("stripe", (0, y, .17), (1.35, .08, .035), cream, .04)
render("furniture-rug", 4.6, (0, 0, 0))

