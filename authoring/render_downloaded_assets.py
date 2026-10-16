"""Render lightweight game art from the locally downloaded CC assets.

The large source archives stay outside the shipped game. The generated transparent
PNGs are the tablet-friendly derivatives used by the reward activity and previews.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
IMPORTS = ROOT / "tools" / "imports"
OUT = ROOT / "models" / "party-fruit"
OUT.mkdir(parents=True, exist_ok=True)

FRUITS = {
    "apple": "apple03_lr",
    "banana": "banana07_lr",
    "pear": "pear01_lr",
    "orange": "72_orange",
    "lemon": "11_lemon",
    "pineapple": "64_pineapple",
    "mango": "01_mango",
    "strawberry": "73_strawberry",
    "pomegranate": "24_pomegranate",
    "peach": "71_peach",
}


def clean():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def studio(resolution=384):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Studio world")
    scene.world.color = (0.15, 0.17, 0.2)
    for name, location, energy, size, color in [
        ("Key", (-4, -5, 7), 900, 5, (1.0, .82, .68)),
        ("Fill", (5, -2, 3), 620, 4, (.58, .77, 1.0)),
        ("Rim", (0, 4, 6), 1050, 3, (.82, .92, 1.0)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = color
        aim(light, (0, 0, .5))
    bpy.ops.object.camera_add(location=(3.8, -6.8, 3.1))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera


def world_bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return lo, hi


def textured_material(material, albedo_path, normal_path=None):
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Roughness"].default_value = .55
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    albedo = nodes.new("ShaderNodeTexImage")
    albedo.image = bpy.data.images.load(str(albedo_path), check_existing=True)
    links.new(albedo.outputs["Color"], shader.inputs["Base Color"])
    if normal_path and normal_path.exists():
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = bpy.data.images.load(str(normal_path), check_existing=True)
        texture.image.colorspace_settings.name = "Non-Color"
        normal = nodes.new("ShaderNodeNormalMap")
        normal.inputs["Strength"].default_value = .55
        links.new(texture.outputs["Color"], normal.inputs["Color"])
        links.new(normal.outputs["Normal"], shader.inputs["Normal"])


def frame(objects, camera, margin=1.32):
    lo, hi = world_bounds(objects)
    center = (lo + hi) / 2
    for obj in objects:
        obj.location -= center
    bpy.context.view_layer.update()
    lo, hi = world_bounds(objects)
    span = hi - lo
    camera.data.ortho_scale = max(span.x, span.y, span.z) * margin
    aim(camera, (0, 0, 0))


def render_fruits():
    clean()
    source = IMPORTS / "fruits" / "source" / "unpacked" / "veggies" / "veggies.fbx"
    bpy.ops.import_scene.fbx(filepath=str(source))
    meshes = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
    for obj in meshes.values():
        for slot in obj.material_slots:
            if slot.material:
                base = slot.material.name
                textured_material(
                    slot.material,
                    source.parent / f"{base}_albedo.jpeg",
                    source.parent / f"{base}_normals.jpeg",
                )
    selected = set(FRUITS.values())
    for obj in meshes.values():
        obj.hide_render = obj.name not in selected
    camera = studio()
    for slug, name in FRUITS.items():
        for obj in meshes.values():
            obj.hide_render = obj.name != name
        obj = meshes[name]
        original = obj.location.copy()
        frame([obj], camera, 1.42 if slug in {"banana", "pineapple"} else 1.32)
        obj.rotation_euler[2] = math.radians({"banana": -18, "mango": 12, "lemon": -10}.get(slug, 0))
        bpy.context.view_layer.update()
        bpy.context.scene.render.filepath = str(OUT / f"{slug}.png")
        bpy.ops.render.render(write_still=True)
        obj.rotation_euler.zero()
        obj.location = original
    print(f"Rendered {len(FRUITS)} fruit sprites to {OUT}")


def render_shiba():
    clean()
    source = IMPORTS / "shiba" / "source" / "unpacked" / "1.FBX"
    bpy.ops.import_scene.fbx(filepath=str(source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    texture = source.parent / "default_Base_Color.png"
    for material in {slot.material for obj in meshes for slot in obj.material_slots if slot.material}:
        textured_material(material, texture)
    # The download is authored in centimetres; normalize only the preview scene.
    for obj in meshes:
        obj.scale = tuple(value * 100 for value in obj.scale)
    bpy.context.view_layer.update()
    camera = studio(640)
    frame(meshes, camera, 1.28)
    camera.location = (-5.2, 5.2, 3.0)
    aim(camera, (0, 0, 0))
    bpy.context.scene.render.filepath = str(OUT / "shiba-preview.png")
    bpy.ops.render.render(write_still=True)
    print(f"Rendered Shiba preview to {OUT}")


if __name__ == "__main__":
    mode = sys.argv[-1] if sys.argv[-1] in {"fruit", "shiba", "all"} else "all"
    if mode in {"fruit", "all"}:
        render_fruits()
    if mode in {"shiba", "all"}:
        render_shiba()
