"""Build a compact, texture-free runtime pack from Kenney Cube Pets (CC0)."""
import bpy
import json
import shutil
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools" / "imports" / "kenney" / "Models" / "GLB format"
PREVIEWS = ROOT / "tools" / "imports" / "kenney" / "Previews"
OUT_JSON = ROOT / "models" / "cube-pets.json"
OUT_BIN = ROOT / "models" / "cube-pets.bin"
THUMBS = ROOT / "models" / "thumbs"

KINDS = [
    "beaver", "bee", "bunny", "cat", "caterpillar", "chick", "cow", "crab",
    "deer", "dog", "elephant", "fish", "fox", "giraffe", "hog", "koala",
    "lion", "monkey", "panda", "parrot", "penguin", "pig", "polar", "tiger",
]


def game_point(point):
    # Blender converts glTF Y-up to Z-up. Kenney animals face Blender -Y;
    # this proper rotation restores Y-up and makes them face game +Z.
    return Vector((point.x, point.z, -point.y))


def image_for(material):
    if not material or not material.use_nodes:
        return None
    for node in material.node_tree.nodes:
        if node.type == "TEX_IMAGE" and node.image:
            return node.image
    return None


def sample(image, uv, fallback):
    if not image:
        return fallback
    pixels = image.pixels
    width, height = image.size
    x = min(width - 1, max(0, int((uv.x % 1) * (width - 1))))
    y = min(height - 1, max(0, int((uv.y % 1) * (height - 1))))
    i = (y * width + x) * 4
    return pixels[i : i + 3]


blob = bytearray()
manifest = {
    "version": 1,
    "meshes": [],
    "materials": {},
    "pivots": {},
}


def pack(values, kind):
    while len(blob) % 4:
        blob.append(0)
    offset = len(blob)
    blob.extend(struct.pack("<" + kind * len(values), *values))
    return {"offset": offset, "count": len(values)}


for kind in KINDS:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / f"animal-{kind}.glb"))
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    points = [game_point(obj.matrix_world @ v.co) for obj in objects for v in obj.data.vertices]
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    height = max(0.001, hi.y - lo.y)
    target_height = 1.48
    scale = target_height / height
    cx = (lo.x + hi.x) / 2
    cz = (lo.z + hi.z) / 2
    positions, normals, colors, indices = [], [], [], []
    for obj in objects:
        mesh = obj.data
        mesh.calc_loop_triangles()
        uv_layer = mesh.uv_layers.active
        normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
        for triangle in mesh.loop_triangles:
            base = len(positions) // 3
            material = (
                obj.material_slots[triangle.material_index].material
                if triangle.material_index < len(obj.material_slots)
                else None
            )
            image = image_for(material)
            fallback = tuple(material.diffuse_color[:3]) if material else (0.8, 0.8, 0.8)
            for loop_index, vertex_index in zip(triangle.loops, triangle.vertices):
                point = game_point(obj.matrix_world @ mesh.vertices[vertex_index].co)
                positions.extend(((point.x - cx) * scale, (point.y - lo.y) * scale, (point.z - cz) * scale))
                normal = normal_matrix @ mesh.loops[loop_index].normal
                normal = Vector((normal.x, normal.z, -normal.y)).normalized()
                normals.extend(normal)
                uv = uv_layer.data[loop_index].uv if uv_layer else Vector((0.5, 0.5))
                colors.extend(sample(image, uv, fallback))
            indices.extend((base, base + 1, base + 2))
    model = f"cube-{kind}"
    material = f"cube-{kind}-paint"
    manifest["materials"][material] = {
        "color": [1, 1, 1],
        "roughness": 0.78,
        "metalness": 0,
        "tint": False,
    }
    manifest["pivots"][model] = {
        "root": [0, 0, 0],
        "body": [0, 0, 0],
        "head": [0, target_height * 0.72, 0.22],
        "tail": [0, target_height * 0.48, -0.34],
        "legL": [-0.18, target_height * 0.28, 0.2],
        "legR": [0.18, target_height * 0.28, 0.2],
        "backL": [-0.18, target_height * 0.28, -0.2],
        "backR": [0.18, target_height * 0.28, -0.2],
    }
    manifest["meshes"].append({
        "model": model,
        "node": "body",
        "variant": "base",
        "material": material,
        "position": pack(positions, "f"),
        "normal": pack(normals, "f"),
        "color": pack(colors, "f"),
        "index": pack(indices, "I"),
    })
    shutil.copyfile(PREVIEWS / f"animal-{kind}.png", THUMBS / f"{model}.png")
    print(f"{model}: {len(indices) // 3} triangles")

OUT_JSON.write_text(json.dumps(manifest, separators=(",", ":")), encoding="utf8")
OUT_BIN.write_bytes(blob)
print(f"CUBE PETS COMPLETE: {len(KINDS)} animals, {len(blob)} runtime bytes")
