"""Append the downloaded CC BY Shiba to the compact character runtime.

The Sketchfab source is a static textured mesh. We split its triangles into the
existing articulated pet nodes and bake its texture to vertex colours, avoiding
a runtime GLTF loader and a 1K texture on low-memory tablets.
"""
import bpy
import json
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools" / "imports" / "shiba" / "source" / "unpacked" / "1.FBX"
TEXTURE = SOURCE.parent / "default_Base_Color.png"
MANIFEST = ROOT / "models" / "characters.json"
BINARY = ROOT / "models" / "characters.bin"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(SOURCE))
objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
for obj in objects:
    obj.scale = tuple(value * 100 for value in obj.scale)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def game_point(point):
    # FBX is Z-up and faces +Y; the game is Y-up and faces +Z.
    return Vector((point.x, point.z, point.y))


points = [game_point(obj.matrix_world @ vertex.co) for obj in objects for vertex in obj.data.vertices]
lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
center_x = (lo.x + hi.x) / 2
center_z = (lo.z + hi.z) / 2


def normalized(point):
    p = game_point(point)
    return Vector((p.x - center_x, p.y - lo.y, p.z - center_z))


height = hi.y - lo.y
length = hi.z - lo.z
width = hi.x - lo.x
PIVOTS = {
    "root": (0, 0, 0),
    "body": (0, 0, 0),
    "head": (0, height * .72, -length * .31),
    "tail": (0, height * .64, length * .34),
    "legL": (-width * .22, height * .42, -length * .24),
    "legR": (width * .22, height * .42, -length * .24),
    "backL": (-width * .24, height * .42, length * .24),
    "backR": (width * .24, height * .42, length * .24),
}


SKIN_BONES = ["body", "head", "tail", "legL", "legR", "backL", "backR"]


def smoothstep(a, b, value):
    t = min(1, max(0, (value - a) / (b - a)))
    return t * t * (3 - 2 * t)


def skin(point, object_name):
    # The source has no armature. Use small, soft regions around the corrected
    # pivots. The collar stays on the body, while the separate eye shells follow
    # the head exactly. Motion amplitudes are intentionally modest in runtime.
    if object_name == "Object001":
        return (1, 0, 0, 0), (1, 0, 0, 0)
    if object_name != "Box002":
        return (0, 0, 0, 0), (1, 0, 0, 0)
    x, y, z = point
    head = smoothstep(height * .62, height * .84, y) * (
        1 - smoothstep(-length * .18, length * .02, z)
    )
    lower = 1 - smoothstep(height * .25, height * .48, y)
    front = lower * (1 - smoothstep(-length * .08, length * .12, z))
    back = lower * smoothstep(length * .02, length * .25, z)
    left = 1 - smoothstep(-width * .08, width * .08, x)
    right = 1 - left
    candidates = [
        (1, head),
        (3, front * left),
        (4, front * right),
        (5, back * left),
        (6, back * right),
    ]
    moving = sum(weight for _, weight in candidates)
    values = [(0, max(.08, 1 - min(.92, moving))), *candidates]
    values = sorted(values, key=lambda value: value[1], reverse=True)[:4]
    total = sum(weight for _, weight in values) or 1
    values += [(0, 0)] * (4 - len(values))
    return tuple(index for index, _ in values), tuple(weight / total for _, weight in values)


image = bpy.data.images.load(str(TEXTURE), check_existing=True)
pixels = list(image.pixels)
iw, ih = image.size


def sample(uv):
    x = min(iw - 1, max(0, int((uv.x % 1) * (iw - 1))))
    y = min(ih - 1, max(0, int((uv.y % 1) * (ih - 1))))
    i = (y * iw + x) * 4
    return pixels[i : i + 3]


runtime = {
    "position": [],
    "normal": [],
    "color": [],
    "skinIndex": [],
    "skinWeight": [],
    "index": [],
}
for obj in objects:
    mesh = obj.data
    mesh.calc_loop_triangles()
    uv_layer = mesh.uv_layers.active
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    for triangle in mesh.loop_triangles:
        world = [obj.matrix_world @ mesh.vertices[i].co for i in triangle.vertices]
        gp = [normalized(p) for p in world]
        base = len(runtime["position"]) // 3
        for loop_index, point in zip(triangle.loops, gp):
            normal = normal_matrix @ mesh.loops[loop_index].normal
            normal = Vector((normal.x, normal.z, normal.y)).normalized()
            runtime["position"].extend(point)
            runtime["normal"].extend(normal)
            uv = uv_layer.data[loop_index].uv if uv_layer else Vector((.5, .5))
            runtime["color"].extend(sample(uv))
            indices, weights = skin(point, obj.name)
            runtime["skinIndex"].extend(indices)
            runtime["skinWeight"].extend(weights)
        # Swapping FBX Y/Z changes handedness, so reverse each triangle to keep
        # the artist's exterior faces front-facing in Three.js.
        runtime["index"].extend((base, base + 2, base + 1))

data = json.loads(MANIFEST.read_text(encoding="utf8"))
source_blob = BINARY.read_bytes()
old = [entry for entry in data["meshes"] if entry["model"] == "shiba"]
if old:
    first_offset = min(
        entry[key]["offset"]
        for entry in old
        for key in ("position", "normal", "color", "skinIndex", "skinWeight", "index")
        if key in entry
    )
    source_blob = source_blob[:first_offset]
    data["meshes"] = [entry for entry in data["meshes"] if entry["model"] != "shiba"]
    data["pivots"].pop("shiba", None)
    data["materials"].pop("shibaFur", None)
blob = bytearray(source_blob)


def pack(values, kind):
    while len(blob) % 4:
        blob.append(0)
    offset = len(blob)
    blob.extend(struct.pack("<" + kind * len(values), *values))
    return {"offset": offset, "count": len(values)}


data["meshes"].append(
    {
        "model": "shiba",
        "node": "root",
        "variant": "base",
        "material": "shibaFur",
        "position": pack(runtime["position"], "f"),
        "normal": pack(runtime["normal"], "f"),
        "color": pack(runtime["color"], "f"),
        "skinIndex": pack(runtime["skinIndex"], "H"),
        "skinWeight": pack(runtime["skinWeight"], "f"),
        "index": pack(runtime["index"], "I"),
    }
)
data["pivots"]["shiba"] = PIVOTS
data["materials"]["shibaFur"] = {
    "color": [1, 1, 1],
    "roughness": .72,
    "metalness": 0,
    "tint": False,
}
MANIFEST.write_text(json.dumps(data, separators=(",", ":")), encoding="utf8")
BINARY.write_bytes(blob)
print(
    f"SHIBA COMPLETE: {len(runtime['index']) // 3} triangles, "
    f"soft regional rig, {len(blob)} runtime bytes"
)
