"""Render a bright transparent Shiba shop thumbnail from the licensed FBX."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools" / "imports" / "shiba" / "source" / "unpacked" / "1.FBX"
OUTPUT = ROOT / "models" / "thumbs" / "shiba-0.png"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(SOURCE))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
texture = bpy.data.images.load(str(SOURCE.parent / "default_Base_Color.png"))
for obj in meshes:
    for slot in obj.material_slots:
        material = slot.material
        if not material:
            continue
        material.use_nodes = True
        nodes = material.node_tree.nodes
        shader = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        if shader:
            tex = nodes.new("ShaderNodeTexImage")
            tex.image = texture
            material.node_tree.links.new(tex.outputs["Color"], shader.inputs["Base Color"])
            material.node_tree.links.new(tex.outputs["Alpha"], shader.inputs["Alpha"])
for obj in meshes:
    obj.scale = tuple(v * 100 for v in obj.scale)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
center = (lo + hi) / 2
root = bpy.data.objects.new("Shiba thumbnail root", None)
bpy.context.scene.collection.objects.link(root)
for obj in meshes:
    obj.parent = root
root.location = -center
root.rotation_euler[2] = -0.34

def point_camera(camera, target):
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()

camera_data = bpy.data.cameras.new("Camera")
camera = bpy.data.objects.new("Camera", camera_data)
bpy.context.scene.collection.objects.link(camera)
camera.location = (3.25, -6.8, 2.2)
point_camera(camera, Vector((0, 0, -0.05)))
camera_data.type = "ORTHO"
camera_data.ortho_scale = 3.25
bpy.context.scene.camera = camera

for name, location, energy, size, color in [
    ("Key", (-3.5, -4.5, 6), 1050, 4.2, (1.0, 0.84, 0.72)),
    ("Fill", (4.5, -2.5, 3.5), 850, 4.0, (0.72, 0.84, 1.0)),
    ("Rim", (1.5, 4.0, 5.0), 900, 3.0, (1.0, 0.78, 0.58)),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    light.location = location
    point_camera(light, Vector((0, 0, 0)))
    bpy.context.scene.collection.objects.link(light)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.render.filepath = str(OUTPUT)
scene.world = bpy.data.worlds.new("Thumbnail world")
scene.world.color = (0.12, 0.12, 0.12)
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.7
bpy.ops.render.render(write_still=True)
print(f"RENDERED: {OUTPUT.name}")
